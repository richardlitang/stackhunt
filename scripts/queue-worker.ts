#!/usr/bin/env npx tsx
/**
 * Queue Worker - Local server for queue processing
 *
 * A lightweight worker that processes the hunt queue on a schedule.
 * Run this on any always-on server to avoid GitHub Actions minutes.
 *
 * Usage:
 *   npm run queue:worker              # Default: process 5 items every 6 hours
 *   npm run queue:worker -- --interval 1h --batch 3
 *   npm run queue:worker -- --once    # Run once and exit
 *
 * Options:
 *   --interval <time>  How often to run (default: 6h)
 *                      Formats: 30m, 1h, 6h, 12h, 24h
 *   --batch <n>        Max items per run (default: 5)
 *   --once             Run once and exit (for external cron)
 *   --discover         Also run topic discovery
 *
 * Environment:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   GEMINI_API_KEY, SERPER_API_KEY
 *   DISCORD_WEBHOOK_URL (optional)
 *
 * @module scripts/queue-worker
 */

import { parseArgs } from 'util';
import { exec } from 'child_process';
import { config } from 'dotenv';

config();

// macOS notification helper (silent fail on non-Mac)
async function notify(title: string, message: string, sound: boolean = false): Promise<void> {
  if (process.platform !== 'darwin') return;

  const escapedTitle = title.replace(/"/g, '\\"');
  const escapedMessage = message.replace(/"/g, '\\"');
  const soundCmd = sound ? 'sound name "default"' : '';

  const script = `display notification "${escapedMessage}" with title "${escapedTitle}" ${soundCmd}`;

  return new Promise((resolve) => {
    exec(`osascript -e '${script}'`, () => resolve());
  });
}

// Parse arguments
const { values } = parseArgs({
  options: {
    interval: { type: 'string', short: 'i', default: '6h' },
    batch: { type: 'string', short: 'b', default: '5' },
    once: { type: 'boolean', default: false },
    discover: { type: 'boolean', short: 'd', default: false },
    help: { type: 'boolean', short: 'h' },
  },
});

if (values.help) {
  console.log(`
Queue Worker - Process hunt queue locally

Usage:
  npm run queue:worker                    Run with defaults (every 6h, 5 items)
  npm run queue:worker -- --interval 1h  Run every hour
  npm run queue:worker -- --once         Run once (for external cron)
  npm run queue:worker -- --discover     Also run topic discovery

Options:
  -i, --interval <time>  Processing interval (30m, 1h, 6h, 12h, 24h)
  -b, --batch <n>        Max items per batch (1-20)
  -d, --discover         Run topic discovery after queue processing
  --once                 Run once and exit
  -h, --help             Show this help
`);
  process.exit(0);
}

// Validate environment
const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'GEMINI_API_KEY', 'SERPER_API_KEY'];
const missing = required.filter((k) => !process.env[k]);
if (missing.length > 0) {
  console.error(`Missing environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

// Parse interval to milliseconds
function parseInterval(str: string): number {
  const match = str.match(/^(\d+)(m|h)$/);
  if (!match) {
    console.error(`Invalid interval: ${str}. Use formats like: 30m, 1h, 6h`);
    process.exit(1);
  }
  const [, num, unit] = match;
  const ms = unit === 'h' ? parseInt(num) * 60 * 60 * 1000 : parseInt(num) * 60 * 1000;
  return ms;
}

const intervalMs = parseInterval(values.interval || '6h');
const batchSize = Math.min(Math.max(parseInt(values.batch || '5'), 1), 20);
const runOnce = values.once || false;
const runDiscover = values.discover || false;
const maxTokensPerRun = (() => {
  const raw = process.env.HUNTER_MAX_TOKENS_PER_RUN;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 600000;
})();

// Main processing function
async function processQueue(): Promise<void> {
  const startTime = Date.now();
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🔄 Queue Worker - ${new Date().toISOString()}`);
  console.log(`${'═'.repeat(60)}`);

  try {
    // Dynamic import to avoid loading at startup
    const { Hunter } = await import('../src/lib/hunter');
    const { ApiError } = await import('../src/lib/hunter/errors');
    const { alertCritical, alertQueueSummary } = await import('../src/lib/notifications/discord');
    const { createClient } = await import('@supabase/supabase-js');

    const discordUrl = process.env.DISCORD_WEBHOOK_URL;

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // ===================================================================
    // Priority 1: Check for batch synthesis opportunities (≥10 tools)
    // ===================================================================
    const batchResult = await checkForBatchSynthesis(supabase);
    if (batchResult) {
      console.log(`\n🚀 Batch synthesis ready: ${batchResult.category} (${batchResult.toolCount} tools)`);
      await processBatchSynthesis(supabase, batchResult);
      return; // Done for this cycle
    }

    // ===================================================================
    // Priority 2: Check for stale items (>7 days in research_complete)
    // ===================================================================
    const staleResult = await checkForStaleItems(supabase);
    if (staleResult) {
      console.log(`\n⏰ Processing stale item: ${staleResult.toolName} (>7 days old)`);
      await processStaleItem(supabase, staleResult);
      return; // Done for this cycle
    }

    // ===================================================================
    // Priority 3: Process new research items (existing logic)
    // ===================================================================
    const hunter = new Hunter({
      supabaseUrl: process.env.SUPABASE_URL!,
      supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      geminiApiKey: process.env.GEMINI_API_KEY!,
      serperApiKey: process.env.SERPER_API_KEY!,
      isDraftMode: true,
    });

    console.log(`Processing up to ${batchSize} items (token cap: ${maxTokensPerRun.toLocaleString()})...`);

    const result = await hunter.processQueueBatch(batchSize, { maxTokens: maxTokensPerRun });
    const errors: Array<{ tool: string; error: string; category?: string }> = [];
    const successes: Array<{ tool: string; context?: string }> = [];

    for (const r of result.results) {
      if (!r.success && r.error) {
        // Import formatter dynamically
        const { formatValidationError } = await import('../src/lib/utils/error-formatter');
        const formatted = formatValidationError(r.error);

        // Log full error to console for debugging
        console.error(`\n❌ Queue item failed:`);
        console.error(`   Tool: ${r.toolName || 'Unknown'}`);
        console.error(`   Category: ${formatted.category}`);
        console.error(`   Summary: ${formatted.summary}`);
        console.error(`   Full details: ${formatted.details}`);

        errors.push({
          tool: r.toolName || 'Unknown',
          error: `[${formatted.category}] ${formatted.summary}`,
        });
      } else if (r.success && r.toolName) {
        successes.push({
          tool: r.toolName,
          context: r.contextTitle,
        });
      }
    }
    const processedTitles = Array.from(new Set([
      ...successes.map(s => s.tool),
      ...errors.map(e => e.tool),
    ].filter(t => t && t !== 'Unknown')));

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n📊 Results: ${result.processed} processed, ${result.succeeded} succeeded, ${result.failed} failed (${duration}s)`);
    console.log(`   Tokens: ${result.tokensUsed.toLocaleString()}`);

    // macOS notification
    if (result.processed > 0) {
      const status = result.failed > 0 ? `${result.failed} failed` : 'All succeeded';
      await notify('StackHunt Queue', `Processed ${result.processed} items. ${status}`, result.failed > 0);
    }

    // Send Discord notification if there were failures or if we processed items
    if (discordUrl && result.processed > 0) {
      await alertQueueSummary(discordUrl, {
        processed: result.processed,
        succeeded: result.succeeded,
        failed: result.failed,
        successes,
        processedTitles,
        errors,
      });
    }

    // Check for critical errors in the results
    for (const r of result.results) {
      if (!r.success && r.error) {
        const { formatValidationError } = await import('../src/lib/utils/error-formatter');
        const formatted = formatValidationError(r.error);

        // Check if this is a critical error (API key, quota, auth issues)
        if (formatted.category === 'Authentication' || formatted.category === 'Authorization' || formatted.category === 'Rate Limit') {
          console.error(`\n🚨 CRITICAL ERROR DETECTED:`);
          console.error(`   Category: ${formatted.category}`);
          console.error(`   Summary: ${formatted.summary}`);
          console.error(`   Full details: ${formatted.details}`);

          await notify('StackHunt CRITICAL', `${formatted.category}: ${formatted.summary}`, true);
          if (discordUrl) {
            await alertCritical(discordUrl, {
              title: `${formatted.category} Failure in Queue Worker`,
              message: formatted.details,
              action: 'Check API keys, billing, and permissions immediately',
            });
          }
          // Don't continue processing with broken API keys
          if (runOnce) process.exit(1);
          return;
        }
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const { formatValidationError } = await import('../src/lib/utils/error-formatter');
    const formatted = formatValidationError(message);

    // Log full error to console
    console.error(`\n❌ Queue processing failed:`);
    console.error(`   Category: ${formatted.category}`);
    console.error(`   Summary: ${formatted.summary}`);
    console.error(`   Full details: ${formatted.details}`);

    // Use formatted summary for notification (user-friendly)
    await notify('StackHunt Error', `Queue failed: ${formatted.summary}`, true);

    const discordUrl = process.env.DISCORD_WEBHOOK_URL;
    if (discordUrl) {
      const { alertCritical } = await import('../src/lib/notifications/discord');
      await alertCritical(discordUrl, {
        title: 'Queue Worker Crashed',
        message: formatted.details, // Send full error details for critical alerts
        action: `Check worker logs. Category: ${formatted.category}`,
      });
    }

    if (runOnce) process.exit(1);
  }
}

// ============================================================================
// TWO-STAGE SYNTHESIS FUNCTIONS
// ============================================================================

interface BatchReadyGroup {
  category: string;
  toolCount: number;
  toolIds: string[];
  toolNames: string[];
}

interface StaleItem {
  id: string;
  toolName: string;
  category: string | null;
}

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Check for categories ready for batch synthesis (≥5 tools)
 */
async function checkForBatchSynthesis(
  supabase: ReturnType<typeof import('@supabase/supabase-js').createClient>
): Promise<BatchReadyGroup | null> {
  const { data, error } = await supabase.rpc('get_synthesis_ready_groups', { threshold: 5 });

  if (error || !data || data.length === 0) {
    return null;
  }

  // Return first category that's ready
  const batch = data[0];
  return {
    category: batch.category,
    toolCount: batch.tool_count,
    toolIds: batch.tool_ids,
    toolNames: batch.tool_names,
  };
}

/**
 * Check for stale items (>7 days in research_complete)
 */
async function checkForStaleItems(
  supabase: ReturnType<typeof import('@supabase/supabase-js').createClient>
): Promise<StaleItem | null> {
  const { data, error } = await supabase.rpc('get_stale_research_items', { days_threshold: 7 });

  if (error || !data || data.length === 0) {
    return null;
  }

  // Return first stale item
  const item = data[0];
  return {
    id: item.id,
    toolName: item.tool_name,
    category: item.detected_category,
  };
}

/**
 * Process batch synthesis for a category
 */
async function processBatchSynthesis(
  supabase: ReturnType<typeof import('@supabase/supabase-js').createClient>,
  batch: BatchReadyGroup
): Promise<void> {
  const startTime = Date.now();
  const batchId = crypto.randomUUID();

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🚀 Batch Synthesis: ${batch.category}`);
  console.log(`${'═'.repeat(60)}`);
  console.log(`Batch ID: ${batchId.slice(0, 8)}...`);
  console.log(`Tools: ${batch.toolCount}`);
  console.log(`Names: ${batch.toolNames.slice(0, 5).join(', ')}${batch.toolNames.length > 5 ? '...' : ''}`);

  try {
    // Mark items as processing
    await supabase
      .from('hunt_queue')
      .update({
        status: 'processing',
        batch_id: batchId,
        claimed_at: new Date().toISOString(),
        started_at: new Date().toISOString(),
      })
      .in('id', batch.toolIds);

    // Load research data for all items
    const { BatchSynthesisService } = await import('../src/lib/hunter/services/batch-synthesis.js');

    interface BatchInput {
      itemId: string;
      queueId: string;
      toolName: string;
      contextTitle?: string;
      categorySlug?: string;
      huntType?: string;
      forceUpdate?: boolean;
      researchData: Record<string, unknown>;
    }

    const inputs: BatchInput[] = [];

    for (let i = 0; i < batch.toolIds.length; i++) {
      const queueId = batch.toolIds[i];
      const toolName = batch.toolNames[i];

      const { data: queueItem } = await supabase
        .from('hunt_queue')
        .select('id, tool_name, context_title, category_slug, hunt_type, force_regenerate')
        .eq('id', queueId)
        .maybeSingle();

      if (!queueItem) {
        console.warn(`[Batch] Missing queue item for ${toolName} (${queueId}), skipping`);
        continue;
      }

      // Get stored research data from tool specs
      const toolSlug = toSlug(queueItem.tool_name || toolName);
      const { data: tool } = await supabase
        .from('items')
        .select('id, name, specs')
        .eq('slug', toolSlug)
        .maybeSingle();

      if (!tool?.specs?.research_data) {
        console.warn(`[Batch] No research data for ${toolName}, skipping`);
        continue;
      }

      inputs.push({
        itemId: queueItem.id,
        queueId: queueItem.id,
        toolName: tool.name,
        contextTitle: queueItem.context_title || undefined,
        categorySlug: queueItem.category_slug || undefined,
        huntType: queueItem.hunt_type || undefined,
        forceUpdate: Boolean(queueItem.force_regenerate) || queueItem.hunt_type === 'price_only',
        researchData: tool.specs.research_data,
      });
    }

    if (inputs.length === 0) {
      console.error('[Batch] No valid inputs, aborting');
      // Reset queue items
      await supabase
        .from('hunt_queue')
        .update({ status: 'research_complete', batch_id: null })
        .in('id', batch.toolIds);
      return;
    }

    console.log(`[Batch] Processing ${inputs.length} tools with valid research data`);

    // Get existing categories for Knowledge Graph
    const { data: cats } = await supabase.from('categories').select('name, type');
    const existingCategories = {
      functions: cats?.filter(c => c.type === 'function').map(c => c.name) || [],
      audiences: cats?.filter(c => c.type === 'audience').map(c => c.name) || [],
      platforms: cats?.filter(c => c.type === 'platform').map(c => c.name) || [],
    };

    // Run batch synthesis
    const batchService = new BatchSynthesisService(process.env.GEMINI_API_KEY!);
    const result = await batchService.synthesizeBatch(
      inputs,
      batch.category,
      existingCategories
    );

    const { executePersistencePhase } = await import('../src/lib/hunter/phases/persistence.js');
    const { QueueService } = await import('../src/lib/hunter/services/queue.js');
    const queueService = new QueueService({ supabase });

    const persistenceConfig = {
      supabaseUrl: process.env.SUPABASE_URL!,
      supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      geminiApiKey: process.env.GEMINI_API_KEY!,
      serperApiKey: process.env.SERPER_API_KEY!,
      isDraftMode: true,
    };

    // Save analyses through canonical persistence + queue completion
    for (const [toolName, { itemId: queueId, analysis }] of result.analyses.entries()) {
      const input = inputs.find((entry) => entry.queueId === queueId);
      if (!input) {
        console.error(`[Batch] Missing input metadata for ${toolName} (${queueId})`);
        continue;
      }

      try {
        const ctx = {
          toolName: input.toolName,
          contextTitle: input.contextTitle,
          categorySlug: input.categorySlug,
          queueItemId: input.queueId,
          forceUpdate: input.forceUpdate || input.huntType === 'price_only',
          huntType: input.huntType || 'full',
          skipAnalysis: false,
          skipPersistence: false,
          skipSynthesis: false,
          detectedCategory: batch.category,
          startTime: Date.now(),
          tokensUsed: 0,
          logs: [],
          research: {
            ...input.researchData,
            tokensUsed: 0,
          },
          analysis: {
            analysis,
            embedding: [],
            logo: null,
            tokensUsed: 0,
          },
        } as any;

        const deps = {
          supabase,
          serper: null,
          gemini: null,
          inventory: null,
          logo: null,
          config: persistenceConfig,
          withRetry: async <T>(fn: () => Promise<T>) => fn(),
          log: (message: string) => console.log(`[Batch Persist] [${input.toolName}] ${message}`),
        } as any;

        const persisted = await executePersistencePhase(ctx, deps);
        await queueService.markCompleted(
          input.queueId,
          {
            toolId: persisted.toolId,
            contextId: persisted.contextId || undefined,
            reviewId: persisted.reviewId || undefined,
          },
          (message) => console.log(`[Batch Persist] ${message}`)
        );
        await queueService.clearCheckpoint(
          input.queueId,
          (message) => console.log(`[Batch Persist] ${message}`)
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[Batch] Persistence failed for ${input.toolName}: ${message}`);
        await supabase
          .from('hunt_queue')
          .update({
            status: 'failed',
            error_message: message,
            completed_at: new Date().toISOString(),
          })
          .eq('id', input.queueId);
      }
    }

    // Mark failed items
    for (const err of result.errors) {
      const input = inputs.find(i => i.toolName === err.toolName);
      if (input) {
        await supabase
          .from('hunt_queue')
          .update({
            status: 'failed',
            error_message: err.error,
            completed_at: new Date().toISOString(),
          })
          .eq('id', input.queueId);
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`✅ Batch Complete: ${result.analyses.size}/${inputs.length} succeeded`);
    console.log(`   Cache hit rate: ${(result.cacheHitRate * 100).toFixed(1)}%`);
    console.log(`   Duration: ${duration}s`);
    console.log(`   Tokens: ${result.tokensUsed.toLocaleString()}`);
    console.log(`${'═'.repeat(60)}`);

  } catch (error) {
    console.error('[Batch] Synthesis failed:', error);
    // Reset queue items to research_complete
    await supabase
      .from('hunt_queue')
      .update({ status: 'research_complete', batch_id: null })
      .in('id', batch.toolIds);
    throw error;
  }
}

/**
 * Process a stale item individually (fallback when batch threshold not met)
 */
async function processStaleItem(
  supabase: ReturnType<typeof import('@supabase/supabase-js').createClient>,
  item: StaleItem
): Promise<void> {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`⏰ Stale Item: ${item.toolName}`);
  console.log(`   Category: ${item.category || 'none'}`);
  console.log(`   Queue ID: ${item.id}`);

  try {
    // Get queue metadata
    const { data: queueItem } = await supabase
      .from('hunt_queue')
      .select('id, tool_name, context_title, category_slug, hunt_type, force_regenerate')
      .eq('id', item.id)
      .maybeSingle();

    if (!queueItem) {
      throw new Error(`Missing queue item for stale job ${item.id}`);
    }

    // Get research data from item
    const toolSlug = toSlug(queueItem.tool_name || item.toolName);
    const { data: tool } = await supabase
      .from('items')
      .select('id, name, specs')
      .eq('slug', toolSlug)
      .maybeSingle();

    if (!tool?.specs?.research_data) {
      console.error(`[Stale] No research data for ${item.toolName}`);
      await supabase
        .from('hunt_queue')
        .update({
          status: 'failed',
          error_message: 'No research data found',
          completed_at: new Date().toISOString(),
        })
        .eq('id', item.id);
      return;
    }

    // Mark as processing
    await supabase
      .from('hunt_queue')
      .update({
        status: 'processing',
        claimed_at: new Date().toISOString(),
        started_at: new Date().toISOString(),
      })
      .eq('id', item.id);

    // Get existing categories
    const { data: cats } = await supabase.from('categories').select('name, type');
    const existingCategories = {
      functions: cats?.filter(c => c.type === 'function').map(c => c.name) || [],
      audiences: cats?.filter(c => c.type === 'audience').map(c => c.name) || [],
      platforms: cats?.filter(c => c.type === 'platform').map(c => c.name) || [],
    };

    // Synthesize individually
    const { synthesizeIndividual } = await import('../src/lib/hunter/services/batch-synthesis.js');

    const analysis = await synthesizeIndividual(
      {
        itemId: item.id,
        toolName: item.toolName,
        researchData: tool.specs.research_data,
      },
      process.env.GEMINI_API_KEY!,
      existingCategories
    );

    const { executePersistencePhase } = await import('../src/lib/hunter/phases/persistence.js');
    const { QueueService } = await import('../src/lib/hunter/services/queue.js');
    const queueService = new QueueService({ supabase });

    const persistenceConfig = {
      supabaseUrl: process.env.SUPABASE_URL!,
      supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      geminiApiKey: process.env.GEMINI_API_KEY!,
      serperApiKey: process.env.SERPER_API_KEY!,
      isDraftMode: true,
    };

    const ctx = {
      toolName: tool.name,
      contextTitle: queueItem.context_title || undefined,
      categorySlug: queueItem.category_slug || undefined,
      queueItemId: queueItem.id,
      forceUpdate: Boolean(queueItem.force_regenerate) || queueItem.hunt_type === 'price_only',
      huntType: queueItem.hunt_type || 'full',
      skipAnalysis: false,
      skipPersistence: false,
      skipSynthesis: false,
      detectedCategory: item.category || undefined,
      startTime: Date.now(),
      tokensUsed: 0,
      logs: [],
      research: {
        ...tool.specs.research_data,
        tokensUsed: 0,
      },
      analysis: {
        analysis,
        embedding: [],
        logo: null,
        tokensUsed: 0,
      },
    } as any;

    const deps = {
      supabase,
      serper: null,
      gemini: null,
      inventory: null,
      logo: null,
      config: persistenceConfig,
      withRetry: async <T>(fn: () => Promise<T>) => fn(),
      log: (message: string) => console.log(`[Stale Persist] [${tool.name}] ${message}`),
    } as any;

    const persisted = await executePersistencePhase(ctx, deps);

    await queueService.markCompleted(
      item.id,
      {
        toolId: persisted.toolId,
        contextId: persisted.contextId || undefined,
        reviewId: persisted.reviewId || undefined,
      },
      (message) => console.log(`[Stale Persist] ${message}`)
    );
    await queueService.clearCheckpoint(
      item.id,
      (message) => console.log(`[Stale Persist] ${message}`)
    );

    console.log(`✅ Stale item processed: ${item.toolName}`);

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[Stale] Failed to process ${item.toolName}:`, message);
    await supabase
      .from('hunt_queue')
      .update({
        status: 'failed',
        error_message: message,
        completed_at: new Date().toISOString(),
      })
      .eq('id', item.id);
  }
}

// Topic discovery function
async function discoverTopics(): Promise<void> {
  if (!runDiscover) return;

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`🔍 Running topic discovery...`);

  try {
    // Import and run the discover-topics logic
    const { spawn } = await import('child_process');

    await new Promise<void>((resolve, reject) => {
      const child = spawn('npx', ['tsx', 'scripts/discover-topics.ts'], {
        stdio: 'inherit',
        env: process.env,
      });

      child.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Topic discovery exited with code ${code}`));
      });

      child.on('error', reject);
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Topic discovery failed: ${message}`);
  }
}

// Main loop
async function main(): Promise<void> {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║           StackHunt Queue Worker v1.0                    ║
╠══════════════════════════════════════════════════════════╣
║  Interval: ${(values.interval || '6h').padEnd(10)} Batch size: ${String(batchSize).padEnd(5)}             ║
║  Mode: ${runOnce ? 'Single run' : 'Continuous'}${runDiscover ? ' + Discovery' : ''}${' '.repeat(38 - (runOnce ? 10 : 10) - (runDiscover ? 12 : 0))}║
╚══════════════════════════════════════════════════════════╝
`);

  if (runOnce) {
    // Single run mode (for external cron)
    await processQueue();
    await discoverTopics();
    console.log('\n✅ Done (single run mode)');
    process.exit(0);
  }

  // Continuous mode
  console.log(`Starting continuous processing every ${values.interval || '6h'}...`);
  console.log('Press Ctrl+C to stop\n');

  // Process immediately on start
  await processQueue();
  await discoverTopics();

  // Then schedule
  const interval = setInterval(async () => {
    await processQueue();
    await discoverTopics();
  }, intervalMs);

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\n🛑 Shutting down worker...');
    clearInterval(interval);
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n\n🛑 Received SIGTERM, shutting down...');
    clearInterval(interval);
    process.exit(0);
  });
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
