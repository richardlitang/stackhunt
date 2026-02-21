#!/usr/bin/env npx tsx

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { publishBestSnapshot } from '../src/lib/compiler/best/publish-best-snapshot.js';
import { publishCompareSnapshot } from '../src/lib/compiler/compare/publish-compare-snapshot.js';

dotenv.config();

function getArgValue(name: string): string | null {
  const found = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (!found) return null;
  return found.split('=').slice(1).join('=').trim();
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function parseLimit(name: string, fallback: number, max: number): number {
  const raw = Number(getArgValue(name) || fallback);
  if (!Number.isFinite(raw)) return fallback;
  return Math.max(0, Math.min(max, Math.floor(raw)));
}

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRole) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  const apply = hasFlag('apply');
  const bestLimit = parseLimit('best-limit', 10, 200);
  const compareLimit = parseLimit('compare-limit', 10, 200);

  const supabase = createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: bestDrafts, error: bestError } = await supabase
    .from('best_snapshots')
    .select('context_slug, computed_at, snapshot_json')
    .eq('status', 'draft')
    .order('computed_at', { ascending: false })
    .limit(bestLimit * 5);

  if (bestError) {
    throw new Error(`Failed to load best drafts: ${bestError.message}`);
  }

  const latestBestDraftByContext = new Map<string, any>();
  for (const row of bestDrafts || []) {
    const slug = String((row as any)?.context_slug || '').trim().toLowerCase();
    if (!slug || latestBestDraftByContext.has(slug)) continue;
    latestBestDraftByContext.set(slug, row);
  }
  const bestEligible = Array.from(latestBestDraftByContext.entries())
    .filter(([, row]) => Boolean((row as any)?.snapshot_json?.publish_gate?.pass))
    .map(([slug]) => slug)
    .slice(0, bestLimit);

  const { data: compareDrafts, error: compareError } = await supabase
    .from('compare_snapshots')
    .select('tool_a_slug, tool_b_slug, spec_key, computed_at, snapshot_json')
    .eq('status', 'draft')
    .order('computed_at', { ascending: false })
    .limit(compareLimit * 5);

  if (compareError) {
    throw new Error(`Failed to load compare drafts: ${compareError.message}`);
  }

  const latestCompareDraftByPair = new Map<string, any>();
  for (const row of compareDrafts || []) {
    const slugA = String((row as any)?.tool_a_slug || '').trim().toLowerCase();
    const slugB = String((row as any)?.tool_b_slug || '').trim().toLowerCase();
    const specKey = typeof (row as any)?.spec_key === 'string' ? (row as any).spec_key : '';
    if (!slugA || !slugB) continue;
    const key = `${slugA}-vs-${slugB}::${specKey}`;
    if (latestCompareDraftByPair.has(key)) continue;
    latestCompareDraftByPair.set(key, row);
  }
  const compareEligible = Array.from(latestCompareDraftByPair.values())
    .filter((row: any) => Boolean(row?.snapshot_json?.publish_gate?.pass))
    .map((row: any) => ({
      slugA: String(row.tool_a_slug),
      slugB: String(row.tool_b_slug),
      specKey: typeof row.spec_key === 'string' ? row.spec_key : null,
      key: `${row.tool_a_slug}-vs-${row.tool_b_slug}::${row.spec_key || ''}`,
    }))
    .slice(0, compareLimit);

  console.log('Shadow Publish Candidates');
  console.log(`Best eligible: ${bestEligible.length}`);
  console.log(`Compare eligible: ${compareEligible.length}`);
  console.log(`Mode: ${apply ? 'APPLY' : 'DRY RUN'}`);

  if (!apply) {
    for (const slug of bestEligible) console.log(`[best] would publish ${slug}`);
    for (const pair of compareEligible) {
      console.log(`[compare] would publish ${pair.slugA}-vs-${pair.slugB} (${pair.specKey || 'default'})`);
    }
    return;
  }

  let bestPublished = 0;
  for (const slug of bestEligible) {
    try {
      const result = await publishBestSnapshot(slug);
      bestPublished += 1;
      console.log(`[best] published ${slug} -> v${result.version}`);
    } catch (error) {
      console.warn(`[best] failed ${slug}: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  }

  let comparePublished = 0;
  for (const pair of compareEligible) {
    try {
      const result = await publishCompareSnapshot(pair.slugA, pair.slugB, pair.specKey);
      comparePublished += 1;
      console.log(`[compare] published ${pair.slugA}-vs-${pair.slugB} -> v${result.version}`);
    } catch (error) {
      console.warn(
        `[compare] failed ${pair.slugA}-vs-${pair.slugB}: ${error instanceof Error ? error.message : 'unknown error'}`
      );
    }
  }

  console.log('\nShadow Publish Summary');
  console.log(`Best published: ${bestPublished}/${bestEligible.length}`);
  console.log(`Compare published: ${comparePublished}/${compareEligible.length}`);
}

main().catch((error) => {
  console.error('Shadow publish failed:', error);
  process.exit(1);
});
