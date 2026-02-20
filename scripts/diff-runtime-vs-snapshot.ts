#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { diffRankings } from '../src/lib/compiler/diff-report.js';

dotenv.config();

type ContextRow = {
  id: string;
  slug: string;
  title: string;
};

type ReviewRow = {
  item_id: string | null;
  score: number | null;
};

type SnapshotRankedEntry = {
  item_id?: string;
  tool_id?: string;
  score?: number;
};

function getArgValue(name: string): string | null {
  const found = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (!found) return null;
  return found.split('=').slice(1).join('=').trim();
}

function parseLimit(): number {
  const raw = Number(getArgValue('sample') || 50);
  if (!Number.isFinite(raw)) return 50;
  return Math.max(1, Math.min(raw, 500));
}

function asSnapshotRanked(snapshotJson: unknown): SnapshotRankedEntry[] {
  if (!snapshotJson || typeof snapshotJson !== 'object') return [];
  const obj = snapshotJson as Record<string, unknown>;
  const ranked = obj.ranked || obj.ranked_tools || obj.items;
  if (!Array.isArray(ranked)) return [];
  return ranked.filter((entry): entry is SnapshotRankedEntry => Boolean(entry && typeof entry === 'object'));
}

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRole) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const sample = parseLimit();
  const supabase = createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: contexts, error: contextError } = await supabase
    .from('contexts')
    .select('id, slug, title')
    .gt('tool_count', 0)
    .not('slug', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(sample);

  if (contextError) {
    console.error(`Failed to load contexts: ${contextError.message}`);
    process.exit(1);
  }

  const rows = (contexts || []) as ContextRow[];
  if (rows.length === 0) {
    console.log('No contexts available for diff run.');
    return;
  }

  let snapshotTableAvailable = true;
  let compared = 0;
  let missingSnapshots = 0;
  let overlapRateSum = 0;
  let topKAgreementSum = 0;
  let totalRuntimeEntries = 0;
  let totalSnapshotEntries = 0;

  for (const context of rows) {
    const { data: reviews, error: reviewsError } = await supabase
      .from('reviews')
      .select('item_id, score')
      .eq('context_id', context.id)
      .eq('status', 'published')
      .order('score', { ascending: false })
      .limit(30);

    if (reviewsError) {
      console.warn(`[Skip] ${context.slug}: failed to load runtime reviews (${reviewsError.message})`);
      continue;
    }

    const runtimeEntries = ((reviews || []) as ReviewRow[])
      .filter((row) => Boolean(row.item_id))
      .map((row) => ({ id: row.item_id as string, score: row.score ?? null }));

    if (runtimeEntries.length === 0) continue;

    const { data: snapshotRows, error: snapshotError } = await supabase
      .from('best_snapshots')
      .select('snapshot_json')
      .eq('context_slug', context.slug)
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(1);

    if (snapshotError) {
      if (snapshotError.message.toLowerCase().includes('best_snapshots')) {
        snapshotTableAvailable = false;
        break;
      }
      console.warn(`[Skip] ${context.slug}: snapshot query failed (${snapshotError.message})`);
      continue;
    }

    const snapshotRow = snapshotRows?.[0] as { snapshot_json?: unknown } | undefined;
    if (!snapshotRow?.snapshot_json) {
      missingSnapshots += 1;
      continue;
    }

    const snapshotEntries = asSnapshotRanked(snapshotRow.snapshot_json)
      .map((entry) => ({
        id: entry.item_id || entry.tool_id || '',
        score: typeof entry.score === 'number' ? entry.score : null,
      }))
      .filter((entry) => entry.id.length > 0);

    const diff = diffRankings(runtimeEntries, snapshotEntries, 5);
    compared += 1;
    overlapRateSum += diff.overlapRate;
    topKAgreementSum += diff.topKAgreementRate;
    totalRuntimeEntries += diff.runtimeCount;
    totalSnapshotEntries += diff.snapshotCount;
  }

  console.log('\nRuntime vs Snapshot Diff');
  console.log(`Contexts sampled: ${rows.length}`);

  if (!snapshotTableAvailable) {
    console.log('Snapshot table unavailable (`best_snapshots` not deployed yet).');
    console.log('No parity diff computed. Re-run after snapshot schema rollout.');
    return;
  }

  console.log(`Contexts compared: ${compared}`);
  console.log(`Contexts missing published snapshot: ${missingSnapshots}`);

  if (compared === 0) {
    console.log('No comparable contexts found.');
    return;
  }

  const avgOverlap = overlapRateSum / compared;
  const avgTopKAgreement = topKAgreementSum / compared;
  const avgRuntimeEntries = totalRuntimeEntries / compared;
  const avgSnapshotEntries = totalSnapshotEntries / compared;

  console.log(`Avg overlap rate: ${(avgOverlap * 100).toFixed(1)}%`);
  console.log(`Avg top-5 agreement: ${(avgTopKAgreement * 100).toFixed(1)}%`);
  console.log(`Avg runtime entries/context: ${avgRuntimeEntries.toFixed(1)}`);
  console.log(`Avg snapshot entries/context: ${avgSnapshotEntries.toFixed(1)}`);
}

main().catch((error) => {
  console.error('Unexpected diff failure:', error);
  process.exit(1);
});

