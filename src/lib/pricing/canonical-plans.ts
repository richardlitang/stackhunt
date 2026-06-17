import { slugify } from '@/lib/hunter/utils';
import { derivePlanLensTags, inferPlanTargetAudience } from '@/lib/pricing/plan-lens';

/**
 * Infer target_market from pricing plans
 * Logic:
 * - Has business/enterprise plans → 'business'
 * - Only individual/free plans → 'consumer'
 * - Has both individual AND team/business → 'prosumer'
 */
export function inferTargetMarket(
  plans: any[]
): 'consumer' | 'prosumer' | 'business' | 'enterprise' {
  if (!plans || plans.length === 0) return 'business';

  const audiences = plans.map((p) => p.target_audience).filter(Boolean);

  const hasEnterprise = audiences.includes('enterprise');
  const hasBusiness = audiences.includes('business');
  const hasTeam = audiences.includes('team');
  const hasIndividual = audiences.includes('individual');

  if (hasEnterprise && !hasIndividual) return 'enterprise';
  if ((hasBusiness || hasEnterprise) && !hasIndividual) return 'business';
  if (hasIndividual && (hasTeam || hasBusiness || hasEnterprise)) return 'prosumer';
  if (hasIndividual && !hasTeam && !hasBusiness && !hasEnterprise) return 'consumer';
  return 'business';
}

export function buildCanonicalPricingPlans(pricingData: any): {
  entities: Array<{
    plan_id: string;
    plan_name: string;
    audience?: string | null;
    works_for_lenses?: Array<'personal' | 'startup' | 'enterprise'> | null;
    seat_type?: string | null;
    price_monthly?: number | null;
    price_annual?: number | null;
    source_url?: string | null;
    currency?: string | null;
  }>;
  conflicts: Array<{ key: string; values: unknown[]; urls: string[] }>;
} {
  const plans = Array.isArray(pricingData?.plans) ? pricingData.plans : [];
  const sourceUrl: string | null =
    typeof pricingData?.pricing_page_url === 'string' ? pricingData.pricing_page_url : null;
  const currency: string | null =
    typeof pricingData?.currency === 'string' ? pricingData.currency : null;

  const entities = plans.map((plan: any) => {
    const explicitLensTags = Array.isArray(plan?.works_for_lenses)
      ? plan.works_for_lenses.filter(
          (value: unknown) => value === 'personal' || value === 'startup' || value === 'enterprise'
        )
      : [];
    const inferredAudience = inferPlanTargetAudience(plan);
    return {
      plan_id: String(plan?.id || slugify(String(plan?.name || 'plan'))),
      plan_name: String(plan?.name || 'Unknown'),
      audience:
        typeof plan?.target_audience === 'string' ? plan.target_audience : inferredAudience || null,
      works_for_lenses: explicitLensTags.length > 0 ? explicitLensTags : derivePlanLensTags(plan),
      seat_type: typeof plan?.scaling_unit === 'string' ? plan.scaling_unit : null,
      price_monthly: typeof plan?.price_monthly === 'number' ? plan.price_monthly : null,
      price_annual: typeof plan?.price_annual === 'number' ? plan.price_annual : null,
      source_url: sourceUrl,
      currency,
    };
  });

  const byCanonicalPlan = new Map<
    string,
    { monthly: Set<number>; annual: Set<number>; urls: Set<string> }
  >();
  for (const entity of entities) {
    const key = `${entity.plan_id}|${(entity.audience || 'unknown').toLowerCase()}`;
    if (!byCanonicalPlan.has(key)) {
      byCanonicalPlan.set(key, {
        monthly: new Set<number>(),
        annual: new Set<number>(),
        urls: new Set<string>(),
      });
    }
    const bucket = byCanonicalPlan.get(key)!;
    if (typeof entity.price_monthly === 'number') bucket.monthly.add(entity.price_monthly);
    if (typeof entity.price_annual === 'number') bucket.annual.add(entity.price_annual);
    if (entity.source_url) bucket.urls.add(entity.source_url);
  }

  const conflicts: Array<{ key: string; values: unknown[]; urls: string[] }> = [];
  for (const [key, bucket] of byCanonicalPlan.entries()) {
    if (bucket.monthly.size > 1) {
      conflicts.push({
        key: `${key}:price_monthly`,
        values: Array.from(bucket.monthly.values()),
        urls: Array.from(bucket.urls.values()),
      });
    }
    if (bucket.annual.size > 1) {
      conflicts.push({
        key: `${key}:price_annual`,
        values: Array.from(bucket.annual.values()),
        urls: Array.from(bucket.urls.values()),
      });
    }
  }

  return { entities, conflicts };
}

export function mapSmpPricingToPricingModel(
  model?: string | null
): 'free' | 'freemium' | 'paid' | 'enterprise' | 'open_source' | null {
  if (!model) return null;
  if (model === 'free') return 'free';
  if (model === 'contact_sales') return 'enterprise';
  if (model === 'open_source') return 'open_source';
  return 'paid';
}

export function isPricingBiasedDerivedCon(text: string): boolean {
  return (
    /^Usage limits apply:/i.test(text) ||
    /^Additional cost trigger:/i.test(text) ||
    /^Minimum seat requirement:/i.test(text) ||
    /^Implementation fee required/i.test(text) ||
    /^Annual billing only$/i.test(text) ||
    /^Pricing requires contacting sales$/i.test(text) ||
    /^No self-serve free tier/i.test(text) ||
    /^No self-serve free trial/i.test(text)
  );
}
