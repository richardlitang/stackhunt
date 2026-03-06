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
  if (activeReviewLens === 'general') return plans;
  const lensKey = activeReviewLens;
  const matched = plans.filter((plan) => derivePlanLensTags(plan).includes(lensKey));
  return matched.length > 0 ? matched : plans;
}
