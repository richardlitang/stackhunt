#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { getAvailableSourceSlots, parseQueueCap } from './lib/queue-guardrails.js';

dotenv.config();

type CandidateRow = {
  item_id: string;
  name: string;
  popularity_tier: string | null;
};

type QueueRow = {
  tool_name: string;
};

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function getArgValue(name: string): string | null {
  const hit = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (!hit) return null;
  return hit.split('=').slice(1).join('=').trim();
}

async function main() {
  const apply = hasFlag('apply');
  const limitArg = Number(getArgValue('limit') || 50);
  const priorityArg = Number(getArgValue('priority') || 95);
  const limit = Number.isFinite(limitArg) ? Math.max(1, Math.min(limitArg, 500)) : 50;
  const priority = Number.isFinite(priorityArg) ? Math.max(0, Math.min(priorityArg, 100)) : 95;

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: rows, error } = await supabase
    .from('reviews')
    .select(
      `
      status,
      item:items!inner(
        id,
        name,
        metadata,
        specs
      )
    `
    )
    .in('status', ['draft', 'review'])
    .limit(1000);

  if (error) {
    console.error(`Failed to load candidates: ${error.message}`);
    process.exit(1);
  }

  const dedup = new Map<string, CandidateRow>();
  for (const row of rows || []) {
    const item = row.item as
      | { id: string; name: string; metadata?: Record<string, unknown> | null; specs?: Record<string, unknown> | null }
      | null;
    if (!item) continue;
    const tier = (item.metadata?.popularity_tier as string | undefined) || 'standard';
    if (tier !== 'popular') continue;
    const noindex =
      (((item.specs?.canonical as Record<string, unknown> | undefined)?.quality as
        | Record<string, unknown>
        | undefined)?.noindex_reasons as unknown[]) || [];
    const hasVolatile = Array.isArray(noindex) && noindex.includes('volatile_facts_not_fresh');
    if (!hasVolatile) continue;
    dedup.set(item.id, { item_id: item.id, name: item.name, popularity_tier: tier });
  }

  const list = Array.from(dedup.values()).slice(0, limit);
  await enqueue(list, supabase, apply, priority);
}

async function enqueue(
  candidates: CandidateRow[],
  supabase: ReturnType<typeof createClient>,
  apply: boolean,
  priority: number
) {
  if (candidates.length === 0) {
    console.log('\nVolatile Refresh Queue');
    console.log('No popular volatile-stale draft tools found.');
    return;
  }

  const names = candidates.map((c) => c.name);
  const { data: existing, error: existingError } = await supabase
    .from('hunt_queue')
    .select('tool_name')
    .in('status', ['pending', 'claimed', 'processing'])
    .in('tool_name', names);

  if (existingError) {
    console.error(`Failed to check queue duplicates: ${existingError.message}`);
    process.exit(1);
  }

  const existingSet = new Set(((existing || []) as QueueRow[]).map((q) => q.tool_name));
  const toInsert = candidates.filter((c) => !existingSet.has(c.name));

  console.log('\nVolatile Refresh Queue');
  console.log(`Mode: ${apply ? 'APPLY' : 'DRY RUN'}`);
  console.log(`Candidates: ${candidates.length}`);
  console.log(`Already queued: ${existingSet.size}`);
  console.log(`To enqueue: ${toInsert.length}`);

  if (toInsert.length > 0) {
    console.log('\nTools:');
    toInsert.forEach((row, idx) => console.log(`  ${idx + 1}. ${row.name}`));
  }

  if (!apply || toInsert.length === 0) {
    if (!apply) console.log('\nRun with --apply to enqueue price_only refresh jobs.');
    return;
  }

  const rows = toInsert.map((c) => ({
    tool_name: c.name,
    context_title: null,
    category_slug: null,
    priority,
    source: 'admin',
    hunt_type: 'price_only',
  }));

  const sourceCap = parseQueueCap(process.env.HUNT_QUEUE_SOURCE_PENDING_CAP, 400);
  const { current, remaining } = await getAvailableSourceSlots(supabase as any, 'scheduled', sourceCap);
  if (remaining <= 0) {
    console.log(
      `\nQueue source cap reached for "scheduled" (${current}/${sourceCap}). Skipping enqueue.`
    );
    return;
  }
  if (rows.length > remaining) {
    console.log(
      `\nQueue guardrail trimming rows from ${rows.length} to ${remaining} (scheduled pending ${current}/${sourceCap}).`
    );
    rows.length = remaining;
  }

  const { error } = await supabase.from('hunt_queue').insert(rows);
  if (error) {
    console.error(`Failed to enqueue jobs: ${error.message}`);
    process.exit(1);
  }

  console.log(`\nEnqueued ${rows.length} price_only refresh job(s).`);
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
