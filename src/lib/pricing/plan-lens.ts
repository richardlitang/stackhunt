import type { SMPPricingData } from '@/lib/knowledge-card';

export type PricingReviewLens = 'general' | 'personal' | 'startup' | 'enterprise';
export type PricingTargetAudience = 'individual' | 'team' | 'business' | 'enterprise';

type LensScopedPlanLike = {
  name?: string | null;
  is_enterprise?: boolean | null;
  includes_sso?: boolean | null;
  includes_sla?: boolean | null;
  includes_priority_support?: boolean | null;
  price_monthly?: number | null;
  price_annual?: number | null;
  target_audience?: PricingTargetAudience | null;
  works_for_lenses?: Array<'personal' | 'startup' | 'enterprise'> | null;
};

const INDIVIDUAL_PLAN_TOKENS = /\b(free|personal|individual|solo|starter)\b/i;
const STARTUP_PLAN_TOKENS = /\b(team|startup|pro|growth)\b/i;
const BUSINESS_PLAN_TOKENS = /\b(business|company|scale)\b/i;
const ENTERPRISE_PLAN_TOKENS = /\b(enterprise|custom|contact sales)\b/i;
const ENTERPRISE_FEATURE_TOKENS = /\b(sso|scim|audit|compliance|governance|sla)\b/i;

function scorePlanForLens(
  plan: LensScopedPlanLike,
  lens: Exclude<PricingReviewLens, 'general'>
): number {
  const tags = derivePlanLensTags(plan);
  const audience = inferPlanTargetAudience(plan);
  const name = (plan.name || '').trim();
  let score = 0;

  if (tags.includes(lens)) score += 40;

  if (lens === 'personal') {
    if (audience === 'individual') score += 28;
    if (INDIVIDUAL_PLAN_TOKENS.test(name)) score += 16;
    if (plan.price_monthly === 0 || (plan.price_monthly == null && plan.price_annual === 0)) {
      score += 10;
    }
    if (plan.is_enterprise) score -= 30;
  }

  if (lens === 'startup') {
    if (audience === 'team') score += 28;
    if (audience === 'business') score += 18;
    if (STARTUP_PLAN_TOKENS.test(name)) score += 16;
    if (BUSINESS_PLAN_TOKENS.test(name)) score += 8;
    if (plan.is_enterprise) score -= 10;
  }

  if (lens === 'enterprise') {
    if (audience === 'enterprise') score += 30;
    if (audience === 'business') score += 14;
    if (ENTERPRISE_PLAN_TOKENS.test(name)) score += 16;
    if (
      plan.is_enterprise ||
      plan.includes_sso ||
      plan.includes_sla ||
      plan.includes_priority_support
    ) {
      score += 18;
    }
    if (ENTERPRISE_FEATURE_TOKENS.test(name)) score += 12;
  }

  return score;
}

export function inferPlanTargetAudience(plan: LensScopedPlanLike): PricingTargetAudience | null {
  if (
    plan.target_audience === 'individual' ||
    plan.target_audience === 'team' ||
    plan.target_audience === 'business' ||
    plan.target_audience === 'enterprise'
  ) {
    return plan.target_audience;
  }

  const name = (plan.name || '').trim();
  if (plan.is_enterprise || ENTERPRISE_PLAN_TOKENS.test(name)) return 'enterprise';
  if (BUSINESS_PLAN_TOKENS.test(name)) return 'business';
  if (STARTUP_PLAN_TOKENS.test(name)) return 'team';
  if (
    INDIVIDUAL_PLAN_TOKENS.test(name) ||
    (plan.price_monthly === 0 && (plan.price_annual === 0 || plan.price_annual == null))
  ) {
    return 'individual';
  }
  if (plan.includes_sso || plan.includes_sla || plan.includes_priority_support) return 'enterprise';
  return null;
}

export function derivePlanLensTags(
  plan: LensScopedPlanLike
): Array<'personal' | 'startup' | 'enterprise'> {
  const existing = Array.isArray(plan.works_for_lenses)
    ? plan.works_for_lenses.filter(
        (lens): lens is 'personal' | 'startup' | 'enterprise' =>
          lens === 'personal' || lens === 'startup' || lens === 'enterprise'
      )
    : [];
  if (existing.length > 0) return Array.from(new Set(existing));

  const audience = inferPlanTargetAudience(plan);
  if (audience === 'individual') return ['personal'];
  if (audience === 'team') return ['startup'];
  if (audience === 'business') return ['startup', 'enterprise'];
  if (audience === 'enterprise') return ['enterprise'];
  return ['startup'];
}

export function enrichSmpPricingForLens(
  pricingData: SMPPricingData | null | undefined
): SMPPricingData | null {
  if (!pricingData || !Array.isArray(pricingData.plans)) return pricingData || null;
  return {
    ...pricingData,
    plans: pricingData.plans.map((plan) => {
      const targetAudience = inferPlanTargetAudience(plan);
      return {
        ...plan,
        target_audience: targetAudience || plan.target_audience || null,
        works_for_lenses: derivePlanLensTags(plan),
      };
    }),
  };
}

export function filterPlansForLens<T extends LensScopedPlanLike>(
  plans: T[],
  activeReviewLens: PricingReviewLens
): T[] {
  return filterPlansForLensWithMeta(plans, activeReviewLens).plans;
}

export function filterPlansForLensWithMeta<T extends LensScopedPlanLike>(
  plans: T[],
  activeReviewLens: PricingReviewLens
): { plans: T[]; usedFallback: boolean } {
  if (activeReviewLens === 'general') return { plans, usedFallback: false };
  const lensKey = activeReviewLens;
  const matched = plans.filter((plan) => derivePlanLensTags(plan).includes(lensKey));
  if (matched.length > 0) return { plans: matched, usedFallback: false };

  const rankedFallback = plans
    .map((plan, index) => ({ plan, index, score: scorePlanForLens(plan, lensKey) }))
    .sort((a, b) => b.score - a.score || a.index - b.index);
  const positive = rankedFallback.filter((entry) => entry.score > 0).map((entry) => entry.plan);
  if (positive.length === 0) return { plans, usedFallback: true };

  const fallbackCount = Math.min(
    plans.length,
    Math.max(1, Math.min(3, Math.ceil(plans.length / 2)))
  );
  return { plans: positive.slice(0, fallbackCount), usedFallback: true };
}
