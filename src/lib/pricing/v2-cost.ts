import type {
  PricingV2Plan,
  PricingV2PriceComponent,
  PricingV2ProductPricing,
  PricingV2Tier,
} from '@/types/database';

export type PricingV2ScenarioCadence = 'monthly' | 'annual';

export type PricingV2FxPolicy =
  | { mode: 'same_currency_only' }
  | {
      mode: 'fx_convert';
      provider: 'ecb' | 'openexchangerates' | 'custom';
      fx_rate_used_at: string;
      rates: Record<string, number>;
    };

export type PricingV2OneTimePolicy =
  | { mode: 'exclude' }
  | { mode: 'amortize'; months: number };

export interface PricingV2Scenario {
  currency: string;
  cadence: PricingV2ScenarioCadence;
  seats?: number;
  meters: Record<string, number>;
  add_ons?: string[];
  fx_policy?: PricingV2FxPolicy;
  one_time_policy?: PricingV2OneTimePolicy;
}

export interface PricingV2ComponentBreakdown {
  component_id: string;
  meter_id: string | null;
  quantity: number;
  cost: number;
  explain: string;
}

export interface PricingV2PlanBreakdown {
  plan_id: string;
  cadence: PricingV2ScenarioCadence;
  total: number | null;
  currency: string;
  components: PricingV2ComponentBreakdown[];
  notes: string[];
}

function toMonthly(amount: number, cadence: 'monthly' | 'annual' | 'one_time'): number {
  if (cadence === 'monthly') return amount;
  if (cadence === 'annual') return amount / 12;
  return amount;
}

function getTierPrice(tiers: PricingV2Tier[], quantity: number, graduated: boolean): number {
  if (tiers.length === 0) return 0;

  if (!graduated) {
    let previousCap = 0;
    for (const tier of tiers) {
      const cap = tier.up_to ?? Infinity;
      if (quantity > previousCap && quantity <= cap) {
        return (tier.unit_price ?? 0) * quantity;
      }
      previousCap = cap;
    }
    const lastTier = tiers[tiers.length - 1];
    return (lastTier.unit_price ?? 0) * quantity;
  }

  let remaining = quantity;
  let previousCap = 0;
  let total = 0;
  for (const tier of tiers) {
    const cap = tier.up_to ?? Infinity;
    const tierSpan = Math.max(Math.min(remaining, cap - previousCap), 0);
    if (tierSpan > 0) {
      total += tierSpan * (tier.unit_price ?? 0);
      remaining -= tierSpan;
    }
    previousCap = cap;
    if (remaining <= 0) break;
  }
  return total;
}

function getPackageCost(component: PricingV2PriceComponent, quantity: number): number {
  const tiers = component.tiers ?? [];
  const tier = tiers[0];
  if (!tier?.package_size || !tier.package_price) return 0;
  const packages = quantity / tier.package_size;
  const mode = component.rounding_mode ?? 'ceil';
  const rounded =
    mode === 'floor' ? Math.floor(packages) : mode === 'nearest' ? Math.round(packages) : Math.ceil(packages);
  return rounded * tier.package_price;
}

function convertCurrency(amount: number, from: string, to: string, fxPolicy: PricingV2FxPolicy): number {
  if (from === to) return amount;
  if (fxPolicy.mode === 'same_currency_only') {
    throw new Error(`Currency mismatch: ${from} vs ${to}`);
  }
  const fromRate = fxPolicy.rates[from];
  const toRate = fxPolicy.rates[to];
  if (!fromRate || !toRate) {
    throw new Error(`Missing FX rate for ${from} or ${to}`);
  }
  return (amount / fromRate) * toRate;
}

function computeComponentCost(component: PricingV2PriceComponent, quantity: number): number {
  const minUnits = component.min_units ?? 0;
  const includedUnits = component.included_units ?? 0;
  const billableUnits = Math.max(Math.max(quantity, minUnits) - includedUnits, 0);

  switch (component.rate_type) {
    case 'flat':
      return component.flat_price ?? 0;
    case 'unit':
      return (component.unit_price ?? 0) * billableUnits;
    case 'tiered_graduated':
      return getTierPrice(component.tiers ?? [], billableUnits, true);
    case 'tiered_volume':
      return getTierPrice(component.tiers ?? [], billableUnits, false);
    case 'package':
      return getPackageCost(component, billableUnits);
    case 'percentage': {
      const base = billableUnits * (component.percent_rate ?? 0);
      const minBound = component.min_charge ?? base;
      const maxBound = component.max_charge ?? base;
      return Math.min(Math.max(base, minBound), maxBound);
    }
    default:
      return 0;
  }
}

function getMeterQuantity(component: PricingV2PriceComponent, scenario: PricingV2Scenario): number {
  if (component.meter_id === 'seat') return scenario.seats ?? scenario.meters.seat ?? 1;
  if (!component.meter_id) return 1;
  return scenario.meters[component.meter_id] ?? 0;
}

export function computePricingV2ForPlan(
  pricing: PricingV2ProductPricing,
  plan: PricingV2Plan,
  scenario: PricingV2Scenario
): PricingV2PlanBreakdown {
  const notes: string[] = [];
  if (plan.is_enterprise) {
    return {
      plan_id: plan.id,
      cadence: scenario.cadence,
      total: null,
      currency: scenario.currency,
      components: [],
      notes: ['Custom quote / contact sales'],
    };
  }

  const fxPolicy = scenario.fx_policy ?? { mode: 'same_currency_only' as const };
  const oneTimePolicy = scenario.one_time_policy ?? { mode: 'exclude' as const };
  const selectedBilling = plan.billing_options.find((option) => option.cadence === scenario.cadence);
  if (!selectedBilling) {
    return {
      plan_id: plan.id,
      cadence: scenario.cadence,
      total: null,
      currency: scenario.currency,
      components: [],
      notes: ['No pricing for selected billing cadence'],
    };
  }

  const selectedAddons = new Set(scenario.add_ons ?? []);
  const components: PricingV2ComponentBreakdown[] = [];
  let total = 0;

  for (const component of selectedBilling.price_components) {
    if (component.is_optional && !selectedAddons.has(component.id)) continue;
    const hasDependency = (component.requires_component_ids ?? []).every((id) =>
      selectedBilling.price_components.some((candidate) => candidate.id === id)
    );
    if (!hasDependency) {
      notes.push(`Skipped ${component.id}: missing dependency`);
      continue;
    }

    if (component.cadence === 'one_time') {
      if (oneTimePolicy.mode === 'exclude') {
        notes.push(`Excluded one-time component ${component.id}`);
        continue;
      }
      const amortizeMonths = oneTimePolicy.mode === 'amortize' ? oneTimePolicy.months : 0;
      if (amortizeMonths <= 0) {
        notes.push(`Invalid amortization period for ${component.id}`);
        continue;
      }
    }

    const quantity = getMeterQuantity(component, scenario);
    let componentCost = computeComponentCost(component, quantity);
    if (component.cadence === 'annual') {
      componentCost = toMonthly(componentCost, 'annual');
    } else if (component.cadence === 'one_time') {
      const amortizeMonths = oneTimePolicy.mode === 'amortize' ? oneTimePolicy.months : 1;
      componentCost = componentCost / amortizeMonths;
    }

    if (component.currency !== scenario.currency) {
      componentCost = convertCurrency(componentCost, component.currency, scenario.currency, fxPolicy);
    }

    total += componentCost;
    components.push({
      component_id: component.id,
      meter_id: component.meter_id,
      quantity,
      cost: componentCost,
      explain: `${component.rate_type} on ${component.meter_id ?? 'base'}`,
    });
  }

  return {
    plan_id: plan.id,
    cadence: scenario.cadence,
    total,
    currency: scenario.currency,
    components,
    notes,
  };
}

export function computeBestPlanPricingV2(
  pricing: PricingV2ProductPricing,
  scenario: PricingV2Scenario,
  options?: { baseline_mode?: 'any' | 'paid_entry' }
): PricingV2PlanBreakdown | null {
  const baselineMode = options?.baseline_mode ?? 'any';
  const eligiblePlans =
    baselineMode === 'paid_entry' ? pricing.plans.filter((plan) => !plan.is_free) : pricing.plans;

  if (eligiblePlans.length === 0) return null;

  const candidates = pricing.plans
    .filter((plan) => eligiblePlans.some((eligible) => eligible.id === plan.id))
    .map((plan) => computePricingV2ForPlan(pricing, plan, scenario))
    .filter((result) => result.total != null) as PricingV2PlanBreakdown[];

  if (candidates.length === 0) return null;
  return candidates.reduce((best, current) => (current.total! < best.total! ? current : best));
}
