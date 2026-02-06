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
import { SerperService, GeminiService, LogoService, QueueService } from './services';
import { HunterLogger } from './services/logger';
import { executeResearchPhase, executeAnalysisPhase, executePersistencePhase } from './phases';
import type {
  HunterConfig,
  HunterInput,
  HunterResult,
  HunterContext,
  HunterDependencies,
} from './types';
import { classifyErrorForDlq } from './errors';

export class Hunter {
  private supabase: SupabaseClient<Database>;
  private serper: SerperService;
  private gemini: GeminiService;
  private logo: LogoService;
  private queue: QueueService;
  private config: HunterConfig;
  private logger: HunterLogger | null = null;
  private maxTokensPerHunt: number;

  constructor(config: HunterConfig) {
    this.config = config;
    this.maxTokensPerHunt = config.maxTokensPerHunt ?? 150000;

    // Initialize Supabase
    this.supabase = createClient<Database>(config.supabaseUrl, config.supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Initialize services
    this.serper = new SerperService({ apiKey: config.serperApiKey });
    this.gemini = new GeminiService({ apiKey: config.geminiApiKey });
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
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
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
    const maxTokens = this.maxTokensPerHunt;
    const softTokenThreshold = Math.floor(maxTokens * 0.85);

    this.log(`Starting hunt for: ${input.toolName}`);
    if (input.contextTitle) this.log(`Context: ${input.contextTitle}`);
    if (this.config.isDraftMode) this.log(`Mode: DRAFT (requires review)`);

    // Create HunterContext that flows through all phases
    const ctx: HunterContext = {
      toolName: input.toolName,
      contextTitle: input.contextTitle,
      categorySlug: input.categorySlug,
      queueItemId: input.queueItemId,
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
      logo: this.logo,
      config: this.config,
      withRetry: this.withRetry.bind(this),
      log: this.log.bind(this),
    };

    // Track checkpoint version for optimistic locking
    let checkpointVersion: number | undefined;

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
      if (!ctx.research) {
        this.logger?.startPhase('research');
        ctx.research = await executeResearchPhase(ctx, deps);
        ctx.tokensUsed += ctx.research.tokensUsed;
        if (ctx.tokensUsed > maxTokens) {
          this.log(
            `🛑 Token budget exceeded after research (${ctx.tokensUsed}/${maxTokens}). Saving research only.`
          );
          ctx.skipSynthesis = true;
        }
        this.logger?.endPhase({
          tokens_used: ctx.research.tokensUsed,
          sources_found: ctx.research.scoutResult.sources.length,
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
            return {
              success: false,
              error: 'Checkpoint version conflict - item may have been processed by another worker',
              tokensUsed: ctx.tokensUsed,
              durationMs: Date.now() - ctx.startTime,
            };
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

        return {
          success: true,
          defunctStatus: status,
          tokensUsed: ctx.tokensUsed,
          durationMs: Date.now() - ctx.startTime,
        };
      }

      // Early exit: Hard duplicate detected (unless forceUpdate)
      if (ctx.research.isDuplicate && !ctx.forceUpdate) {
        ctx.skipAnalysis = true;
        this.log(`⚠️ Duplicate detected, skipping expensive analysis`);
        return {
          success: true,
          toolId: ctx.research.existingToolId,
          tokensUsed: ctx.tokensUsed,
          durationMs: Date.now() - ctx.startTime,
        };
      }
      if (ctx.research.isDuplicate && ctx.forceUpdate) {
        this.log(`🔄 Duplicate detected, but forceUpdate=true - continuing with re-extraction`);
      }

      // Pre-flight check: Validate sufficient source material before analysis
      // Saves research for dedup, but skips analysis if insufficient data
      if (!ctx.skipAnalysis && ctx.research && ctx.huntType !== 'price_only') {
        const scout = ctx.research.scoutResult;
        const reviewCount = scout.reviewsSnippets.length;
        const tribalCount = scout.tribalKnowledgeSnippets.length;
        const pricingCount = scout.pricingSnippets.length;
        const totalSnippets = reviewCount + tribalCount + pricingCount;

        // Thresholds for quality review generation:
        // - Discovery hunts: Need at least 5 total snippets with 3+ from reviews/tribal
        // - Contextual hunts: Need at least 4 total snippets with 2+ from reviews/tribal
        const minTotalSnippets = ctx.contextTitle ? 4 : 5;
        const minReviewTribal = ctx.contextTitle ? 2 : 3;
        const actualReviewTribal = reviewCount + tribalCount;

        if (totalSnippets < minTotalSnippets || actualReviewTribal < minReviewTribal) {
          const huntType = ctx.contextTitle ? 'contextual' : 'discovery';
          this.log(`⚠️  Pre-flight: Insufficient source material for ${huntType} hunt`);
          this.log(
            `   Found: ${totalSnippets} total snippets (${reviewCount} reviews, ${tribalCount} tribal, ${pricingCount} pricing)`
          );
          this.log(
            `   Required: ${minTotalSnippets}+ total with ${minReviewTribal}+ reviews/tribal`
          );
          this.log(`   Saving research data but skipping analysis to save API credits`);
          this.log(`   Re-run later to check if more sources available`);

          // Skip analysis but continue to persistence to save Knowledge Card
          ctx.skipAnalysis = true;
          ctx.insufficientSources = true; // Flag for persistence phase
        } else {
          this.log(
            `✅ Pre-flight passed: ${totalSnippets} snippets (${reviewCount} reviews, ${tribalCount} tribal, ${pricingCount} pricing)`
          );
        }
      }

      // ===================================================================
      // PHASE 2: ANALYSIS (Synthesize + Embed + Logo)
      // ===================================================================
      if (ctx.huntType === 'price_only') {
        ctx.skipAnalysis = true;
        this.log(`🧾 price_only hunt: skipping analysis phase`);
      }

      if (!ctx.skipAnalysis && ctx.tokensUsed >= softTokenThreshold) {
        ctx.skipSynthesis = true;
        this.log(`[Budget] Near token cap (${ctx.tokensUsed}/${maxTokens}). Saving research only.`);
      }

      // Two-stage pipeline: Skip analysis if in batch mode
      if (ctx.skipSynthesis) {
        ctx.skipAnalysis = true;
        this.log(`[Two-Stage] Skipping analysis phase (will be done in batch)`);

        // Go directly to persistence to save research data
        this.logger?.startPhase('persistence');
        const persistence = await executePersistencePhase(ctx, deps);
        this.logger?.endPhase({
          tool_created: persistence.wasReused ? 0 : 1,
          review_created: 0,
        });

        this.log(`✅ Research complete: ${input.toolName} (awaiting batch synthesis)`);
        this.log(`Tool: ${persistence.toolId}, Category: ${ctx.detectedCategory || 'none'}`);
        this.log(`Tokens: ${ctx.tokensUsed}, Duration: ${Date.now() - ctx.startTime}ms`);

        // Don't clear checkpoint - item is in research_complete status
        return {
          success: true,
          toolId: persistence.toolId,
          tokensUsed: ctx.tokensUsed,
          durationMs: Date.now() - ctx.startTime,
        };
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
            return {
              success: false,
              error: 'Checkpoint version conflict - item may have been processed by another worker',
              tokensUsed: ctx.tokensUsed,
              durationMs: Date.now() - ctx.startTime,
            };
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

        return {
          success: true,
          toolId: persistence.toolId,
          contextId: persistence.contextId || undefined,
          reviewId: persistence.reviewId || undefined,
          tokensUsed: ctx.tokensUsed,
          durationMs: Date.now() - ctx.startTime,
        };
      }

      // If persistence was skipped, return partial result
      return {
        success: true,
        tokensUsed: ctx.tokensUsed,
        durationMs: Date.now() - ctx.startTime,
        error: 'Persistence skipped due to validation failure',
      };
    } catch (error) {
      const err = error as Error;
      this.log(`❌ Hunt failed: ${err.message}`);
      return {
        success: false,
        error: err.message,
        tokensUsed: ctx.tokensUsed,
        durationMs: Date.now() - ctx.startTime,
      };
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
        contextTitle: queueItem.context_title || undefined,
        categorySlug: queueItem.category_slug || undefined,
        queueItemId: queueItem.id,
        huntType: (queueItem.hunt_type as any) || 'full',
        forceUpdate: queueItem.force_regenerate, // Pass force_regenerate flag to override duplicate detection
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
