import type { SMPPricingData } from '@/types/database';

export interface CostBreakdown {
  cost: number | null;
  planName?: string;
  planId?: string;
  model?: SMPPricingData['model'];
  billingCycle: 'monthly' | 'annual';
  notes: string[];
}

function toMonthly(amount: number, billingCycle: 'monthly' | 'annual'): number {
  return billingCycle === 'monthly' ? amount : amount / 12;
}

export function computeMonthlyCost(
  pricingData: SMPPricingData | null,
  userCount: number,
  billingCycle: 'monthly' | 'annual' = 'monthly'
): CostBreakdown {
  const notes: string[] = [];
  if (!pricingData || pricingData.plans.length === 0) {
    return { cost: null, billingCycle, notes: ['No pricing data'] };
  }

  // Filter to valid, non-enterprise plans
  const validPlans = pricingData.plans.filter((plan) => {
    if (plan.is_enterprise) return false;
    const basePrice = billingCycle === 'monthly' ? plan.price_monthly : plan.price_annual;
    if (basePrice === null || basePrice <= 0) return false;
    if (plan.max_users !== null && userCount > plan.max_users) return false;
    if (pricingData.min_seats && userCount < pricingData.min_seats) return false;
    return true;
  });

  if (validPlans.length === 0) {
    return { cost: null, billingCycle, notes: ['No valid plans for this team size'] };
  }

  const costs = validPlans.map((plan) => {
    const basePrice = billingCycle === 'monthly' ? plan.price_monthly! : plan.price_annual!;

    let perUnit = plan.price_per_unit || basePrice;
    let includedUnits = plan.included_units || 0;
    let minSeats = pricingData.min_seats || 0;

    // Seat type override (assume all members)
    const seatType = pricingData.seat_types?.find((s) => s.type === 'member');
    if (seatType?.price_per_unit) perUnit = seatType.price_per_unit;
    if (seatType?.free_units) includedUnits = Math.max(includedUnits, seatType.free_units);

    // Volume tier override
    if (pricingData.volume_tiers && pricingData.volume_tiers.length > 0) {
      const tier = pricingData.volume_tiers.find(
        (t) => userCount >= t.min_units && (t.max_units === null || userCount <= t.max_units)
      );
      if (tier?.price_per_unit) perUnit = tier.price_per_unit;
    }

    let cost: number;
    if (pricingData.model === 'flat') {
      cost = toMonthly(basePrice, billingCycle);
    } else if (pricingData.model === 'free') {
      cost = 0;
    } else if (pricingData.model === 'tiered') {
      cost = toMonthly(basePrice, billingCycle);
    } else {
      const effectiveUsers = Math.max(userCount, minSeats);
      const billable = Math.max(effectiveUsers - includedUnits, 0);
      cost = billable * perUnit;
      cost = toMonthly(cost, billingCycle);
    }

    return { plan, cost };
  });

  const cheapest = costs.reduce((a, b) => (a.cost < b.cost ? a : b));
  if (pricingData.min_seats) notes.push(`Min seats: ${pricingData.min_seats}`);
  if (pricingData.seat_types?.length) notes.push('Assumes all paid members');
  if (pricingData.volume_tiers?.length) notes.push('Volume tier applied if eligible');
  if (pricingData.add_ons?.length) notes.push('Add-ons not included');
  if (pricingData.usage_meters?.length) notes.push('Usage overages not included');

  return {
    cost: cheapest.cost,
    planName: cheapest.plan.name,
    planId: cheapest.plan.id,
    model: pricingData.model,
    billingCycle,
    notes,
  };
}
