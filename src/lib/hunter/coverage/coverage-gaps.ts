import type { HunterDependencies } from '../types';
import type { PopularityTier } from '@/lib/quality-gate';

export const COVERAGE_ONBOARDING_TOKENS =
  /\b(onboard|onboarding|setup|implementation|learning curve|ramp|time to value|adoption)\b/i;
export const COVERAGE_PRICING_TOKENS =
  /\b(price|pricing|cost|billing|plan|tier|seat|quota|limit|cap|overage|enterprise)\b/i;
export const COVERAGE_MIGRATION_TOKENS =
  /\b(migration|migrate|switch|switching|lock[-\s]?in|export|import|portability|data portability)\b/i;
export const COVERAGE_SUPPORT_TOKENS =
  /\b(support|docs|documentation|SLA|uptime|ticket|response time|customer success)\b/i;
const DEFAULT_MIN_ACTIONABILITY_SCORE = 58;
const DEFAULT_MIN_READER_UTILITY_SCORE = 62;

export function meetsAuthoritativeSourceThreshold(
  tier: PopularityTier,
  count: number,
  minRequired: number,
  score: number
): boolean {
  if (count >= minRequired) return true;
  if (tier === 'popular' && count >= 1 && score >= 88) return true;
  return false;
}

export function getMinActionabilityScore(): number {
  const raw =
    typeof process !== 'undefined' ? process.env.HUNTER_MIN_ACTIONABILITY_SCORE : undefined;
  const parsed = raw ? Number(raw) : NaN;
  if (!Number.isFinite(parsed)) return DEFAULT_MIN_ACTIONABILITY_SCORE;
  return Math.min(100, Math.max(0, Math.round(parsed)));
}

export function getMinReaderUtilityScore(): number {
  const raw =
    typeof process !== 'undefined' ? process.env.HUNTER_MIN_READER_UTILITY_SCORE : undefined;
  const parsed = raw ? Number(raw) : NaN;
  if (!Number.isFinite(parsed)) return DEFAULT_MIN_READER_UTILITY_SCORE;
  return Math.min(100, Math.max(0, Math.round(parsed)));
}

export function getGenerationActionabilityScore(
  generationQuality?: Record<string, unknown>
): number | null {
  const raw = generationQuality?.actionabilityScore;
  const numeric = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(numeric)) return null;
  return Math.min(100, Math.max(0, numeric));
}

export function getGenerationReaderUtilityScore(
  generationQuality?: Record<string, unknown>
): number | null {
  const raw = generationQuality?.readerUtilityScore;
  const numeric = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(numeric)) return null;
  return Math.min(100, Math.max(0, numeric));
}

export function meetsAuthoritativeDomainThreshold(
  tier: PopularityTier,
  domains: number,
  minRequired: number,
  sourceCount: number,
  score: number
): boolean {
  if (domains >= minRequired) return true;
  if (tier === 'standard' && domains >= 1 && sourceCount >= 4 && score >= 80) return true;
  return false;
}

export type CoverageDimension =
  | 'onboarding'
  | 'pricing_ceilings'
  | 'migration_risk'
  | 'support_quality';

export function detectCoverageGaps(
  analysis: any,
  knowledgeCard: any,
  generationQuality?: Record<string, unknown>
): CoverageDimension[] {
  const readClaimTexts = (claims: unknown[]): string[] =>
    claims
      .map((claim: any) => (typeof claim === 'string' ? claim : claim?.text))
      .filter(
        (text: unknown): text is string => typeof text === 'string' && text.trim().length > 0
      );
  const claimTexts = [
    ...readClaimTexts(analysis?.pros || []),
    ...readClaimTexts(analysis?.cons || []),
  ];
  const reviewContextText = [
    analysis?.reviewContext?.humanVerdict,
    analysis?.reviewContext?.userAdvocate?.originStory,
    ...(analysis?.reviewContext?.userAdvocate?.avoidIf || []),
    ...(analysis?.reviewContext?.userAdvocate?.frustrations || []),
    ...(analysis?.reviewContext?.userAdvocate?.idealFor || []),
  ]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .join(' ');
  const summaryText = typeof analysis?.summary === 'string' ? analysis.summary : '';
  const combinedText = [summaryText, ...claimTexts, reviewContextText].join('\n');

  const abstainedFields = Array.isArray((generationQuality as any)?.abstainedFields)
    ? ((generationQuality as any).abstainedFields as string[])
    : [];
  const hasReviewContext = !abstainedFields.includes('reviewContext');

  const hasOnboardingSignal =
    COVERAGE_ONBOARDING_TOKENS.test(combinedText) ||
    typeof knowledgeCard?.setup_complexity?.tier === 'string' ||
    typeof knowledgeCard?.setup_complexity?.description === 'string';
  const hasPricingSignal =
    COVERAGE_PRICING_TOKENS.test(combinedText) ||
    Array.isArray(knowledgeCard?.constraints?.limits) ||
    Array.isArray(knowledgeCard?.smp_pricing?.plans);
  const hasMigrationSignal =
    COVERAGE_MIGRATION_TOKENS.test(combinedText) ||
    Boolean(knowledgeCard?.smp_portability?.has_data_export) ||
    Array.isArray(knowledgeCard?.smp_portability?.export_formats) ||
    Array.isArray(analysis?.switchingFrom);
  const hasSupportSignal =
    COVERAGE_SUPPORT_TOKENS.test(combinedText) ||
    (hasReviewContext &&
      Array.isArray(analysis?.reviewContext?.userAdvocate?.frustrations) &&
      analysis.reviewContext.userAdvocate.frustrations.length > 0);

  const gaps: CoverageDimension[] = [];
  if (!hasOnboardingSignal) gaps.push('onboarding');
  if (!hasPricingSignal) gaps.push('pricing_ceilings');
  if (!hasMigrationSignal) gaps.push('migration_risk');
  if (!hasSupportSignal) gaps.push('support_quality');
  return gaps;
}

export async function maybeEnqueueCoverageGapRehunt(params: {
  toolName: string;
  contextTitle?: string | null;
  categorySlug?: string | null;
  analysis: any;
  knowledgeCard: any;
  generationQuality?: Record<string, unknown>;
  deps: HunterDependencies;
}): Promise<void> {
  const { toolName, contextTitle, categorySlug, analysis, knowledgeCard, generationQuality, deps } =
    params;
  const gaps = detectCoverageGaps(analysis, knowledgeCard, generationQuality);
  const minActionabilityScore = getMinActionabilityScore();
  const actionabilityScore = getGenerationActionabilityScore(generationQuality);
  const minReaderUtilityScore = getMinReaderUtilityScore();
  const readerUtilityScore = getGenerationReaderUtilityScore(generationQuality);
  const hasMissingActionability = actionabilityScore === null;
  const hasActionabilityGap =
    hasMissingActionability ||
    (actionabilityScore !== null && actionabilityScore < minActionabilityScore);
  const hasMissingReaderUtility = readerUtilityScore === null;
  const hasReaderUtilityGap =
    hasMissingReaderUtility ||
    (readerUtilityScore !== null && readerUtilityScore < minReaderUtilityScore);
  const hasCriticalGap = gaps.includes('pricing_ceilings');
  if (!hasActionabilityGap && !hasReaderUtilityGap && !hasCriticalGap && gaps.length < 2) return;

  let existingQuery = deps.supabase
    .from('hunt_queue')
    .select('id,status')
    .eq('tool_name', toolName)
    .in('status', ['pending', 'claimed', 'processing'])
    .limit(1);
  existingQuery = contextTitle
    ? existingQuery.eq('context_title', contextTitle)
    : existingQuery.is('context_title', null);
  const { data: existing } = await existingQuery;
  if (Array.isArray(existing) && existing.length > 0) {
    deps.log(
      `[Coverage Gap] Existing active queue item already present for ${toolName}${contextTitle ? ` (${contextTitle})` : ''}, skipping re-hunt enqueue`
    );
    return;
  }

  const reasonParts = [`coverage_gaps:${gaps.join(',') || 'none'}`];
  if (hasActionabilityGap) {
    reasonParts.push(`low_actionability:${actionabilityScore ?? 0}<${minActionabilityScore}`);
  }
  if (hasReaderUtilityGap) {
    reasonParts.push(`low_reader_utility:${readerUtilityScore ?? 0}<${minReaderUtilityScore}`);
  }
  const reason = reasonParts.join(';');
  const { error } = await deps.supabase.from('hunt_queue').insert({
    tool_name: toolName,
    context_title: contextTitle || null,
    category_slug: categorySlug || null,
    hunt_type: 'full',
    force_regenerate: true,
    priority: hasMissingActionability ? 96 : hasActionabilityGap ? 95 : hasCriticalGap ? 90 : 75,
    source: 'scheduled',
    requested_by: reason,
  });
  if (error) {
    deps.log(`[Coverage Gap] Failed to enqueue re-hunt: ${error.message}`);
    return;
  }
  deps.log(
    `[Coverage Gap] Enqueued re-hunt for ${toolName}${contextTitle ? ` (${contextTitle})` : ''} due to ${reason}`
  );
}
