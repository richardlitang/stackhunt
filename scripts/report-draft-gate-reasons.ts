#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { evaluateStrictPublishGate } from '../src/lib/review-publish-gate';

dotenv.config();

const AUTHORITATIVE_SOURCE_TYPES = new Set(['official', 'docs', 'support', 'legal']);
const DEFAULT_MIN_ACTIONABILITY_SCORE = 58;
const DEFAULT_MIN_READER_UTILITY_SCORE = 62;
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
  generation_quality: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  item: {
    id: string;
    name: string;
    slug: string;
    short_description: string | null;
    verdict: string | null;
    review_count: number | null;
    pricing_confidence: string | number | null;
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

function parseCsvArg(name: string): string[] {
  const raw = getArgValue(name);
  if (!raw) return [];
  return raw
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.length > 0);
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

function getMinActionabilityScore(): number {
  const raw = process.env.HUNTER_MIN_ACTIONABILITY_SCORE;
  const parsed = raw ? Number(raw) : NaN;
  if (!Number.isFinite(parsed)) return DEFAULT_MIN_ACTIONABILITY_SCORE;
  return Math.min(100, Math.max(0, Math.round(parsed)));
}

function getActionabilityScore(generationQuality: Record<string, unknown> | null): number | null {
  const raw = generationQuality?.actionabilityScore;
  const parsed = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(parsed)) return null;
  return Math.min(100, Math.max(0, parsed));
}

function getMinReaderUtilityScore(): number {
  const raw = process.env.HUNTER_MIN_READER_UTILITY_SCORE;
  const parsed = raw ? Number(raw) : NaN;
  if (!Number.isFinite(parsed)) return DEFAULT_MIN_READER_UTILITY_SCORE;
  return Math.min(100, Math.max(0, Math.round(parsed)));
}

function getReaderUtilityScore(generationQuality: Record<string, unknown> | null): number | null {
  const raw = generationQuality?.readerUtilityScore;
  const parsed = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(parsed)) return null;
  return Math.min(100, Math.max(0, parsed));
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

function resolveReviewDataQuality(review: ReviewRow): 'high' | 'medium' | 'low' | null {
  const quality = typeof review.quality === 'string' ? review.quality.trim().toLowerCase() : '';
  if (quality === 'high' || quality === 'medium' || quality === 'low') {
    return quality as 'high' | 'medium' | 'low';
  }

  const metadata = review.item?.metadata || null;
  const meta =
    metadata && typeof metadata.meta === 'object'
      ? (metadata.meta as Record<string, unknown>)
      : null;
  const metadataQuality =
    meta && typeof meta.data_quality === 'string' ? meta.data_quality.trim().toLowerCase() : '';
  if (metadataQuality === 'high' || metadataQuality === 'medium' || metadataQuality === 'low') {
    return metadataQuality as 'high' | 'medium' | 'low';
  }

  return null;
}

function analyzeReview(
  review: ReviewRow,
  options: {
    isLatestForItem: boolean;
  }
): {
  knownBlockers: string[];
  popularityTier: PopularityTier;
  evidenceGrade: 'A' | 'B' | 'C';
  actionabilityScore: number | null;
  readerUtilityScore: number | null;
  minActionabilityScore: number;
  minReaderUtilityScore: number;
  strictMetrics: {
    requiredSourcingMissingCount: number;
    riskFlagsCount: number;
    pricingConfidence: 'high' | 'medium' | 'low' | 'unknown';
    genericPhraseCount: number;
    scenarioRecommendationCount: number;
    copyQualityScore: number;
  };
  sourceStats: {
    total: number;
    authoritativeSources: number;
    authoritativeDomains: number;
  };
} {
  const knownBlockers: string[] = [];
  const minActionabilityScore = getMinActionabilityScore();
  const minReaderUtilityScore = getMinReaderUtilityScore();
  const actionabilityScore = getActionabilityScore(review.generation_quality);
  const readerUtilityScore = getReaderUtilityScore(review.generation_quality);
  const popularityTier = resolvePopularityTier(review.item?.metadata || null);
  const profile = POPULARITY_PROFILES[popularityTier];
  const gateScore = getGateScore(review.item?.specs || null);
  const requiredSectionsComplete = getRequiredSectionsComplete(review.item?.specs || null);
  const rawNoindexReasons = getNoindexReasons(review.item?.specs || null);
  const noindexReasons = rawNoindexReasons.filter((reason) => reason !== 'draft_review');
  knownBlockers.push(...noindexReasons.map((reason) => `quality_gate:${reason}`));
  if (
    options.isLatestForItem &&
    review.status === 'published' &&
    rawNoindexReasons.includes('draft_review')
  ) {
    knownBlockers.push('quality_gate:stale_draft_review_noindex_on_published');
  }

  const score = review.score ?? 0;
  if (score < 70) knownBlockers.push('score_below_70');
  if (score < profile.minScore) knownBlockers.push(`score_below_${profile.minScore}_tier_gate`);

  const quality = resolveReviewDataQuality(review);
  if (!quality || !profile.allowedDataQualities.includes(quality)) {
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
    const domain = normalizeDomain(source.domain) || extractDomainFromUrl(source.url);
    const sourceType = (source.source_type || source.type || '').toLowerCase();
    if (AUTHORITATIVE_SOURCE_TYPES.has(sourceType)) {
      authoritativeSources += 1;
      if (domain) authoritativeDomains.add(domain);
    }
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
  if (actionabilityScore === null) {
    knownBlockers.push('missing_actionability_score');
  }
  if (actionabilityScore !== null && actionabilityScore < minActionabilityScore) {
    knownBlockers.push(`low_actionability:${actionabilityScore}<${minActionabilityScore}`);
  }
  if (readerUtilityScore === null) {
    knownBlockers.push('missing_reader_utility_score');
  }
  if (readerUtilityScore !== null && readerUtilityScore < minReaderUtilityScore) {
    knownBlockers.push(`low_reader_utility:${readerUtilityScore}<${minReaderUtilityScore}`);
  }
  const strict = evaluateStrictPublishGate(
    {
      ...(review.item || {}),
      short_description: review.item?.short_description || null,
      verdict: review.item?.verdict || null,
    } as any,
    {
      summary_markdown: review.summary_markdown,
      cons: review.cons,
      sources: review.sources,
    } as any
  );
  knownBlockers.push(...strict.blockers);

  return {
    knownBlockers: Array.from(new Set(knownBlockers)),
    popularityTier,
    evidenceGrade: strict.evidenceGrade,
    actionabilityScore,
    readerUtilityScore,
    minActionabilityScore,
    minReaderUtilityScore,
    strictMetrics: {
      requiredSourcingMissingCount: strict.metrics.requiredSourcingMissingCount,
      riskFlagsCount: strict.metrics.riskFlagsCount,
      pricingConfidence: strict.metrics.pricingConfidence,
      genericPhraseCount: strict.metrics.genericPhraseCount,
      scenarioRecommendationCount: strict.metrics.scenarioRecommendationCount,
      copyQualityScore: strict.metrics.copyQualityScore,
    },
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
  const includePublished = hasFlag('include-published');
  const slugFilter = new Set(parseCsvArg('slug'));
  const maxPublishArg = Number(getArgValue('max-publish') || 25);
  const maxStrictQaGateArg = Number(
    getArgValue('max-strict-qa-gate-blockers') || getArgValue('max-strict-qa-gate') || -1
  );
  const maxStaleDraftNoindexArg = Number(getArgValue('max-stale-draft-review') || -1);
  const limitArg = Number(getArgValue('limit') || 50);
  const minReviewsArg = Number(getArgValue('min-reviews') || 2);
  const limit = Number.isFinite(limitArg) ? Math.max(1, Math.min(limitArg, 200)) : 50;
  const minReviews = Number.isFinite(minReviewsArg) ? Math.max(0, minReviewsArg) : 2;
  const maxPublish = Number.isFinite(maxPublishArg)
    ? Math.max(1, Math.min(maxPublishArg, 200))
    : 25;
  const maxStrictQaGateBlockers = Number.isFinite(maxStrictQaGateArg)
    ? Math.max(-1, Math.floor(maxStrictQaGateArg))
    : -1;
  const maxStaleDraftNoindex = Number.isFinite(maxStaleDraftNoindexArg)
    ? Math.max(-1, Math.floor(maxStaleDraftNoindexArg))
    : -1;

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRole) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRole);

  const baseSelect = `
      id,
      item_id,
      status,
      score,
      quality,
      summary_markdown,
      cons,
      sources,
      created_at,
      updated_at,
      item:items(
        id,
        name,
        slug,
        short_description,
        verdict,
        review_count,
        pricing_confidence,
        pricing_verified_at,
        updated_at,
        metadata,
        specs
      )
    `;
  const withGenerationQualitySelect = `
      id,
      item_id,
      status,
      score,
      quality,
      summary_markdown,
      cons,
      sources,
      generation_quality,
      created_at,
      updated_at,
      item:items(
        id,
        name,
        slug,
        short_description,
        verdict,
        review_count,
        pricing_confidence,
        pricing_verified_at,
        updated_at,
        metadata,
        specs
      )
    `;

  const reviewStatuses = includePublished ? ['draft', 'review', 'published'] : ['draft', 'review'];

  let data: ReviewRow[] | null = null;
  let error: { message: string } | null = null;
  {
    const result = await supabase
      .from('reviews')
      .select(withGenerationQualitySelect)
      .in('status', reviewStatuses)
      .not('item_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(limit);
    data = (result.data as ReviewRow[] | null) || null;
    error = result.error ? { message: result.error.message } : null;
  }
  if (error && /generation_quality/.test(error.message) && /does not exist/i.test(error.message)) {
    const fallback = await supabase
      .from('reviews')
      .select(baseSelect)
      .in('status', reviewStatuses)
      .not('item_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(limit);
    data = ((fallback.data || []) as Array<Omit<ReviewRow, 'generation_quality'>>).map((row) => ({
      ...row,
      generation_quality: null,
    }));
    error = fallback.error ? { message: fallback.error.message } : null;
  }

  if (error) {
    console.error('Query failed:', error.message);
    process.exit(1);
  }

  const rows = ((data || []) as ReviewRow[]).filter((row) => {
    const reviewCount = row.item?.review_count ?? 0;
    if (reviewCount < minReviews) return false;
    if (slugFilter.size === 0) return true;
    const itemSlug = (row.item?.slug || '').toLowerCase();
    return slugFilter.has(itemSlug);
  });
  const latestReviewIdByItem = new Map<string, string>();
  for (const row of rows) {
    if (!latestReviewIdByItem.has(row.item_id)) {
      latestReviewIdByItem.set(row.item_id, row.id);
    }
  }

  const blockerCounts = new Map<string, number>();
  const latestByItem = new Map<string, ReviewRow>();
  const safeLatestReviews: ReviewRow[] = [];
  const actionabilityValues: number[] = [];
  let belowMinActionabilityCount = 0;
  let missingActionabilityCount = 0;
  const readerUtilityValues: number[] = [];
  let belowMinReaderUtilityCount = 0;
  let missingReaderUtilityCount = 0;
  const copyQualityScores: number[] = [];
  let copyGenericPhraseHits = 0;
  let copyMissingScenarioCount = 0;
  let copyBelowMinCount = 0;
  const minActionabilityScore = getMinActionabilityScore();
  const minCopyQualityScore = 60;

  console.log('\nDraft Gate Audit');
  console.log(`Statuses: ${reviewStatuses.join(', ')}`);
  if (slugFilter.size > 0) {
    console.log(`Slug filter: ${Array.from(slugFilter).join(', ')}`);
  }
  console.log(`Rows fetched: ${data?.length || 0}`);
  console.log(`Rows analyzed (item.review_count >= ${minReviews}): ${rows.length}`);
  console.log('');

  for (const row of rows) {
    const reviewCount = row.item?.review_count ?? 0;
    const analysis = analyzeReview(row, {
      isLatestForItem: latestReviewIdByItem.get(row.item_id) === row.id,
    });
    if (analysis.actionabilityScore !== null) {
      actionabilityValues.push(analysis.actionabilityScore);
      if (analysis.actionabilityScore < analysis.minActionabilityScore) {
        belowMinActionabilityCount += 1;
      }
    } else {
      missingActionabilityCount += 1;
    }
    if (analysis.readerUtilityScore !== null) {
      readerUtilityValues.push(analysis.readerUtilityScore);
      if (analysis.readerUtilityScore < analysis.minReaderUtilityScore) {
        belowMinReaderUtilityCount += 1;
      }
    } else {
      missingReaderUtilityCount += 1;
    }
    copyQualityScores.push(analysis.strictMetrics.copyQualityScore);
    copyGenericPhraseHits += analysis.strictMetrics.genericPhraseCount;
    if (analysis.strictMetrics.scenarioRecommendationCount === 0) {
      copyMissingScenarioCount += 1;
    }
    if (analysis.strictMetrics.copyQualityScore < minCopyQualityScore) {
      copyBelowMinCount += 1;
    }
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
      `  sources=${analysis.sourceStats.total} authoritative_sources=${analysis.sourceStats.authoritativeSources} authoritative_domains=${analysis.sourceStats.authoritativeDomains} evidence_grade=${analysis.evidenceGrade}`
    );
    console.log(
      `  strict_metrics: required_sourcing_missing=${analysis.strictMetrics.requiredSourcingMissingCount} risk_flags=${analysis.strictMetrics.riskFlagsCount} pricing_confidence=${analysis.strictMetrics.pricingConfidence} generic_phrases=${analysis.strictMetrics.genericPhraseCount} scenario_recos=${analysis.strictMetrics.scenarioRecommendationCount} copy_quality=${analysis.strictMetrics.copyQualityScore}`
    );
    console.log(
      `  actionability: score=${analysis.actionabilityScore ?? 'n/a'} min=${analysis.minActionabilityScore}`
    );
    console.log(
      `  reader_utility: score=${analysis.readerUtilityScore ?? 'n/a'} min=${analysis.minReaderUtilityScore}`
    );
    console.log(
      `  blockers=${analysis.knownBlockers.length > 0 ? analysis.knownBlockers.join(', ') : 'none_detected'}`
    );
  }

  const avgActionability =
    actionabilityValues.length > 0
      ? actionabilityValues.reduce((sum, value) => sum + value, 0) / actionabilityValues.length
      : null;
  console.log('\nActionability metrics:');
  console.log(`  min threshold: ${minActionabilityScore}`);
  console.log(
    `  average score: ${avgActionability !== null ? avgActionability.toFixed(1) : 'n/a'}`
  );
  console.log(`  below threshold: ${belowMinActionabilityCount}`);
  console.log(`  missing score: ${missingActionabilityCount}`);
  const avgReaderUtility =
    readerUtilityValues.length > 0
      ? readerUtilityValues.reduce((sum, value) => sum + value, 0) / readerUtilityValues.length
      : null;
  console.log('\nReader utility metrics:');
  console.log(`  min threshold: ${getMinReaderUtilityScore()}`);
  console.log(
    `  average score: ${avgReaderUtility !== null ? avgReaderUtility.toFixed(1) : 'n/a'}`
  );
  console.log(`  below threshold: ${belowMinReaderUtilityCount}`);
  console.log(`  missing score: ${missingReaderUtilityCount}`);

  const avgCopyQuality =
    copyQualityScores.length > 0
      ? copyQualityScores.reduce((sum, value) => sum + value, 0) / copyQualityScores.length
      : null;
  console.log('\nCopy quality metrics:');
  console.log(`  min threshold: ${minCopyQualityScore}`);
  console.log(`  average score: ${avgCopyQuality !== null ? avgCopyQuality.toFixed(1) : 'n/a'}`);
  console.log(`  below threshold: ${copyBelowMinCount}`);
  console.log(`  missing scenario recos: ${copyMissingScenarioCount}`);
  console.log(`  generic phrase hits (total): ${copyGenericPhraseHits}`);

  console.log('\nTop blocker counts:');
  const sorted = Array.from(blockerCounts.entries()).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) {
    console.log('  none');
  } else {
    for (const [blocker, count] of sorted) {
      console.log(`  ${count}x ${blocker}`);
    }
  }
  const strictQaGateBlockers = sorted
    .filter(([blocker]) => blocker.startsWith('strict:qa_gate:'))
    .reduce((sum, [, count]) => sum + count, 0);
  const strictQaGateKinds = sorted.filter(([blocker]) =>
    blocker.startsWith('strict:qa_gate:')
  ).length;
  const staleDraftNoindexCount =
    blockerCounts.get('quality_gate:stale_draft_review_noindex_on_published') || 0;
  console.log('\nStrict QA gate blockers:');
  console.log(`  total: ${strictQaGateBlockers}`);
  console.log(`  unique kinds: ${strictQaGateKinds}`);
  console.log(`  threshold: ${maxStrictQaGateBlockers < 0 ? 'disabled' : maxStrictQaGateBlockers}`);

  if (maxStrictQaGateBlockers >= 0 && strictQaGateBlockers > maxStrictQaGateBlockers) {
    console.error(
      `\nFail-fast: strict_qa_gate_blockers=${strictQaGateBlockers} exceeds max=${maxStrictQaGateBlockers}`
    );
    process.exit(1);
  }

  console.log('\nPublished noindex drift:');
  console.log(`  stale draft_review reasons on published rows: ${staleDraftNoindexCount}`);
  console.log(`  threshold: ${maxStaleDraftNoindex < 0 ? 'disabled' : maxStaleDraftNoindex}`);
  if (maxStaleDraftNoindex >= 0 && staleDraftNoindexCount > maxStaleDraftNoindex) {
    console.error(
      `\nFail-fast: stale_draft_review_noindex=${staleDraftNoindexCount} exceeds max=${maxStaleDraftNoindex}`
    );
    process.exit(1);
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
