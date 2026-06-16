/**
 * Hunter Orchestrator - Thin coordinator for the 3-phase pipeline
 *
 * This is the main entry point for the Hunter system. It:
 * 1. Initializes all services (Serper, Gemini, Logo, Queue)
 * 2. Creates HunterContext to flow through phases
 * 3. Executes phases in sequence with early exit support
 * 4. Provides backward-compatible API
 *
 * @module hunter/orchestrator
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import {
  SerperService,
  GeminiService,
  LogoService,
  QueueService,
  SourcePolicyService,
  ModelInventoryService,
} from './services';
import { HunterLogger } from './services/logger';
import { executeResearchPhase, executeAnalysisPhase, executePersistencePhase } from './phases';
import { buildHuntTelemetryInsertPayload } from './telemetry-persistence';
import { scoutSourceCounts, passesSourcePreflight } from './preflight-sources';
import {
  markInsufficientSources,
  markResearchBudgetCapped,
  markPriceOnly,
  markBatchDeferred,
  markDuplicateReuse,
} from './hunt-transitions';
import type {
  HunterConfig,
  HunterInput,
  HunterResult,
  HuntTelemetry,
  HunterContext,
  HunterDependencies,
  ResearchOutput,
} from './types';
import { classifyErrorForDlq } from './errors';
import { preflightSubjectResolution } from './subject-preflight';

export class Hunter {
  private supabase: SupabaseClient<Database>;
  private serper: SerperService;
  private gemini: GeminiService;
  private logo: LogoService;
  private inventory: ModelInventoryService;
  private queue: QueueService;
  private config: HunterConfig;
  private logger: HunterLogger | null = null;
  private maxTokensPerHunt: number;
  private readonly resumeResearchMaxAgeMs = 60 * 24 * 60 * 60 * 1000; // 60 days
  private retryTelemetry: {
    retries: number;
    timeoutFailures: number;
    timeoutFallbackInvocations: number;
  } = {
    retries: 0,
    timeoutFailures: 0,
    timeoutFallbackInvocations: 0,
  };

  constructor(config: HunterConfig) {
    this.config = config;
    this.maxTokensPerHunt = config.maxTokensPerHunt ?? 150000;

    // Initialize Supabase
    this.supabase = createClient<Database>(config.supabaseUrl, config.supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Initialize services
    const sourcePolicyService = new SourcePolicyService(this.supabase);
    this.serper = new SerperService({
      apiKey: config.serperApiKey,
      policyProvider: {
        getPolicyGate: (url) => sourcePolicyService.getPolicyGate(url),
        recordUnknownDomain: (domain, sampleUrl, sampleTitle) =>
          sourcePolicyService.recordUnknownDomain(domain, sampleUrl, sampleTitle),
      },
    });
    this.gemini = new GeminiService({ apiKey: config.geminiApiKey });
    this.inventory = new ModelInventoryService({
      apiKeys: config.inventoryApiKeys,
    });
    this.logo = new LogoService({ supabase: this.supabase });
    this.queue = new QueueService({ supabase: this.supabase });
  }

  /**
   * Log a message (backwards compatible wrapper)
   */
  private log(message: string): void {
    if (this.logger) {
      this.logger.info(message);
    } else {
      console.log(`[Hunter] ${message}`);
    }
  }

  private contextMatches(candidate: string | null | undefined, target?: string): boolean {
    const normalizedCandidate = (candidate || '').trim().toLowerCase();
    const normalizedTarget = (target || '').trim().toLowerCase();
    if (!normalizedTarget) return normalizedCandidate.length === 0;
    return normalizedCandidate === normalizedTarget;
  }

  private resetRunTelemetry(): void {
    this.retryTelemetry = {
      retries: 0,
      timeoutFailures: 0,
      timeoutFallbackInvocations: 0,
    };
  }

  private parseUsdPerMillionToken(value: string | undefined, fallback: number): number {
    const parsed = value ? Number(value) : Number.NaN;
    if (!Number.isFinite(parsed) || parsed < 0) return fallback;
    return parsed;
  }

  private buildHuntTelemetry(totalTokens: number): HuntTelemetry | undefined {
    const summary = this.logger?.getSummary();
    if (!summary) return undefined;

    let researchTokens = 0;
    let analysisTokens = 0;
    for (const phase of summary.phaseTimings) {
      const tokens = Number(phase.metrics?.tokens_used || 0);
      if (!Number.isFinite(tokens) || tokens <= 0) continue;
      if (phase.phase === 'research') researchTokens += tokens;
      if (phase.phase === 'analysis') analysisTokens += tokens;
    }
    const otherTokens = Math.max(0, totalTokens - researchTokens - analysisTokens);

    const researchUsdPerM = this.parseUsdPerMillionToken(
      process.env.HUNTER_COST_PER_MILLION_TOKENS_RESEARCH,
      0.3
    );
    const analysisUsdPerM = this.parseUsdPerMillionToken(
      process.env.HUNTER_COST_PER_MILLION_TOKENS_ANALYSIS,
      0.6
    );
    const otherUsdPerM = this.parseUsdPerMillionToken(
      process.env.HUNTER_COST_PER_MILLION_TOKENS_OTHER,
      analysisUsdPerM
    );

    const estimatedUsd =
      (researchTokens / 1_000_000) * researchUsdPerM +
      (analysisTokens / 1_000_000) * analysisUsdPerM +
      (otherTokens / 1_000_000) * otherUsdPerM;

    return {
      tokens: {
        total: totalTokens,
        research: researchTokens,
        analysis: analysisTokens,
        other: otherTokens,
      },
      retries: {
        retries: this.retryTelemetry.retries,
        timeoutFailures: this.retryTelemetry.timeoutFailures,
        timeoutFallbackInvocations: this.retryTelemetry.timeoutFallbackInvocations,
      },
      cost: {
        estimatedUsd,
        usdPerMillionTokens: {
          research: researchUsdPerM,
          analysis: analysisUsdPerM,
          other: otherUsdPerM,
        },
      },
    };
  }

  private withTelemetry(result: HunterResult, fallbackTokens = 0): HunterResult {
    const totalTokens =
      typeof result.tokensUsed === 'number' && Number.isFinite(result.tokensUsed)
        ? result.tokensUsed
        : fallbackTokens;
    return {
      ...result,
      telemetry: this.buildHuntTelemetry(totalTokens),
    };
  }

  private async recordHuntTelemetry(params: {
    toolName: string;
    contextTitle?: string;
    queueItemId?: string;
    success: boolean;
    durationMs: number;
    telemetry?: HuntTelemetry;
    errorClass?: string;
  }): Promise<void> {
    const { error } = await this.supabase
      .from('hunt_telemetry')
      .insert(buildHuntTelemetryInsertPayload(params));
    if (error) {
      this.log(`[Telemetry] Failed to persist hunt telemetry: ${error.message}`);
    }
  }

  private finalizeHuntResult(
    input: Pick<HunterInput, 'toolName' | 'contextTitle' | 'queueItemId'>,
    result: HunterResult,
    fallbackTokens = 0
  ): HunterResult {
    const finalResult = this.withTelemetry(result, fallbackTokens);
    void this.recordHuntTelemetry({
      toolName: input.toolName,
      contextTitle: input.contextTitle,
      queueItemId: input.queueItemId,
      success: finalResult.success,
      durationMs: finalResult.durationMs ?? 0,
      telemetry: finalResult.telemetry,
      errorClass:
        finalResult.success || !finalResult.error
          ? undefined
          : classifyErrorForDlq(new Error(finalResult.error)),
    }).catch(() => {});
    return finalResult;
  }

  private async loadLatestResearchCheckpoint(
    toolName: string,
    contextTitle?: string,
    entityScope?: string
  ): Promise<ResearchOutput | null> {
    const { data, error } = await this.supabase
      .from('hunt_queue')
      .select('id, context_title, entity_scope, last_completed_phase, phase_checkpoint, updated_at')
      .eq('tool_name', toolName)
      .order('updated_at', { ascending: false })
      .limit(25);

    if (error) {
      this.log(`⚠️  Resume lookup failed for ${toolName}: ${error.message}`);
      return null;
    }

    const rows = (data || []) as Array<{
      id: string;
      context_title: string | null;
      entity_scope?: string | null;
      last_completed_phase: number | null;
      phase_checkpoint: Record<string, unknown> | null;
      updated_at: string | null;
    }>;

    const match = rows.find((row) => {
      if ((row.last_completed_phase || 0) < 1) return false;
      if (!this.contextMatches(row.context_title, contextTitle)) return false;
      const normalizedRowScope = (row.entity_scope || '').trim().toLowerCase();
      const normalizedTargetScope = (entityScope || '').trim().toLowerCase();
      if (normalizedRowScope !== normalizedTargetScope) return false;
      if (!row.phase_checkpoint || typeof row.phase_checkpoint !== 'object') return false;
      const checkpointResearch = (row.phase_checkpoint as any).research;
      if (!checkpointResearch?.scoutResult || !checkpointResearch?.knowledgeCard) return false;

      const extractionDate = checkpointResearch?.knowledgeCard?.meta?.extraction_date;
      const freshnessCandidate = extractionDate || row.updated_at;
      if (!freshnessCandidate) return false;
      const freshnessMs = Date.parse(freshnessCandidate);
      if (Number.isNaN(freshnessMs)) return false;
      const ageMs = Date.now() - freshnessMs;
      if (ageMs > this.resumeResearchMaxAgeMs) {
        this.log(
          `⚠️  Skipping stale checkpoint ${row.id}: research is older than 60 days (${Math.floor(ageMs / (1000 * 60 * 60 * 24))}d)`
        );
        return false;
      }
      return true;
    });

    if (!match) return null;
    const research = (match.phase_checkpoint as any).research as ResearchOutput;
    this.log(
      `🔄 Reusing prior research checkpoint from queue item ${match.id} (updated ${match.updated_at || 'unknown'})`
    );
    return research;
  }

  /**
   * Get all logs from the current hunt
   */
  getLogs(): string[] {
    if (this.logger) {
      return this.logger.getLogs().map((entry) => `[${entry.timestamp}] ${entry.message}`);
    }
    return [];
  }

  /**
   * Get logger instance (for structured logs)
   */
  getLogger(): HunterLogger | null {
    return this.logger;
  }

  /**
   * Retry wrapper with exponential backoff
   */
  private async withRetry<T>(fn: () => Promise<T>, operation: string, maxRetries = 3): Promise<T> {
    const parseTimeoutOverride = (value: string | undefined): number | null => {
      if (!value) return null;
      const parsed = Number(value);
      if (!Number.isFinite(parsed) || parsed <= 0) return null;
      return Math.floor(parsed);
    };
    const resolveAttemptTimeoutMs = (operationName: string): number => {
      const explicitOverride = parseTimeoutOverride(process.env.HUNTER_OPERATION_TIMEOUT_MS);
      if (explicitOverride) return explicitOverride;

      const op = operationName.toLowerCase();
      if (op.includes('gemini synthesis evidence stage')) {
        return parseTimeoutOverride(process.env.HUNTER_GEMINI_EVIDENCE_TIMEOUT_MS) ?? 300000;
      }
      if (op.includes('gemini synthesis')) {
        return parseTimeoutOverride(process.env.HUNTER_GEMINI_SYNTHESIS_TIMEOUT_MS) ?? 300000;
      }
      if (op.includes('gemini fact extraction')) {
        return parseTimeoutOverride(process.env.HUNTER_GEMINI_EXTRACTION_TIMEOUT_MS) ?? 180000;
      }
      return 120000;
    };
    const attemptTimeoutMs = resolveAttemptTimeoutMs(operation);
    if (operation.toLowerCase().includes('timeout fallback')) {
      this.retryTelemetry.timeoutFallbackInvocations += 1;
    }
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await Promise.race([
          fn(),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error(`${operation} timed out after ${attemptTimeoutMs}ms`)),
              attemptTimeoutMs
            )
          ),
        ]);
      } catch (error) {
        lastError = error as Error;
        this.retryTelemetry.retries += 1;
        if (/\btimed out\b|\btimeout\b/i.test(lastError.message)) {
          this.retryTelemetry.timeoutFailures += 1;
        }
        this.log(`${operation} failed (attempt ${attempt}/${maxRetries}): ${lastError.message}`);

        if (attempt < maxRetries) {
          const delay = 1000 * Math.pow(2, attempt - 1);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  /**
   * Main hunt method - orchestrates the 3-phase pipeline
   *
   * Phase 1 (Research): Scout + Extract Facts
   * Phase 2 (Analysis): Synthesize + Embed + Logo
   * Phase 3 (Persistence): Dedup + Save + Graph
   *
   * Supports early exits via HunterContext flags for cost optimization.
   */
  async hunt(input: HunterInput): Promise<HunterResult> {
    const startTime = Date.now();
    this.logger = new HunterLogger();
    this.resetRunTelemetry();
    const maxTokens = this.maxTokensPerHunt;
    const softTokenThreshold = Math.floor(maxTokens * 0.85);

    this.log(`Starting hunt for: ${input.toolName}`);
    if (input.contextTitle) this.log(`Context: ${input.contextTitle}`);
    if (this.config.isDraftMode) this.log(`Mode: DRAFT (requires review)`);

    const subjectPreflight = preflightSubjectResolution({
      toolName: input.toolName,
      entityScope: input.entityScope || null,
      mode: input.queueItemId ? 'queue_add' : 'direct_hunt',
    });
    if (!subjectPreflight.ok) {
      const recommendation =
        subjectPreflight.recommendedScopes.length > 0
          ? ` Recommended scopes: ${subjectPreflight.recommendedScopes.join(', ')}.`
          : '';
      const errorMessage = `${subjectPreflight.message || 'Subject preflight failed.'}${recommendation}`;
      this.log(`❌ ${errorMessage}`);
      return this.finalizeHuntResult(
        input,
        {
          success: false,
          error: errorMessage,
          tokensUsed: 0,
          durationMs: Date.now() - startTime,
        },
        0
      );
    }
    const resolvedEntityScope = subjectPreflight.resolvedScope || undefined;

    // Create HunterContext that flows through all phases
    const ctx: HunterContext = {
      toolName: input.toolName,
      entityScope: resolvedEntityScope,
      contextTitle: input.contextTitle,
      categorySlug: input.categorySlug,
      queueItemId: input.queueItemId,
      specialInstructions: input.specialInstructions,
      forceUpdate: input.forceUpdate,
      huntType: input.huntType || 'full',
      skipAnalysis: false,
      skipPersistence: false,
      skipSynthesis: input.skipSynthesis || false, // Two-stage pipeline: stop after research
      startTime,
      tokensUsed: 0,
      logs: [],
    };

    if (ctx.skipSynthesis) {
      this.log(`[Two-Stage] Batch mode: Will stop after research phase`);
    }

    // Create dependencies for injection into phases
    const deps: HunterDependencies = {
      supabase: this.supabase,
      serper: this.serper,
      gemini: this.gemini,
      inventory: this.inventory,
      logo: this.logo,
      config: this.config,
      withRetry: this.withRetry.bind(this),
      log: this.log.bind(this),
    };

    // Track checkpoint version for optimistic locking
    let checkpointVersion: number | undefined;
    let resumedResearchFromCheckpoint = false;

    try {
      // ===================================================================
      // CHECKPOINT RECOVERY: Resume from last completed phase if available
      // ===================================================================
      if (ctx.queueItemId) {
        const checkpoint = await this.queue.getCheckpoint(ctx.queueItemId);
        if (checkpoint) {
          checkpointVersion = checkpoint.version; // Track for version validation
          this.log(`🔄 Resuming from checkpoint (version ${checkpointVersion})`);
          if (checkpoint.research) {
            this.log(`   Phase 1 (Research) already completed - reusing data`);
            ctx.research = checkpoint.research;
            ctx.tokensUsed += checkpoint.research.tokensUsed;
            ctx.skipAnalysis = checkpoint.research.isDuplicate && !ctx.forceUpdate;
          }
          if (checkpoint.analysis) {
            this.log(`   Phase 2 (Analysis) already completed - reusing data`);
            ctx.analysis = checkpoint.analysis;
            ctx.tokensUsed += checkpoint.analysis.tokensUsed;
          }
        }
      }

      // ===================================================================
      // PHASE 1: RESEARCH (Scout + Extract Knowledge Card)
      // ===================================================================
      if (!ctx.research && ctx.forceUpdate) {
        const resumedResearch = await this.loadLatestResearchCheckpoint(
          input.toolName,
          input.contextTitle,
          resolvedEntityScope
        );
        if (resumedResearch) {
          ctx.research = resumedResearch;
          ctx.tokensUsed += resumedResearch.tokensUsed || 0;
          resumedResearchFromCheckpoint = true;
          this.log(`↪️  Resumed at post-research checkpoint (force update path)`);
        }
      }

      if (!ctx.research) {
        this.logger?.startPhase('research');
        ctx.research = await executeResearchPhase(ctx, deps);
        ctx.tokensUsed += ctx.research.tokensUsed;
        if (ctx.tokensUsed > maxTokens) {
          this.log(
            `🛑 Token budget exceeded after research (${ctx.tokensUsed}/${maxTokens}). Saving research only.`
          );
          markResearchBudgetCapped(ctx);
        }
        this.logger?.endPhase({
          tokens_used: ctx.research.tokensUsed,
          sources_found: ctx.research.scoutResult.raw_sources.length,
        });

        // Save checkpoint after Phase 1 with version check
        if (ctx.queueItemId) {
          const saved = await this.queue.saveCheckpoint(
            ctx.queueItemId,
            1,
            { research: ctx.research },
            checkpointVersion, // Expected version for conflict detection
            this.log.bind(this)
          );

          if (!saved) {
            this.log(`⚠️  Checkpoint conflict - another worker may have processed this item`);
            // Abort to prevent duplicate work
            return this.finalizeHuntResult(
              input,
              {
                success: false,
                error:
                  'Checkpoint version conflict - item may have been processed by another worker',
                tokensUsed: ctx.tokensUsed,
                durationMs: Date.now() - ctx.startTime,
              },
              ctx.tokensUsed
            );
          }

          checkpointVersion = (checkpointVersion ?? 0) + 1; // Update local version
        }
      }

      // Early exit: Defunct tool detected
      if (ctx.research.defunctStatus?.isDefunct) {
        const status = ctx.research.defunctStatus;
        this.log(`⚠️ Defunct tool detected - skipping analysis/persistence`);
        if (status.shutdownDate) this.log(`   Shutdown: ${status.shutdownDate}`);
        if (status.reason) this.log(`   Reason: ${status.reason}`);

        return this.finalizeHuntResult(
          input,
          {
            success: true,
            defunctStatus: status,
            tokensUsed: ctx.tokensUsed,
            durationMs: Date.now() - ctx.startTime,
          },
          ctx.tokensUsed
        );
      }

      // Early exit: Hard duplicate detected (unless forceUpdate)
      if (ctx.research.isDuplicate && !ctx.forceUpdate) {
        if (ctx.queueItemId) {
          markDuplicateReuse(ctx);
          this.log(`⚠️ Duplicate detected, skipping expensive analysis`);
          return this.finalizeHuntResult(
            input,
            {
              success: true,
              toolId: ctx.research.existingToolId,
              tokensUsed: ctx.tokensUsed,
              durationMs: Date.now() - ctx.startTime,
            },
            ctx.tokensUsed
          );
        }
        // Manual/direct hunts should refresh the existing item instead of no-op.
        ctx.forceUpdate = true;
        this.log(`🔄 Duplicate detected in direct hunt, continuing with force-update refresh`);
      }
      if (ctx.research.isDuplicate && ctx.forceUpdate) {
        this.log(`🔄 Duplicate detected, but forceUpdate=true - continuing with re-extraction`);
      }

      // Pre-flight check: Validate sufficient source material before analysis
      // Saves research for dedup, but skips analysis if insufficient data
      if (!ctx.skipAnalysis && ctx.research && ctx.huntType !== 'price_only') {
        const hasContext = Boolean(ctx.contextTitle);
        const counts = scoutSourceCounts(ctx.research.scoutResult.raw_sources);
        const preflight = passesSourcePreflight(counts, { hasContext });

        if (!preflight.passed) {
          if (resumedResearchFromCheckpoint) {
            this.log(
              `↻ Resumed checkpoint failed pre-flight (${counts.eligible} eligible, ${counts.official} official). Re-running fresh research once.`
            );
            this.logger?.startPhase('research');
            const freshResearch = await executeResearchPhase(ctx, deps);
            ctx.research = freshResearch;
            ctx.tokensUsed += freshResearch.tokensUsed;
            this.logger?.endPhase({
              tokens_used: freshResearch.tokensUsed,
              sources_found: freshResearch.scoutResult.raw_sources.length,
            });
            resumedResearchFromCheckpoint = false;

            // Re-evaluate pre-flight with fresh research output
            const freshCounts = scoutSourceCounts(freshResearch.scoutResult.raw_sources);
            const freshPreflight = passesSourcePreflight(freshCounts, { hasContext });
            if (freshPreflight.passed) {
              this.log(
                `✅ Pre-flight passed after fresh research: ${freshCounts.eligible} eligible sources (${freshCounts.review} reviews, ${freshCounts.tribal} tribal, ${freshCounts.pricing} pricing, ${freshCounts.official} official)`
              );
            } else {
              this.log(`⚠️  Fresh research still insufficient for pre-flight.`);
              this.log(
                `   Found: ${freshCounts.eligible} eligible sources (${freshCounts.review} reviews, ${freshCounts.tribal} tribal, ${freshCounts.pricing} pricing, ${freshCounts.official} official)`
              );
              this.log(`   Required: ${freshPreflight.minEligible}+ eligible, 1+ official`);
              this.log(`   Saving research data but skipping analysis to save API credits`);
              this.log(`   Re-run later to check if more sources available`);
              markInsufficientSources(ctx);
            }
            // Continue to next phase decision without applying the old insufficient result
          } else if (!ctx.skipAnalysis) {
            const huntType = ctx.contextTitle ? 'contextual' : 'discovery';
            this.log(`⚠️  Pre-flight: Insufficient source material for ${huntType} hunt`);
            this.log(
              `   Found: ${counts.eligible} eligible sources (${counts.review} reviews, ${counts.tribal} tribal, ${counts.pricing} pricing, ${counts.official} official)`
            );
            this.log(
              `   Required: ${preflight.minEligible}+ eligible, ${preflight.minOfficial}+ official`
            );
            this.log(`   Saving research data but skipping analysis to save API credits`);
            this.log(`   Re-run later to check if more sources available`);

            // Skip analysis and persist via the research-only path.
            markInsufficientSources(ctx);
          }
        } else {
          this.log(
            `✅ Pre-flight passed: ${counts.eligible} eligible sources (${counts.review} reviews, ${counts.tribal} tribal, ${counts.pricing} pricing, ${counts.official} official)`
          );
        }
      }

      // ===================================================================
      // PHASE 2: ANALYSIS (Synthesize + Embed + Logo)
      // ===================================================================
      if (ctx.huntType === 'price_only') {
        markPriceOnly(ctx);
        this.log(`🧾 price_only hunt: skipping analysis phase`);
      }

      if (!ctx.skipAnalysis && ctx.tokensUsed >= softTokenThreshold) {
        markResearchBudgetCapped(ctx);
        this.log(`[Budget] Near token cap (${ctx.tokensUsed}/${maxTokens}). Saving research only.`);
      }

      // Two-stage pipeline: Skip analysis if in batch mode
      if (ctx.skipSynthesis) {
        markBatchDeferred(ctx);
        this.log(`[Two-Stage] Skipping analysis phase (will be done in batch)`);

        // Go directly to persistence to save research data
        this.logger?.startPhase('persistence');
        const persistence = await executePersistencePhase(ctx, deps);
        this.logger?.endPhase({
          tool_created: persistence.wasReused ? 0 : 1,
          review_created: persistence.reviewId ? 1 : 0,
        });

        if (ctx.insufficientSources && persistence.reviewId) {
          this.log(
            `✅ Evidence-limited refresh complete: ${input.toolName} (minimal discovery review updated)`
          );
        } else {
          this.log(`✅ Research complete: ${input.toolName} (awaiting batch synthesis)`);
        }
        this.log(`Tool: ${persistence.toolId}, Category: ${ctx.detectedCategory || 'none'}`);
        if (persistence.reviewId) {
          this.log(`Review: ${persistence.reviewId}`);
        }
        this.log(`Tokens: ${ctx.tokensUsed}, Duration: ${Date.now() - ctx.startTime}ms`);

        // Don't clear checkpoint - item is in research_complete status
        return this.finalizeHuntResult(
          input,
          {
            success: true,
            toolId: persistence.toolId,
            queueStatus: 'research_complete',
            tokensUsed: ctx.tokensUsed,
            durationMs: Date.now() - ctx.startTime,
          },
          ctx.tokensUsed
        );
      }

      if (!ctx.skipAnalysis && !ctx.analysis) {
        this.logger?.startPhase('analysis');
        ctx.analysis = await executeAnalysisPhase(ctx, deps);
        ctx.tokensUsed += ctx.analysis.tokensUsed;
        if (ctx.tokensUsed > maxTokens) {
          this.log(
            `🛑 Token budget exceeded after analysis (${ctx.tokensUsed}/${maxTokens}). Continuing to persistence (no additional tokens).`
          );
        }
        this.logger?.endPhase({
          tokens_used: ctx.analysis.tokensUsed,
          score: ctx.analysis.analysis.score,
          pros_count: ctx.analysis.analysis.pros.length,
          cons_count: ctx.analysis.analysis.cons.length,
        });

        // Save checkpoint after Phase 2 with version check
        if (ctx.queueItemId) {
          const saved = await this.queue.saveCheckpoint(
            ctx.queueItemId,
            2,
            { research: ctx.research, analysis: ctx.analysis },
            checkpointVersion, // Expected version for conflict detection
            this.log.bind(this)
          );

          if (!saved) {
            this.log(`⚠️  Checkpoint conflict - another worker may have processed this item`);
            return this.finalizeHuntResult(
              input,
              {
                success: false,
                error:
                  'Checkpoint version conflict - item may have been processed by another worker',
                tokensUsed: ctx.tokensUsed,
                durationMs: Date.now() - ctx.startTime,
              },
              ctx.tokensUsed
            );
          }

          checkpointVersion = (checkpointVersion ?? 0) + 1; // Update local version
        }
      }

      // ===================================================================
      // PHASE 3: PERSISTENCE (Dedup + Save + Graph)
      // ===================================================================
      if (!ctx.skipPersistence) {
        this.logger?.startPhase('persistence');
        const persistence = await executePersistencePhase(ctx, deps);
        this.logger?.endPhase({
          tool_created: persistence.wasReused ? 0 : 1,
          review_created: persistence.reviewId ? 1 : 0,
        });

        this.log(`✅ Hunt complete: ${input.toolName}`);
        this.log(
          `Tool: ${persistence.toolId}, Context: ${persistence.contextId || 'none'}, Review: ${persistence.reviewId || 'none'}`
        );
        this.log(`Tokens: ${ctx.tokensUsed}, Duration: ${Date.now() - ctx.startTime}ms`);

        // Clear checkpoint on successful completion
        if (ctx.queueItemId) {
          await this.queue.clearCheckpoint(ctx.queueItemId, this.log.bind(this));
        }

        return this.finalizeHuntResult(
          input,
          {
            success: true,
            toolId: persistence.toolId,
            contextId: persistence.contextId || undefined,
            reviewId: persistence.reviewId || undefined,
            tokensUsed: ctx.tokensUsed,
            durationMs: Date.now() - ctx.startTime,
          },
          ctx.tokensUsed
        );
      }

      // If persistence was skipped, return partial result
      return this.finalizeHuntResult(
        input,
        {
          success: true,
          tokensUsed: ctx.tokensUsed,
          durationMs: Date.now() - ctx.startTime,
          error: 'Persistence skipped due to validation failure',
        },
        ctx.tokensUsed
      );
    } catch (error) {
      const err = error as Error;
      this.log(`❌ Hunt failed: ${err.message}`);
      return this.finalizeHuntResult(
        input,
        {
          success: false,
          error: err.message,
          tokensUsed: ctx.tokensUsed,
          durationMs: Date.now() - ctx.startTime,
        },
        ctx.tokensUsed
      );
    } finally {
      const summary = this.logger?.getSummary();
      if (summary) {
        this.logger?.info('Hunt summary', summary);
      }
    }
  }

  /**
   * Process the next item from the hunt queue
   *
   * Uses atomic claiming with heartbeat for worker liveness detection.
   * Delegates to hunt() for the actual work.
   */
  async processNextFromQueue(): Promise<HunterResult & { queueItemId?: string }> {
    this.log(`[Queue] Claiming next item (worker: ${this.queue.getWorkerId()})...`);

    // Atomically claim next item
    const { success, queueItem, error } = await this.queue.claimNext(this.log.bind(this));

    if (!success || !queueItem) {
      this.log('[Queue] No items available');
      return { success: false, error: error || 'No items in queue' };
    }

    this.log(`[Queue] Claimed: ${queueItem.tool_name} (id: ${queueItem.id})`);

    // Start heartbeat monitoring
    this.queue.startHeartbeat(queueItem.id, this.log.bind(this));

    // Mark as processing
    await this.queue.markStarted(queueItem.id, this.log.bind(this));

    try {
      // Execute hunt (with Research Dossier if available)
      const result = await this.hunt({
        toolName: queueItem.tool_name,
        entityScope: (queueItem.entity_scope || undefined) as any,
        contextTitle: queueItem.context_title || undefined,
        categorySlug: queueItem.category_slug || undefined,
        specialInstructions:
          typeof queueItem.error_details?.admin_instructions === 'string'
            ? queueItem.error_details.admin_instructions
            : undefined,
        queueItemId: queueItem.id,
        huntType: (queueItem.hunt_type as any) || 'full',
        forceUpdate:
          Boolean(queueItem.force_regenerate) ||
          queueItem.hunt_type === 'price_only' ||
          queueItem.hunt_type === 'refresh', // Refresh/price-only must bypass duplicate short-circuit
        researchDossier: queueItem.research_dossier || undefined, // V5: Pass dossier from Classifier
      });

      // Stop heartbeat
      this.queue.stopHeartbeat();

      // Update queue item status
      if (result.success) {
        if (result.defunctStatus?.isDefunct) {
          await this.queue.markDefunct(
            queueItem.id,
            result.defunctStatus,
            result.tokensUsed,
            this.log.bind(this)
          );
          await this.queue.clearCheckpoint(queueItem.id, this.log.bind(this));
        } else if (result.queueStatus === 'research_complete') {
          // Research-only flow already persists queue status and checkpoint semantics.
          this.log(`[Queue] Research-only flow complete, leaving status as research_complete`);
        } else {
          await this.queue.markCompleted(
            queueItem.id,
            {
              toolId: result.toolId,
              contextId: result.contextId,
              reviewId: result.reviewId,
              tokensUsed: result.tokensUsed,
            },
            this.log.bind(this)
          );
        }

        // Cross-pollinate discovery hunts to other relevant contexts
        if (queueItem.is_discovery_hunt && result.toolId && result.contextId) {
          this.log(
            `[Queue] Discovery hunt completed, checking for cross-pollination opportunities...`
          );

          try {
            const { assignToRelevantContexts } = await import('./validation/context-validator.js');
            const crossPollinationResult = await assignToRelevantContexts(
              result.toolId,
              result.contextId,
              this.supabase
            );

            if (crossPollinationResult.reviews_created > 0) {
              this.log(
                `[Queue] ✅ Cross-pollinated to ${crossPollinationResult.reviews_created} additional contexts`
              );
            } else {
              this.log(`[Queue] No additional contexts matched (threshold: 70%)`);
            }
          } catch (error) {
            // Don't fail the hunt if cross-pollination fails
            const err = error as Error;
            this.log(`[Queue] ⚠️ Cross-pollination failed: ${err.message}`);
          }
        }
      } else {
        const dlqReason = classifyErrorForDlq(new Error(result.error || 'Unknown error'));
        await this.queue.markFailed(
          queueItem.id,
          result.error || 'Unknown error',
          undefined,
          dlqReason,
          this.log.bind(this)
        );
      }

      return {
        ...result,
        queueItemId: queueItem.id,
        toolName: queueItem.tool_name,
        contextTitle: queueItem.context_title || undefined,
      };
    } catch (error) {
      // Stop heartbeat on error
      this.queue.stopHeartbeat();

      const err = error as Error;
      const dlqReason = classifyErrorForDlq(err);
      await this.queue.markFailed(
        queueItem.id,
        err.message,
        { stack: err.stack },
        dlqReason,
        this.log.bind(this)
      );

      return {
        success: false,
        error: err.message,
        queueItemId: queueItem.id,
        toolName: queueItem.tool_name,
        contextTitle: queueItem.context_title || undefined,
      };
    }
  }

  /**
   * Process multiple items from the queue
   */
  async processQueueBatch(
    maxItems: number = 5,
    options: { maxTokens?: number } = {}
  ): Promise<{
    processed: number;
    succeeded: number;
    failed: number;
    results: HunterResult[];
    tokensUsed: number;
  }> {
    const results: HunterResult[] = [];
    let processed = 0;
    let succeeded = 0;
    let failed = 0;
    let tokensUsed = 0;
    const maxTokensPerBatch = options.maxTokens;

    for (let i = 0; i < maxItems; i++) {
      const result = await this.processNextFromQueue();

      if (result.error === 'No items in queue') {
        this.log('[Queue] Queue exhausted');
        break;
      }

      results.push(result);
      processed++;
      tokensUsed += result.tokensUsed || 0;

      if (result.success) succeeded++;
      else failed++;

      if (maxTokensPerBatch && tokensUsed >= maxTokensPerBatch) {
        this.log(
          `[Queue] Token budget reached for batch (${tokensUsed}/${maxTokensPerBatch}). Stopping early.`
        );
        break;
      }
    }

    this.log(
      `[Queue] Batch complete: ${processed} processed, ${succeeded} succeeded, ${failed} failed, ${tokensUsed} tokens`
    );

    return { processed, succeeded, failed, results, tokensUsed };
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.queue.cleanup();
  }
}

/**
 * Factory function to create a Hunter instance
 */
export function createHunter(options: { isDraftMode?: boolean } = {}): Hunter {
  // Helper to get env var from either Astro (import.meta.env) or Node (process.env)
  function getEnv(key: string): string | undefined {
    // Try import.meta.env first (Astro runtime)
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      return (import.meta.env as Record<string, string>)[key];
    }
    // Fallback to process.env (Node.js / CLI)
    if (typeof process !== 'undefined' && process.env) {
      return process.env[key];
    }
    return undefined;
  }

  const config: HunterConfig = {
    supabaseUrl: getEnv('SUPABASE_URL')!,
    supabaseServiceKey: getEnv('SUPABASE_SERVICE_ROLE_KEY')!,
    geminiApiKey: getEnv('GEMINI_API_KEY')!,
    serperApiKey: getEnv('SERPER_API_KEY')!,
    inventoryApiKeys: {
      openai: getEnv('OPENAI_API_KEY'),
      anthropic: getEnv('ANTHROPIC_API_KEY'),
    },
    isDraftMode: options.isDraftMode ?? true, // Default to draft mode for safety
    maxTokensPerHunt: (() => {
      const raw = getEnv('HUNTER_MAX_TOKENS_PER_HUNT');
      const parsed = raw ? Number(raw) : NaN;
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 150000;
    })(),
  };

  // Validate
  const missing: string[] = [];
  if (!config.supabaseUrl) missing.push('SUPABASE_URL');
  if (!config.supabaseServiceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!config.geminiApiKey) missing.push('GEMINI_API_KEY');
  if (!config.serperApiKey) missing.push('SERPER_API_KEY');

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return new Hunter(config);
}
