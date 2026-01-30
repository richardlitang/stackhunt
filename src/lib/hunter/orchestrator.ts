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
} from './services';
import {
  executeResearchPhase,
  executeAnalysisPhase,
  executePersistencePhase,
} from './phases';
import type {
  HunterConfig,
  HunterInput,
  HunterResult,
  HunterContext,
  HunterDependencies,
} from './types';

export class Hunter {
  private supabase: SupabaseClient<Database>;
  private serper: SerperService;
  private gemini: GeminiService;
  private logo: LogoService;
  private queue: QueueService;
  private config: HunterConfig;
  private logs: string[] = [];

  constructor(config: HunterConfig) {
    this.config = config;

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
   * Log a message with timestamp
   */
  private log(message: string): void {
    const timestamp = new Date().toISOString();
    this.logs.push(`[${timestamp}] ${message}`);
    console.log(`[Hunter] ${message}`);
  }

  /**
   * Get all logs from the current hunt
   */
  getLogs(): string[] {
    return this.logs;
  }

  /**
   * Retry wrapper with exponential backoff
   */
  private async withRetry<T>(
    fn: () => Promise<T>,
    operation: string,
    maxRetries = 3
  ): Promise<T> {
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
    this.logs = [];

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
      skipAnalysis: false,
      skipPersistence: false,
      startTime,
      tokensUsed: 0,
      logs: this.logs,
    };

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

    try {
      // ===================================================================
      // PHASE 1: RESEARCH (Scout + Extract Knowledge Card)
      // ===================================================================
      ctx.research = await executeResearchPhase(ctx, deps);
      ctx.tokensUsed += ctx.research.tokensUsed;

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

      // ===================================================================
      // PHASE 2: ANALYSIS (Synthesize + Embed + Logo)
      // ===================================================================
      if (!ctx.skipAnalysis) {
        ctx.analysis = await executeAnalysisPhase(ctx, deps);
        ctx.tokensUsed += ctx.analysis.tokensUsed;
      }

      // ===================================================================
      // PHASE 3: PERSISTENCE (Dedup + Save + Graph)
      // ===================================================================
      if (!ctx.skipPersistence) {
        const persistence = await executePersistencePhase(ctx, deps);

        this.log(`✅ Hunt complete: ${input.toolName}`);
        this.log(`Tool: ${persistence.toolId}, Context: ${persistence.contextId || 'none'}, Review: ${persistence.reviewId || 'none'}`);
        this.log(`Tokens: ${ctx.tokensUsed}, Duration: ${Date.now() - ctx.startTime}ms`);

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
      // Execute hunt
      const result = await this.hunt({
        toolName: queueItem.tool_name,
        contextTitle: queueItem.context_title || undefined,
        categorySlug: queueItem.category_slug || undefined,
        queueItemId: queueItem.id,
      });

      // Stop heartbeat
      this.queue.stopHeartbeat();

      // Update queue item status
      if (result.success) {
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
      } else {
        await this.queue.markFailed(
          queueItem.id,
          result.error || 'Unknown error',
          undefined,
          this.log.bind(this)
        );
      }

      return { ...result, queueItemId: queueItem.id };
    } catch (error) {
      // Stop heartbeat on error
      this.queue.stopHeartbeat();

      const err = error as Error;
      await this.queue.markFailed(
        queueItem.id,
        err.message,
        { stack: err.stack },
        this.log.bind(this)
      );

      return {
        success: false,
        error: err.message,
        queueItemId: queueItem.id,
      };
    }
  }

  /**
   * Process multiple items from the queue
   */
  async processQueueBatch(maxItems: number = 5): Promise<{
    processed: number;
    succeeded: number;
    failed: number;
    results: HunterResult[];
  }> {
    const results: HunterResult[] = [];
    let processed = 0;
    let succeeded = 0;
    let failed = 0;

    for (let i = 0; i < maxItems; i++) {
      const result = await this.processNextFromQueue();

      if (result.error === 'No items in queue') {
        this.log('[Queue] Queue exhausted');
        break;
      }

      results.push(result);
      processed++;

      if (result.success) succeeded++;
      else failed++;
    }

    this.log(`[Queue] Batch complete: ${processed} processed, ${succeeded} succeeded, ${failed} failed`);

    return { processed, succeeded, failed, results };
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
