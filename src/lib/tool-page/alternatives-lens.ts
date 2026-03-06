import type { ReviewLens } from '@/lib/tool-page/view-model';

interface ToolPageAlternativeLensLike {
  slug: string;
  pricing_type?: string | null;
  metadata?: unknown;
  specs?: unknown;
}

function hasAudienceInSpecs(
  specs: unknown,
  audience: 'individual' | 'team' | 'business' | 'enterprise'
): boolean {
  const record = specs && typeof specs === 'object' ? (specs as Record<string, unknown>) : null;
  const pricingData =
    record?.pricing_data && typeof record.pricing_data === 'object'
      ? (record.pricing_data as Record<string, unknown>)
      : null;
  const plans = Array.isArray(pricingData?.plans) ? pricingData.plans : [];
  return plans.some((plan) => {
    if (!plan || typeof plan !== 'object') return false;
    const targetAudience = (plan as Record<string, unknown>).target_audience;
    return targetAudience === audience;
  });
}

function readTargetMarket(metadata: unknown): string | null {
  const record =
    metadata && typeof metadata === 'object' ? (metadata as Record<string, unknown>) : null;
  const targetMarket = record?.target_market;
  return typeof targetMarket === 'string' ? targetMarket.toLowerCase() : null;
}

function scoreAlternativeForLens(
  lens: ReviewLens,
  alternative: ToolPageAlternativeLensLike
): number {
  if (lens === 'general') return 0;
  const pricingType = (alternative.pricing_type || '').toLowerCase();
  const targetMarket = readTargetMarket(alternative.metadata);
  const specs = alternative.specs;

  if (lens === 'personal') {
    let score = 0;
    if (pricingType === 'free' || pricingType === 'freemium') score += 4;
    if (targetMarket === 'consumer' || targetMarket === 'prosumer') score += 3;
    if (hasAudienceInSpecs(specs, 'individual')) score += 3;
    return score;
  }

  if (lens === 'startup') {
    let score = 0;
    if (pricingType === 'freemium' || pricingType === 'paid') score += 3;
    if (targetMarket === 'prosumer' || targetMarket === 'business') score += 3;
    if (hasAudienceInSpecs(specs, 'team')) score += 3;
    if (hasAudienceInSpecs(specs, 'business')) score += 1;
    return score;
  }

  let score = 0;
  if (pricingType === 'enterprise') score += 4;
  if (targetMarket === 'enterprise' || targetMarket === 'business') score += 3;
  if (hasAudienceInSpecs(specs, 'enterprise')) score += 3;
  if (hasAudienceInSpecs(specs, 'business')) score += 1;
  return score;
}

export function rankAlternativesForLens<T extends ToolPageAlternativeLensLike>(
  alternatives: T[],
  activeReviewLens: ReviewLens
): T[] {
  if (activeReviewLens === 'general') return alternatives;
  return [...alternatives]
    .map((alternative, index) => ({
      alternative,
      index,
      score: scoreAlternativeForLens(activeReviewLens, alternative),
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((entry) => entry.alternative);
}
