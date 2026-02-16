#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const AUTHORITATIVE_SOURCE_TYPES = new Set(['official', 'docs', 'support', 'legal']);
const RISKY_ABSOLUTE_TERMS =
  /\b(always|never|broken|scam|unreliable|guaranteed|everyone|nobody)\b/i;
type PopularityTier = 'popular' | 'standard' | 'below_standard';

const POPULARITY_PROFILES: Record<
  PopularityTier,
  {
    minScore: number;
    allowedDataQualities: Array<'high' | 'medium' | 'low'>;
    minValidCons: number;
    minAuthoritativeSources: number;
    minAuthoritativeDomains: number;
  }
> = {
  popular: {
    minScore: 70,
    allowedDataQualities: ['high', 'medium'],
    minValidCons: 1,
    minAuthoritativeSources: 2,
    minAuthoritativeDomains: 1,
  },
  standard: {
    minScore: 75,
    allowedDataQualities: ['high', 'medium'],
    minValidCons: 1,
    minAuthoritativeSources: 3,
    minAuthoritativeDomains: 2,
  },
  below_standard: {
    minScore: 80,
    allowedDataQualities: ['high'],
    minValidCons: 2,
    minAuthoritativeSources: 4,
    minAuthoritativeDomains: 2,
  },
};

type SourceRow = {
  url?: string;
  domain?: string;
  type?: string;
  source_type?: string;
};

type ReviewRow = {
  id: string;
  item_id: string;
  status: string;
  score: number | null;
  quality: string | null;
  summary_markdown: string | null;
  cons: unknown;
  sources: unknown;
  updated_at: string;
  item: {
    id: string;
    name: string;
    slug: string;
    review_count: number | null;
    pricing_verified_at: string | null;
    updated_at: string;
    metadata: Record<string, unknown> | null;
    specs: Record<string, unknown> | null;
  } | null;
};

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function getArgValue(name: string): string | null {
  const found = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (!found) return null;
  return found.split('=').slice(1).join('=').trim();
}

function normalizeDomain(input?: string): string | null {
  if (!input) return null;
  const trimmed = input.trim().toLowerCase().replace(/^www\./, '');
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

function toSources(raw: unknown): SourceRow[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((entry): entry is SourceRow => Boolean(entry && typeof entry === 'object'));
}

function toStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((entry): entry is string => typeof entry === 'string');
}

function getNoindexReasons(specs: Record<string, unknown> | null): string[] {
  const canonical = (specs?.canonical as Record<string, unknown> | undefined) || {};
  const quality = (canonical.quality as Record<string, unknown> | undefined) || {};
  return toStringArray(quality.noindex_reasons);
}

function getCanonicalConflicts(specs: Record<string, unknown> | null): number {
  const canonical = (specs?.canonical as Record<string, unknown> | undefined) || {};
  const quality = (canonical.quality as Record<string, unknown> | undefined) || {};
  return Number(quality.conflicts_count || 0) || 0;
}

function getGateScore(specs: Record<string, unknown> | null): number {
  const canonical = (specs?.canonical as Record<string, unknown> | undefined) || {};
  const quality = (canonical.quality as Record<string, unknown> | undefined) || {};
  return Number(quality.score || 0) || 0;
}

function getRequiredSectionsComplete(specs: Record<string, unknown> | null): boolean {
  const canonical = (specs?.canonical as Record<string, unknown> | undefined) || {};
  const quality = (canonical.quality as Record<string, unknown> | undefined) || {};
  return Boolean(quality.required_sections_complete);
}

function resolvePopularityTier(metadata?: Record<string, unknown> | null): PopularityTier {
  const explicit =
    metadata?.popularity_tier ||
    (metadata?.meta && typeof metadata.meta === 'object'
      ? (metadata.meta as Record<string, unknown>).popularity_tier
      : null);
  const normalized = typeof explicit === 'string' ? explicit.trim().toLowerCase() : '';
  if (normalized === 'popular') return 'popular';
  if (normalized === 'below_standard') return 'below_standard';
  return 'standard';
}

function analyzeReview(review: ReviewRow): {
  knownBlockers: string[];
  popularityTier: PopularityTier;
  sourceStats: {
    total: number;
    authoritativeSources: number;
    authoritativeDomains: number;
  };
} {
  const knownBlockers: string[] = [];
  const popularityTier = resolvePopularityTier(review.item?.metadata || null);
  const profile = POPULARITY_PROFILES[popularityTier];
  const gateScore = getGateScore(review.item?.specs || null);
  const requiredSectionsComplete = getRequiredSectionsComplete(review.item?.specs || null);
  const noindexReasons = getNoindexReasons(review.item?.specs || null).filter(
    (reason) => reason !== 'draft_review'
  );
  knownBlockers.push(...noindexReasons.map((reason) => `quality_gate:${reason}`));

  const score = review.score ?? 0;
  if (score < 70) knownBlockers.push('score_below_70');
  if (score < profile.minScore) knownBlockers.push(`score_below_${profile.minScore}_tier_gate`);

  const quality = (review.quality || '').toLowerCase();
  if (!profile.allowedDataQualities.includes(quality as 'high' | 'medium' | 'low')) {
    knownBlockers.push(`data_quality_not_allowed_for_${popularityTier}`);
  }

  const consCount = Array.isArray(review.cons) ? review.cons.length : 0;
  if (consCount < 1) knownBlockers.push('no_valid_cons');
  if (consCount < profile.minValidCons) {
    knownBlockers.push(`cons_below_${profile.minValidCons}_for_${popularityTier}`);
  }

  const sources = toSources(review.sources);
  const authoritativeDomains = new Set<string>();
  let authoritativeSources = 0;
  for (const source of sources) {
    const sourceType = (source.source_type || source.type || '').toLowerCase();
    if (!AUTHORITATIVE_SOURCE_TYPES.has(sourceType)) continue;
    authoritativeSources += 1;
    const domain = normalizeDomain(source.domain) || extractDomainFromUrl(source.url);
    if (domain) authoritativeDomains.add(domain);
  }

  const meetsAuthoritativeSourceRule =
    authoritativeSources >= profile.minAuthoritativeSources ||
    (popularityTier === 'popular' &&
      authoritativeSources >= 1 &&
      requiredSectionsComplete &&
      gateScore >= 110);
  if (!meetsAuthoritativeSourceRule) {
    knownBlockers.push(
      `authoritative_sources_below_${profile.minAuthoritativeSources}_for_${popularityTier}`
    );
  }
  const meetsAuthoritativeDomainRule =
    authoritativeDomains.size >= profile.minAuthoritativeDomains ||
    (popularityTier === 'standard' &&
      authoritativeDomains.size >= 1 &&
      authoritativeSources >= 4 &&
      requiredSectionsComplete &&
      gateScore >= 110);
  if (!meetsAuthoritativeDomainRule) {
    knownBlockers.push(
      `authoritative_domains_below_${profile.minAuthoritativeDomains}_for_${popularityTier}`
    );
  }

  const conflictsCount = getCanonicalConflicts(review.item?.specs || null);
  if (conflictsCount > 0) knownBlockers.push(`canonical_conflicts:${conflictsCount}`);

  const summaryText = (review.summary_markdown || '').trim();
  if (summaryText.length < 40) knownBlockers.push('summary_too_short_or_missing');
  if (RISKY_ABSOLUTE_TERMS.test(summaryText) && authoritativeDomains.size < 2) {
    knownBlockers.push('risky_absolute_claim_low_evidence');
  }

  return {
    knownBlockers: Array.from(new Set(knownBlockers)),
    popularityTier,
    sourceStats: {
      total: sources.length,
      authoritativeSources,
      authoritativeDomains: authoritativeDomains.size,
    },
  };
}

async function main() {
  const publishSafe = hasFlag('publish-safe');
  const apply = hasFlag('apply');
  const maxPublishArg = Number(getArgValue('max-publish') || 25);
  const limitArg = Number(getArgValue('limit') || 50);
  const minReviewsArg = Number(getArgValue('min-reviews') || 2);
  const limit = Number.isFinite(limitArg) ? Math.max(1, Math.min(limitArg, 200)) : 50;
  const minReviews = Number.isFinite(minReviewsArg) ? Math.max(0, minReviewsArg) : 2;
  const maxPublish = Number.isFinite(maxPublishArg) ? Math.max(1, Math.min(maxPublishArg, 200)) : 25;

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRole) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRole);

  const { data, error } = await supabase
    .from('reviews')
    .select(
      `
      id,
      item_id,
      status,
      score,
      quality,
      summary_markdown,
      cons,
      sources,
      updated_at,
      item:items(
        id,
        name,
        slug,
        review_count,
        pricing_verified_at,
        updated_at,
        metadata,
        specs
      )
    `
    )
    .in('status', ['draft', 'review'])
    .not('item_id', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Query failed:', error.message);
    process.exit(1);
  }

  const rows = ((data || []) as ReviewRow[]).filter((row) => {
    const reviewCount = row.item?.review_count ?? 0;
    return reviewCount >= minReviews;
  });

  const blockerCounts = new Map<string, number>();
  const latestByItem = new Map<string, ReviewRow>();
  const safeLatestReviews: ReviewRow[] = [];

  console.log('\nDraft Gate Audit');
  console.log(`Rows fetched: ${data?.length || 0}`);
  console.log(`Rows analyzed (item.review_count >= ${minReviews}): ${rows.length}`);
  console.log('');

  for (const row of rows) {
    const reviewCount = row.item?.review_count ?? 0;
    const analysis = analyzeReview(row);
    if (!latestByItem.has(row.item_id)) {
      latestByItem.set(row.item_id, row);
      if (analysis.knownBlockers.length === 0) {
        safeLatestReviews.push(row);
      }
    }
    for (const blocker of analysis.knownBlockers) {
      blockerCounts.set(blocker, (blockerCounts.get(blocker) || 0) + 1);
    }

    console.log(
      `- ${row.item?.name || row.item_id} (${row.status}) tier=${analysis.popularityTier} score=${row.score ?? 'n/a'} quality=${row.quality || 'n/a'} review_count=${reviewCount}`
    );
    console.log(
      `  sources=${analysis.sourceStats.total} authoritative_sources=${analysis.sourceStats.authoritativeSources} authoritative_domains=${analysis.sourceStats.authoritativeDomains}`
    );
    console.log(
      `  blockers=${analysis.knownBlockers.length > 0 ? analysis.knownBlockers.join(', ') : 'none_detected'}`
    );
  }

  console.log('\nTop blocker counts:');
  const sorted = Array.from(blockerCounts.entries()).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) {
    console.log('  none');
  } else {
    for (const [blocker, count] of sorted) {
      console.log(`  ${count}x ${blocker}`);
    }
  }

  if (!publishSafe) return;

  const publishTargets = safeLatestReviews.slice(0, maxPublish);
  console.log('\nAuto-publish Safe Drafts');
  console.log(`Mode: ${apply ? 'APPLY' : 'DRY RUN'}`);
  console.log(`Latest-per-item candidates with blockers=none: ${safeLatestReviews.length}`);
  console.log(`Max publish this run: ${maxPublish}`);
  console.log(`Selected this run: ${publishTargets.length}`);

  if (publishTargets.length > 0) {
    console.log('\nSelected reviews:');
    publishTargets.forEach((row, idx) => {
      console.log(`  ${idx + 1}. ${row.item?.name || row.item_id} (${row.id})`);
    });
  }

  if (!apply) {
    console.log('\nRun with --publish-safe --apply to publish selected reviews.');
    return;
  }

  let published = 0;
  for (const row of publishTargets) {
    const { error: updateError } = await supabase
      .from('reviews')
      .update({
        status: 'published',
        published_at: new Date().toISOString(),
      })
      .eq('id', row.id)
      .in('status', ['draft', 'review']);

    if (updateError) {
      console.error(`Failed to publish ${row.id}: ${updateError.message}`);
      continue;
    }

    published += 1;
  }

  console.log(`\nPublished ${published} review(s).`);
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
