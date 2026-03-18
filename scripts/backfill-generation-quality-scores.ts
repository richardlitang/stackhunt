#!/usr/bin/env node --import tsx

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import {
  computeActionabilityScore,
  computeReaderUtilityScore,
} from '../src/lib/hunter/generation-quality-metrics';

dotenv.config();

type ReviewWithItem = {
  id: string;
  item_id: string;
  status: string;
  pros: unknown;
  cons: unknown;
  sources: unknown;
  dealbreakers: string[] | null;
  switching_from: string[] | null;
  generation_quality: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  item: {
    id: string;
    slug: string;
    review_context: Record<string, unknown> | null;
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

function toStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((entry): entry is string => typeof entry === 'string');
}

function toClaimTexts(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => {
      if (typeof entry === 'string') return entry;
      if (!entry || typeof entry !== 'object') return null;
      const text = (entry as Record<string, unknown>).text;
      return typeof text === 'string' ? text : null;
    })
    .filter((text): text is string => typeof text === 'string' && text.trim().length > 0);
}

function normalizeDomain(input?: string): string | null {
  if (!input) return null;
  const trimmed = input
    .trim()
    .toLowerCase()
    .replace(/^www\./, '');
  if (!trimmed) return null;
  return trimmed;
}

function extractDomainFromUrl(url?: string): string | null {
  if (!url) return null;
  try {
    return normalizeDomain(new URL(url).hostname);
  } catch {
    return null;
  }
}

function getDistinctDomainCount(rawSources: unknown): number {
  if (!Array.isArray(rawSources)) return 0;
  const domains = new Set<string>();
  for (const source of rawSources) {
    if (!source || typeof source !== 'object') continue;
    const row = source as Record<string, unknown>;
    const directDomain = typeof row.domain === 'string' ? normalizeDomain(row.domain) : null;
    const urlDomain =
      typeof row.url === 'string'
        ? extractDomainFromUrl(row.url)
        : typeof row.source_url === 'string'
          ? extractDomainFromUrl(row.source_url)
          : null;
    const domain = directDomain || urlDomain;
    if (domain) domains.add(domain);
  }
  return domains.size;
}

function getScore(raw: unknown): number | null {
  const parsed = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(parsed)) return null;
  return Math.min(100, Math.max(0, parsed));
}

function getAbstainedCount(generationQuality: Record<string, unknown> | null): number {
  if (!generationQuality) return 0;
  const raw = generationQuality.abstainedFields;
  if (!Array.isArray(raw)) return 0;
  return raw.length;
}

function getReviewContextSignals(reviewContext: Record<string, unknown> | null): {
  decisionIntro: {
    best_for?: string | null;
    not_for?: string | null;
    main_tradeoff?: string | null;
    summary?: string | null;
  } | null;
  userAdvocate: {
    avoidIf?: string[];
    frustrations?: string[];
    idealFor?: string[];
  } | null;
} {
  if (!reviewContext || typeof reviewContext !== 'object') {
    return { decisionIntro: null, userAdvocate: null };
  }
  const rawDecisionIntro = (reviewContext.decisionIntro ||
    reviewContext.decision_intro ||
    {}) as Record<string, unknown>;
  const rawUserAdvocate = (reviewContext.userAdvocate ||
    reviewContext.user_advocate ||
    {}) as Record<string, unknown>;

  return {
    decisionIntro: {
      best_for: typeof rawDecisionIntro.best_for === 'string' ? rawDecisionIntro.best_for : null,
      not_for: typeof rawDecisionIntro.not_for === 'string' ? rawDecisionIntro.not_for : null,
      main_tradeoff:
        typeof rawDecisionIntro.main_tradeoff === 'string' ? rawDecisionIntro.main_tradeoff : null,
      summary: typeof rawDecisionIntro.summary === 'string' ? rawDecisionIntro.summary : null,
    },
    userAdvocate: {
      avoidIf: toStringArray(rawUserAdvocate.avoidIf || rawUserAdvocate.avoid_if),
      frustrations: toStringArray(rawUserAdvocate.frustrations),
      idealFor: toStringArray(rawUserAdvocate.idealFor || rawUserAdvocate.ideal_for),
    },
  };
}

async function main() {
  const apply = hasFlag('apply');
  const includeDrafts = hasFlag('include-drafts');
  const slugFilter = new Set(parseCsvArg('slug'));
  const pageSizeArg = Number(getArgValue('page-size') || 250);
  const limitArg = Number(getArgValue('limit') || 500);
  const pageSize = Number.isFinite(pageSizeArg) ? Math.max(50, Math.min(pageSizeArg, 1000)) : 250;
  const limit = Number.isFinite(limitArg) ? Math.max(1, Math.min(limitArg, 5000)) : 500;
  const statuses = includeDrafts ? ['draft', 'review', 'published'] : ['published'];

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
        pros,
        cons,
        sources,
        dealbreakers,
        switching_from,
        generation_quality,
        created_at,
        updated_at,
        item:items(
          id,
          slug,
          review_context
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
        const itemSlug = row.item.slug.toLowerCase();
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

  let scanned = 0;
  let needsBackfill = 0;
  let updatedRows = 0;

  console.log('\nGeneration Quality Score Backfill');
  console.log(`Mode: ${apply ? 'APPLY' : 'DRY RUN'}`);
  console.log(`Statuses: ${statuses.join(', ')}`);
  if (slugFilter.size > 0) {
    console.log(`Slug filter: ${Array.from(slugFilter).join(', ')}`);
  }
  console.log(`Candidate items: ${candidates.length}`);

  for (const row of candidates) {
    scanned += 1;
    const existing = (row.generation_quality || {}) as Record<string, unknown>;
    const existingActionability = getScore(existing.actionabilityScore);
    const existingReaderUtility = getScore(existing.readerUtilityScore);
    const missingActionability = existingActionability === null;
    const missingReaderUtility = existingReaderUtility === null;
    if (!missingActionability && !missingReaderUtility) {
      continue;
    }

    const claimTexts = [...toClaimTexts(row.pros), ...toClaimTexts(row.cons)];
    const abstainedCount = getAbstainedCount(row.generation_quality);
    const dealbreakerCount = (row.dealbreakers || []).length;
    const switchingCount = (row.switching_from || []).length;
    const distinctDomains = getDistinctDomainCount(row.sources);
    const contextSignals = getReviewContextSignals(row.item?.review_context || null);

    const backfilledActionability = computeActionabilityScore(claimTexts, {
      vetoCount: dealbreakerCount,
      switchingCount,
      dealbreakerCount,
      abstainedCount,
      distinctDomains,
    });
    const backfilledReaderUtility = computeReaderUtilityScore({
      claimTexts,
      decisionIntro: contextSignals.decisionIntro,
      userAdvocate: contextSignals.userAdvocate,
      vetoCount: dealbreakerCount,
      realityCheckCount: 0,
      abstainedCount,
    });

    const nextGenerationQuality = {
      ...existing,
      actionabilityScore: missingActionability ? backfilledActionability : existingActionability,
      readerUtilityScore: missingReaderUtility ? backfilledReaderUtility : existingReaderUtility,
      scoreBackfilledAt: new Date().toISOString(),
      scoreBackfillVersion: 'v1',
    };

    needsBackfill += 1;
    console.log(
      `- ${row.item?.slug || row.item_id} (${row.status}) actionability=${nextGenerationQuality.actionabilityScore} reader_utility=${nextGenerationQuality.readerUtilityScore}`
    );

    if (!apply) continue;
    const { error: updateError } = await supabase
      .from('reviews')
      .update({ generation_quality: nextGenerationQuality })
      .eq('id', row.id);
    if (updateError) {
      console.error(`Failed to update ${row.id}: ${updateError.message}`);
      continue;
    }
    updatedRows += 1;
  }

  console.log(`\nScanned latest reviews: ${scanned}`);
  console.log(`Rows needing score backfill: ${needsBackfill}`);
  console.log(`Rows updated: ${updatedRows}`);
  if (!apply) {
    console.log('\nRun with --apply to persist updates.');
  }
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
