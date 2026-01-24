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

    const discordUrl = process.env.DISCORD_WEBHOOK_URL;

    const hunter = new Hunter({
      supabaseUrl: process.env.SUPABASE_URL!,
      supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      geminiApiKey: process.env.GEMINI_API_KEY!,
      serperApiKey: process.env.SERPER_API_KEY!,
      isDraftMode: true,
    });

    console.log(`Processing up to ${batchSize} items...`);

    const result = await hunter.processQueueBatch(batchSize);
    const errors: Array<{ tool: string; error: string; category?: string }> = [];

    for (const r of result.results) {
      if (!r.success && r.error) {
        // Import formatter dynamically
        const { formatValidationError } = await import('../src/lib/utils/error-formatter');
        const formatted = formatValidationError(r.error);

        // Log full error to console for debugging
        console.error(`\n❌ Queue item failed:`);
        console.error(`   Category: ${formatted.category}`);
        console.error(`   Summary: ${formatted.summary}`);
        console.error(`   Full details: ${formatted.details}`);

        errors.push({
          tool: formatted.category,
          error: formatted.summary,
          category: formatted.category
        });
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n📊 Results: ${result.processed} processed, ${result.succeeded} succeeded, ${result.failed} failed (${duration}s)`);

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
