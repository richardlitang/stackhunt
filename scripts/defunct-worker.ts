#!/usr/bin/env npx tsx
/**
 * Defunct Worker - Processes defunct hunt_queue items
 *
 * Marks matching items as deprecated and records processing timestamp.
 *
 * Usage:
 *   npx tsx scripts/defunct-worker.ts --limit 20
 *   npx tsx scripts/defunct-worker.ts --once
 */

import { parseArgs } from 'util';
import { config } from 'dotenv';

config();

const { values } = parseArgs({
  options: {
    limit: { type: 'string', short: 'l', default: '20' },
    once: { type: 'boolean', default: false },
    interval: { type: 'string', short: 'i', default: '6h' },
    help: { type: 'boolean', short: 'h' },
  },
});

if (values.help) {
  console.log(`
Defunct Worker - Process defunct hunt queue items

Usage:
  npx tsx scripts/defunct-worker.ts --once
  npx tsx scripts/defunct-worker.ts --limit 20
  npx tsx scripts/defunct-worker.ts --interval 6h

Options:
  -l, --limit <n>       Max items per run (default: 20)
  -i, --interval <time> Run interval (30m, 1h, 6h, 12h, 24h)
  --once                Run once and exit
  -h, --help            Show this help
`);
  process.exit(0);
}

const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const missing = required.filter((k) => !process.env[k]);
if (missing.length > 0) {
  console.error(`Missing environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

function parseInterval(str: string): number {
  const match = str.match(/^(\d+)(m|h)$/);
  if (!match) {
    console.error(`Invalid interval: ${str}. Use formats like: 30m, 1h, 6h`);
    process.exit(1);
  }
  const [, num, unit] = match;
  return unit === 'h' ? parseInt(num) * 60 * 60 * 1000 : parseInt(num) * 60 * 1000;
}

const intervalMs = parseInterval(values.interval || '6h');
const limit = Math.min(Math.max(parseInt(values.limit || '20'), 1), 100);
const runOnce = values.once || false;

async function processDefunct(): Promise<void> {
  const { createClient } = await import('@supabase/supabase-js');
  const { slugify } = await import('../src/lib/hunter/utils');

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: queueItems, error } = await supabase
    .from('hunt_queue')
    .select('id, tool_name, defunct_status')
    .eq('status', 'defunct')
    .is('defunct_processed_at', null)
    .order('defunct_checked_at', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('[Defunct Worker] Failed to load defunct items:', error);
    return;
  }

  if (!queueItems || queueItems.length === 0) {
    console.log('[Defunct Worker] No defunct items to process');
    return;
  }

  for (const item of queueItems) {
    const toolSlug = slugify(item.tool_name);
    const { data: existing } = await supabase
      .from('items')
      .select('id, metadata, is_deprecated')
      .eq('slug', toolSlug)
      .maybeSingle();

    if (existing?.id) {
      const metadata = (existing.metadata as Record<string, any>) || {};
      const meta = (metadata.meta as Record<string, any>) || {};

      const shutdownDate = (item.defunct_status as any)?.shutdownDate || null;
      const lastMajorUpdate = meta.last_major_update || shutdownDate || null;

      const updatedMetadata = {
        ...metadata,
        meta: {
          ...meta,
          active_development: false,
          last_major_update: lastMajorUpdate,
        },
      };

      const { error: updateError } = await supabase
        .from('items')
        .update({
          is_deprecated: true,
          metadata: updatedMetadata,
        })
        .eq('id', existing.id);

      if (updateError) {
        console.error(`[Defunct Worker] Failed to update item ${existing.id}:`, updateError);
      } else {
        console.log(`[Defunct Worker] Marked deprecated: ${item.tool_name}`);
      }
    } else {
      console.log(`[Defunct Worker] No item found for: ${item.tool_name}`);
    }

    await supabase
      .from('hunt_queue')
      .update({ defunct_processed_at: new Date().toISOString() })
      .eq('id', item.id);
  }
}

async function main(): Promise<void> {
  await processDefunct();
  if (runOnce) return;
  setInterval(processDefunct, intervalMs);
}

main().catch((error) => {
  console.error('[Defunct Worker] Fatal error:', error);
  process.exit(1);
});
