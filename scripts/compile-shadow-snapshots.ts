#!/usr/bin/env npx tsx

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { compileBestSnapshotDraft } from '../src/lib/compiler/best/compile-best-snapshot.js';
import { compileCompareSnapshotDraft } from '../src/lib/compiler/compare/compile-compare-snapshot.js';
import { normalizeComparePair } from '../src/lib/compiler/snapshot-helpers.js';

dotenv.config();

function getArgValue(name: string): string | null {
  const found = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (!found) return null;
  return found.split('=').slice(1).join('=').trim();
}

function parseLimit(name: string, fallback: number, max: number): number {
  const raw = Number(getArgValue(name) || fallback);
  if (!Number.isFinite(raw)) return fallback;
  return Math.max(0, Math.min(max, Math.floor(raw)));
}

function parseCsvArg(name: string): string[] {
  const raw = getArgValue(name);
  if (!raw) return [];
  return raw
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.length > 0);
}

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRole) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  const contextLimit = parseLimit('contexts', 20, 500);
  const pairLimit = parseLimit('pairs', 30, 1000);
  const requestedContextSlugs = parseCsvArg('context-slugs');
  const requestedPairs = parseCsvArg('compare-pairs');

  const supabase = createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let contextSlugs: string[] = requestedContextSlugs;
  if (contextSlugs.length === 0 && contextLimit > 0) {
    const { data: contexts, error: contextError } = await supabase
      .from('contexts')
      .select('slug')
      .not('slug', 'is', null)
      .gt('published_reviews_count', 0)
      .order('published_reviews_count', { ascending: false })
      .order('updated_at', { ascending: false })
      .limit(contextLimit);

    if (contextError) {
      throw new Error(`Failed to fetch contexts: ${contextError.message}`);
    }

    contextSlugs = (contexts || [])
      .map((row: any) => String(row.slug || '').trim().toLowerCase())
      .filter((slug) => slug.length > 0);
  }

  const bestResults: Array<{ context: string; ok: boolean; message: string }> = [];
  for (const slug of contextSlugs) {
    try {
      const result = await compileBestSnapshotDraft(slug);
      bestResults.push({
        context: slug,
        ok: true,
        message: `draft v${result.version} (${result.rankedCount} ranked)`,
      });
      console.log(`[best] ${slug} -> draft v${result.version} (${result.rankedCount} ranked)`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      bestResults.push({ context: slug, ok: false, message });
      console.warn(`[best] ${slug} -> failed (${message})`);
    }
  }

  const pairSet = new Set<string>();
  for (const pair of requestedPairs) {
    const [slugA, slugB] = pair.split('-vs-').map((value) => value.trim().toLowerCase());
    if (!slugA || !slugB) continue;
    try {
      const normalized = normalizeComparePair(slugA, slugB);
      pairSet.add(`${normalized.toolASlug}-vs-${normalized.toolBSlug}`);
    } catch {
      continue;
    }
  }

  if (pairSet.size === 0 && pairLimit > 0 && contextSlugs.length > 0) {
    for (const contextSlug of contextSlugs) {
      if (pairSet.size >= pairLimit) break;

      const { data: context, error: contextError } = await supabase
        .from('contexts')
        .select('id')
        .eq('slug', contextSlug)
        .maybeSingle();

      if (contextError || !context?.id) continue;

      const { data: topReviews, error: reviewsError } = await supabase
        .from('reviews')
        .select('item:items(slug)')
        .eq('context_id', context.id)
        .eq('status', 'published')
        .order('score', { ascending: false })
        .limit(2);

      if (reviewsError || !topReviews || topReviews.length < 2) continue;

      const slugA = String((topReviews[0] as any)?.item?.slug || '').trim().toLowerCase();
      const slugB = String((topReviews[1] as any)?.item?.slug || '').trim().toLowerCase();
      if (!slugA || !slugB || slugA === slugB) continue;
      const normalized = normalizeComparePair(slugA, slugB);
      pairSet.add(`${normalized.toolASlug}-vs-${normalized.toolBSlug}`);
    }
  }

  const comparePairs = Array.from(pairSet).slice(0, pairLimit);
  const compareResults: Array<{ pair: string; ok: boolean; message: string }> = [];

  for (const pair of comparePairs) {
    const [slugA, slugB] = pair.split('-vs-');
    try {
      const result = await compileCompareSnapshotDraft(slugA, slugB);
      compareResults.push({
        pair,
        ok: true,
        message: `draft v${result.version} (${result.winner})`,
      });
      console.log(`[compare] ${pair} -> draft v${result.version} (${result.winner})`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      compareResults.push({ pair, ok: false, message });
      console.warn(`[compare] ${pair} -> failed (${message})`);
    }
  }

  const bestOk = bestResults.filter((row) => row.ok).length;
  const compareOk = compareResults.filter((row) => row.ok).length;

  console.log('\nShadow Snapshot Compile Summary');
  console.log(`Best contexts attempted: ${bestResults.length}`);
  console.log(`Best contexts succeeded: ${bestOk}`);
  console.log(`Compare pairs attempted: ${compareResults.length}`);
  console.log(`Compare pairs succeeded: ${compareOk}`);
}

main().catch((error) => {
  console.error('Shadow snapshot compile failed:', error);
  process.exit(1);
});
