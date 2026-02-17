import type {
  PricingValidationStatus,
  PricingV2EvidenceRef,
  PricingV2PriceComponent,
  PricingV2ProductPricing,
  PricingV2Tier,
  SMPPlanData,
  SMPPricingData,
} from '@/types/database';
import { getDefaultPricingMeters, resolvePricingMeter } from './v2-meter-registry';

function makeEvidence(url: string | null | undefined, claimId: string): PricingV2EvidenceRef[] {
  if (!url) return [];
  return [
    {
      url,
      source_type: 'official',
      retrieved_at: new Date().toISOString(),
      claim_id: claimId,
      policy_snapshot: {
        acquisition_mode: 'SCRAPE_ALLOWED',
        llm_ingestion_allowed: 'YES_LIMITED',
        policy_version: 'pricing-v2-mapper-default',
      },
    },
  ];
}

function mapPlanPricingComponents(
  pricingData: SMPPricingData,
  plan: SMPPlanData,
  cadence: 'monthly' | 'annual',
  evidence: PricingV2EvidenceRef[]
): PricingV2PriceComponent[] {
  const components: PricingV2PriceComponent[] = [];
  const hasCadencePrice =
    cadence === 'monthly' ? plan.price_monthly != null : plan.price_annual != null;
  if (!hasCadencePrice) return components;

  const planPrice =
    cadence === 'monthly' ? (plan.price_monthly ?? null) : (plan.price_annual ?? null);
  const resolvedMeter = resolvePricingMeter(plan.scaling_unit ?? null);
  const meterId =
    pricingData.model === 'ad_spend'
      ? 'ad_spend'
      : pricingData.model === 'flat' || pricingData.model === 'free'
        ? null
        : resolvedMeter?.id || 'request';

  const validationStatus: PricingValidationStatus = 'verified';
  const baseComponent: PricingV2PriceComponent = {
    id: `${plan.id}-${cadence}-base`,
    component_kind: 'base',
    meter_id: meterId,
    rate_type: 'flat',
    cadence,
    timing: 'in_advance',
    currency: pricingData.currency,
    min_units: pricingData.min_seats ?? null,
    included_units: plan.included_units ?? null,
    is_optional: false,
    flat_price: planPrice,
    evidence,
    notes: null,
    validation_status: validationStatus,
  };

  if (pricingData.model === 'free') {
    components.push({
      ...baseComponent,
      meter_id: null,
      flat_price: 0,
      notes: 'Free tier',
    });
    return components;
  }

  if (pricingData.model === 'flat') {
    components.push(baseComponent);
    return components;
  }

  if (pricingData.model === 'ad_spend') {
    components.push({
      ...baseComponent,
      rate_type: 'percentage',
      meter_id: 'ad_spend',
      flat_price: null,
      percent_rate: plan.variable_price ?? null,
      min_charge: planPrice,
      max_charge: null,
      notes: plan.variable_logic_desc || 'Percentage of ad spend',
      needs_review: plan.variable_price == null,
      validation_status: plan.variable_price == null ? 'inferred' : 'verified',
    });
    return components;
  }

  if (
    pricingData.model === 'tiered' &&
    pricingData.volume_tiers &&
    pricingData.volume_tiers.length > 0
  ) {
    const tiers: PricingV2Tier[] = pricingData.volume_tiers.map((tier) => ({
      up_to: tier.max_units ?? null,
      unit_price: tier.price_per_unit,
    }));
    components.push({
      ...baseComponent,
      rate_type: 'tiered_graduated',
      flat_price: null,
      unit_price: null,
      tiers,
      notes: 'Tier semantics inferred as graduated; verify source semantics',
      needs_review: true,
      validation_status: 'conflicted',
    });
    return components;
  }

  const unitPrice = plan.price_per_unit ?? planPrice ?? null;
  components.push({
    ...baseComponent,
    rate_type: 'unit',
    flat_price: null,
    unit_price: unitPrice,
    notes: null,
    validation_status: unitPrice == null ? 'inferred' : 'verified',
    needs_review: unitPrice == null,
  });

  if (pricingData.usage_meters?.length) {
    for (const usage of pricingData.usage_meters) {
      const usageMeter = resolvePricingMeter(usage.unit) ?? {
        id: usage.unit,
        label: usage.unit,
        unit_ucum: `{${usage.unit}}`,
        category: 'usage' as const,
      };
      components.push({
        id: `${plan.id}-${cadence}-${usageMeter.id}-overage`,
        component_kind: 'overage',
        meter_id: usageMeter.id,
        rate_type: 'unit',
        cadence,
        timing: 'in_arrears',
        currency: pricingData.currency,
        min_units: null,
        included_units: usage.included_units ?? null,
        is_optional: false,
        unit_price: usage.price_per_unit,
        overage_mode: 'unit_overage',
        evidence,
        notes: 'Usage overage component',
        validation_status: 'verified',
      });
    }
  }

  return components;
}

export function mapSmpPricingToV2(
  productId: string,
  pricingData: SMPPricingData | null | undefined
): PricingV2ProductPricing | null {
  if (!pricingData) return null;

  const officialUrl = pricingData.pricing_page_url ?? null;
  const evidence = makeEvidence(officialUrl, `${productId}-pricing`);
  const plans = pricingData.plans ?? [];
  if (plans.length === 0) return null;

  const mappedPlans = plans.map((plan) => {
    const monthlyComponents = mapPlanPricingComponents(pricingData, plan, 'monthly', evidence);
    const annualComponents = mapPlanPricingComponents(pricingData, plan, 'annual', evidence);
    const billingOptions = [];
    if (monthlyComponents.length > 0) {
      billingOptions.push({ cadence: 'monthly' as const, price_components: monthlyComponents });
    }
    if (annualComponents.length > 0) {
      billingOptions.push({ cadence: 'annual' as const, price_components: annualComponents });
    }

    const mappedPlan = {
      id: plan.id,
      name: plan.name,
      is_free: (plan.price_monthly ?? null) === 0 && (plan.price_annual ?? null) === 0,
      is_enterprise: plan.is_enterprise,
      billing_options: billingOptions,
      contract_terms: {
        annual_only: !plan.price_monthly && !!plan.price_annual,
      },
      evidence,
    };
    return mappedPlan;
  });
  const filteredPlans = mappedPlans.filter(
    (plan) => plan.is_enterprise || plan.is_free || plan.billing_options.length > 0
  );
  if (filteredPlans.length === 0) return null;

  const meters = getDefaultPricingMeters();
  for (const plan of plans) {
    const resolved = resolvePricingMeter(plan.scaling_unit ?? null);
    if (resolved && !meters.some((meter) => meter.id === resolved.id)) {
      meters.push(resolved);
    }
  }
  for (const usage of pricingData.usage_meters ?? []) {
    const resolved = resolvePricingMeter(usage.unit) ?? {
      id: usage.unit,
      label: usage.unit,
      unit_ucum: `{${usage.unit}}`,
      category: 'usage' as const,
    };
    if (!meters.some((meter) => meter.id === resolved.id)) {
      meters.push(resolved);
    }
  }

  const confidence: 'high' | 'med' | 'low' =
    pricingData.confidence === 'medium' ? 'med' : (pricingData.confidence ?? 'low');

  return {
    product_id: productId,
    official_pricing_url: officialUrl,
    currency_default: pricingData.currency,
    meters,
    plans: filteredPlans,
    last_verified_at: pricingData.last_verified ?? null,
    confidence,
    conflicts: [],
  };
}
