#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { evaluateIndexReadiness } from '../src/lib/quality-gate';
import type { Review, Tool } from '../src/types/database';

dotenv.config();

type ReviewWithItem = {
  id: string;
  item_id: string;
  status: string;
  summary_markdown: string | null;
  pros: unknown;
  cons: unknown;
  sources: unknown;
  created_at: string;
  updated_at: string;
  item: {
    id: string;
    slug: string;
    metadata: Record<string, unknown> | null;
    specs: Record<string, unknown> | null;
    pricing_verified_at: string | null;
    short_description: string | null;
    verdict: string | null;
    updated_at: string;
  } | null;
};

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function getArgValue(name: string): string | null {
  const match = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (!match) return null;
  return match.split('=').slice(1).join('=').trim();
}

function parseCsvArg(name: string): string[] {
  const raw = getArgValue(name);
  if (!raw) return [];
  return raw
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.length > 0);
}

function toReasonCounts(reasons: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const reason of reasons) {
    counts.set(reason, (counts.get(reason) || 0) + 1);
  }
  return counts;
}

async function main() {
  const apply = hasFlag('apply');
  const includePublished = hasFlag('include-published');
  const slugFilter = new Set(parseCsvArg('slug'));
  const pageSizeArg = Number(getArgValue('page-size') || 250);
  const limitArg = Number(getArgValue('limit') || 500);
  const pageSize = Number.isFinite(pageSizeArg) ? Math.max(50, Math.min(pageSizeArg, 1000)) : 250;
  const limit = Number.isFinite(limitArg) ? Math.max(1, Math.min(limitArg, 5000)) : 500;
  const statuses = includePublished ? ['draft', 'review', 'published'] : ['draft', 'review'];

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const latestByItem = new Map<string, ReviewWithItem>();

  let from = 0;
  while (latestByItem.size < limit) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from('reviews')
      .select(
        `
        id,
        item_id,
        status,
        summary_markdown,
        pros,
        cons,
        sources,
        created_at,
        updated_at,
        item:items(
          id,
          slug,
          metadata,
          specs,
          pricing_verified_at,
          short_description,
          verdict,
          updated_at
        )
      `
      )
      .in('status', statuses)
      .not('item_id', 'is', null)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error(`Failed to load reviews: ${error.message}`);
      process.exit(1);
    }

    const rows = (data || []) as ReviewWithItem[];
    if (rows.length === 0) break;

    for (const row of rows) {
      if (!row.item || latestByItem.has(row.item_id)) continue;
      if (slugFilter.size > 0) {
        const itemSlug =
          typeof (row.item as { slug?: unknown }).slug === 'string'
            ? ((row.item as { slug?: string }).slug || '').toLowerCase()
            : '';
        if (!slugFilter.has(itemSlug)) continue;
      }
      latestByItem.set(row.item_id, row);
      if (latestByItem.size >= limit) break;
    }

    if (rows.length < pageSize) break;
    from += pageSize;
  }

  const candidates = Array.from(latestByItem.values());
  if (candidates.length === 0) {
    console.log('No review candidates found.');
    return;
  }

  let changedRows = 0;
  let shouldIndexCount = 0;
  const reasonAccumulator: string[] = [];

  console.log('\nQuality Snapshot Recompute');
  console.log(`Mode: ${apply ? 'APPLY' : 'DRY RUN'}`);
  console.log(`Statuses: ${statuses.join(', ')}`);
  if (slugFilter.size > 0) {
    console.log(`Slug filter: ${Array.from(slugFilter).join(', ')}`);
  }
  console.log(`Candidate items: ${candidates.length}`);

  for (const row of candidates) {
    const item = row.item!;
    const readiness = evaluateIndexReadiness(
      {
        id: item.id,
        metadata: item.metadata as Tool['metadata'],
        specs: item.specs as Tool['specs'],
        pricing_verified_at: item.pricing_verified_at,
        short_description: item.short_description,
        verdict: item.verdict,
        updated_at: item.updated_at,
      } as Tool,
      {
        summary_markdown: row.summary_markdown,
        pros: row.pros as Review['pros'],
        cons: row.cons as Review['cons'],
        sources: row.sources as Review['sources'],
        created_at: row.created_at,
        updated_at: row.updated_at,
        status: row.status,
      } as Review
    );

    const isDraftLike = row.status !== 'published';
    const shouldIndex = readiness.shouldIndex && !isDraftLike;
    const noindexReasons = [...readiness.reasons];
    if (isDraftLike) noindexReasons.push('draft_review');
    reasonAccumulator.push(...noindexReasons);
    if (shouldIndex) shouldIndexCount += 1;

    const existingSpecs = (item.specs || {}) as Record<string, unknown>;
    const canonical = (existingSpecs.canonical as Record<string, unknown> | undefined) || {};
    const priorQuality = (canonical.quality as Record<string, unknown> | undefined) || {};
    const quality = {
      ...priorQuality,
      should_index: shouldIndex,
      noindex_reasons: noindexReasons,
      required_sections_complete: readiness.signals.required_sections_complete,
      volatiles_fresh: readiness.signals.volatiles_fresh,
      conflicts_count: readiness.signals.conflicts_count,
      score: readiness.signals.score,
      section_publishability: readiness.signals.section_publishability,
      section_status: readiness.signals.section_status,
      evidence_counts: readiness.signals.evidence_counts,
      last_evaluated_at: new Date().toISOString(),
    };
    const nextSpecs = {
      ...existingSpecs,
      canonical: {
        ...canonical,
        quality,
      },
    };

    const previousQualityJson = JSON.stringify(priorQuality);
    const nextQualityJson = JSON.stringify(quality);
    if (previousQualityJson === nextQualityJson) continue;
    changedRows += 1;

    if (!apply) continue;
    const { error: updateError } = await supabase
      .from('items')
      .update({ specs: nextSpecs })
      .eq('id', item.id);
    if (updateError) {
      console.error(`Failed to update ${item.id}: ${updateError.message}`);
    }
  }

  const reasonCounts = Array.from(toReasonCounts(reasonAccumulator).entries()).sort(
    (a, b) => b[1] - a[1]
  );
  console.log(`Items with changed quality snapshot: ${changedRows}`);
  console.log(`Items eligible for index now: ${shouldIndexCount}`);
  if (reasonCounts.length > 0) {
    console.log('\nTop noindex reasons:');
    reasonCounts.slice(0, 12).forEach(([reason, count], index) => {
      console.log(`  ${index + 1}. ${reason}: ${count}`);
    });
  }

  if (!apply) {
    console.log('\nRun with --apply to persist snapshot updates.');
  }
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
