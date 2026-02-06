import type { SMPPricingData } from '@/types/database';
import { getScalingCategory } from './display';

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

/**
 * Compute monthly cost for a given quantity (users, contacts, etc.)
 *
 * @param pricingData - The pricing data from the tool
 * @param quantity - The quantity to calculate for (users, contacts, GB, etc.)
 * @param billingCycle - Monthly or annual billing
 * @returns Cost breakdown with the cheapest valid plan
 */
export function computeMonthlyCost(
  pricingData: SMPPricingData | null,
  quantity: number,
  billingCycle: 'monthly' | 'annual' = 'monthly'
): CostBreakdown {
  const notes: string[] = [];
  if (!pricingData || pricingData.plans.length === 0) {
    return { cost: null, billingCycle, notes: ['No pricing data'] };
  }

  // Detect the scaling category to understand what "quantity" means
  const primaryUnit = pricingData.plans[0]?.scaling_unit || null;
  const scalingCategory = getScalingCategory(primaryUnit);

  // Filter to valid, non-enterprise plans
  const validPlans = pricingData.plans.filter((plan) => {
    if (plan.is_enterprise) return false;
    const basePrice =
      billingCycle === 'monthly' ? plan.price_monthly ?? null : plan.price_annual ?? null;
    if (basePrice === null || basePrice <= 0) return false;

    // For team-based pricing, check max_users
    if (scalingCategory === 'team') {
      const maxUsers = plan.max_users ?? null;
      if (maxUsers !== null && quantity > maxUsers) return false;
      if (pricingData.min_seats && quantity < pricingData.min_seats) return false;
    }

    // For audience-based (contacts), check included_units as the tier limit
    // Plans with higher included_units are for larger contact lists
    if (scalingCategory === 'audience' && plan.included_units != null) {
      // This plan is valid if quantity is within its included units
      // (we'll pick the cheapest one that fits)
      if (quantity > plan.included_units) return false;
    }

    return true;
  });

  if (validPlans.length === 0) {
    const unitLabel = scalingCategory === 'audience' ? 'contact list' : 'team size';
    return { cost: null, billingCycle, notes: [`No valid plans for this ${unitLabel}`] };
  }

  const costs = validPlans.map((plan) => {
    const basePrice = (billingCycle === 'monthly' ? plan.price_monthly : plan.price_annual) ?? 0;

    let perUnit = plan.price_per_unit || basePrice;
    let includedUnits = plan.included_units || 0;
    let minSeats = pricingData.min_seats || 0;

    // Seat type override (assume all members)
    const seatType = pricingData.seat_types?.find((s) => s.type === 'member');
    if (seatType?.price_per_unit) perUnit = seatType.price_per_unit;
    if (seatType?.free_units) includedUnits = Math.max(includedUnits, seatType.free_units);

    // Volume tier override
    if (pricingData.volume_tiers && pricingData.volume_tiers.length > 0) {
      const tier = pricingData.volume_tiers.find((t) => {
        const maxUnits = t.max_units ?? null;
        return quantity >= t.min_units && (maxUnits === null || quantity <= maxUnits);
      });
      if (tier?.price_per_unit) perUnit = tier.price_per_unit;
    }

    let cost: number;
    if (pricingData.model === 'flat') {
      // Flat rate - same price regardless of quantity
      cost = toMonthly(basePrice, billingCycle);
    } else if (pricingData.model === 'free') {
      cost = 0;
    } else if (pricingData.model === 'tiered') {
      // Tiered pricing - base price includes up to X units (contacts, users, etc.)
      // For contact-based tools like Mailchimp, this is the plan price for that tier
      cost = toMonthly(basePrice, billingCycle);
    } else {
      // Per-seat/per-unit pricing - calculate based on quantity
      const effectiveQuantity = Math.max(quantity, minSeats);
      const billable = Math.max(effectiveQuantity - includedUnits, 0);
      cost = billable * perUnit;
      cost = toMonthly(cost, billingCycle);
    }

    return { plan, cost };
  });

  const cheapest = costs.reduce((a, b) => (a.cost < b.cost ? a : b));

  // Add relevant notes
  if (pricingData.min_seats) notes.push(`Min seats: ${pricingData.min_seats}`);
  if (pricingData.seat_types?.length) notes.push('Assumes all paid members');
  if (pricingData.volume_tiers?.length) notes.push('Volume tier applied if eligible');
  if (pricingData.add_ons?.length) notes.push('Add-ons not included');
  if (pricingData.usage_meters?.length) notes.push('Usage overages not included');
  if (scalingCategory === 'audience' && cheapest.plan.included_units) {
    notes.push(`Up to ${cheapest.plan.included_units.toLocaleString()} contacts included`);
  }

  return {
    cost: cheapest.cost,
    planName: cheapest.plan.name,
    planId: cheapest.plan.id,
    model: pricingData.model,
    billingCycle,
    notes,
  };
}
