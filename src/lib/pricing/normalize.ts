/**
 * Pricing Normalization Layer
 *
 * Converts structured SMPPricingData into comparable, normalized metrics.
 * This is the single source of truth for pricing comparisons.
 *
 * Philosophy:
 * - Always show the TRUE minimum cost (accounting for min_seats)
 * - Compare like-for-like tiers (individual vs individual, team vs team)
 * - Be transparent about caveats (minimums, commitments)
 */

import type { SMPPricingData, SMPPlanData } from '@/types/database';

// Comparable tier for apples-to-apples comparison
export type ComparisonTier = 'individual' | 'team' | 'business' | 'enterprise';

export interface NormalizedPricing {
  // Effective minimum costs (what you'll actually pay)
  effective_starting_price_monthly: number | null;
  effective_starting_price_annual: number | null;

  // Which plan/tier we're using for comparison
  comparison_tier: ComparisonTier;
  comparison_plan_id: string | null;
  comparison_plan_name: string | null;

  // Normalized per-unit pricing (for cost calculators)
  normalized_price_per_seat_monthly: number | null;
  normalized_price_per_seat_annual: number | null;

  // Display formatting
  display: {
    starting_from: string;  // "from $27/mo"
    caveat: string | null;  // "(3 seat minimum)" | "(annual only)"
    per_unit: string | null;  // "$9/user/mo"
  };

  // Comparison metadata
  is_seat_based: boolean;
  is_flat_rate: boolean;
  has_free_tier: boolean;
  min_seats: number | null;
  model: SMPPricingData['model'];
}

/**
 * Normalize pricing data for comparison
 *
 * Strategy:
 * 1. Find the lowest NON-ENTERPRISE, NON-FREE plan
 * 2. Account for minimum seat requirements
 * 3. Prefer monthly pricing for comparison (most common)
 * 4. Flag caveats (minimums, annual-only, etc.)
 */
export function normalizePricing(
  pricingData: SMPPricingData | null | undefined,
  preferredTier?: ComparisonTier
): NormalizedPricing | null {
  if (!pricingData || !pricingData.plans || pricingData.plans.length === 0) {
    return null;
  }

  const { plans, model, min_seats } = pricingData;

  // Filter to paid plans (exclude free and enterprise "Contact Sales")
  const paidPlans = plans.filter(
    p => !p.is_enterprise && (p.price_monthly || p.price_annual)
  );

  if (paidPlans.length === 0) {
    // Only free or enterprise plans available
    const freePlan = plans.find(p => p.price_monthly === 0 || p.name.toLowerCase() === 'free');
    if (freePlan) {
      return {
        effective_starting_price_monthly: 0,
        effective_starting_price_annual: 0,
        comparison_tier: 'individual',
        comparison_plan_id: freePlan.id,
        comparison_plan_name: freePlan.name,
        normalized_price_per_seat_monthly: null,
        normalized_price_per_seat_annual: null,
        display: {
          starting_from: 'Free',
          caveat: null,
          per_unit: null,
        },
        is_seat_based: false,
        is_flat_rate: true,
        has_free_tier: true,
        min_seats: null,
        model: 'free',
      };
    }
    return null;
  }

  // Find the comparison plan based on preferred tier or default to lowest
  let comparisonPlan: SMPPlanData;

  if (preferredTier) {
    // Try to match the preferred tier
    const tierPlan = paidPlans.find(p => p.target_audience === preferredTier);
    comparisonPlan = tierPlan || paidPlans[0];
  } else {
    // Default: Sort by effective monthly price (lowest first)
    comparisonPlan = paidPlans.sort((a, b) => {
      const priceA = a.price_monthly || (a.price_annual ? a.price_annual / 12 : Infinity);
      const priceB = b.price_monthly || (b.price_annual ? b.price_annual / 12 : Infinity);
      return priceA - priceB;
    })[0];
  }

  const isSeatBased = model === 'per_seat' || model === 'per_unit' || comparisonPlan.scaling_unit != null;
  const isFlatRate = model === 'flat';
  const minSeats = min_seats || 1;

  // Calculate effective prices (accounting for minimums)
  let effectiveMonthly: number | null = null;
  let effectiveAnnual: number | null = null;
  let normalizedPerSeatMonthly: number | null = null;
  let normalizedPerSeatAnnual: number | null = null;

  if (isSeatBased) {
    // Per-seat pricing
    const pricePerSeat = comparisonPlan.price_per_unit || comparisonPlan.price_monthly || 0;
    effectiveMonthly = pricePerSeat * minSeats;
    effectiveAnnual = comparisonPlan.price_annual
      ? comparisonPlan.price_annual * minSeats
      : effectiveMonthly * 12;

    normalizedPerSeatMonthly = pricePerSeat;
    normalizedPerSeatAnnual = comparisonPlan.price_annual || pricePerSeat * 12;
  } else {
    // Flat rate pricing
    effectiveMonthly = comparisonPlan.price_monthly || null;
    effectiveAnnual = comparisonPlan.price_annual || (effectiveMonthly ? effectiveMonthly * 12 : null);
  }

  // Build display strings
  const caveats: string[] = [];
  if (minSeats > 1) {
    caveats.push(`${minSeats} seat minimum`);
  }
  if (!comparisonPlan.price_monthly && comparisonPlan.price_annual) {
    caveats.push('annual only');
  }

  const startingFromDisplay = effectiveMonthly
    ? `from $${effectiveMonthly}/mo`
    : effectiveAnnual
    ? `from $${Math.round(effectiveAnnual / 12)}/mo (annual)`
    : 'Contact Sales';

  const perUnitDisplay = isSeatBased && normalizedPerSeatMonthly
    ? `$${normalizedPerSeatMonthly}/${comparisonPlan.scaling_unit || 'user'}/mo`
    : null;

  return {
    effective_starting_price_monthly: effectiveMonthly,
    effective_starting_price_annual: effectiveAnnual,
    comparison_tier: (comparisonPlan.target_audience || 'team') as ComparisonTier,
    comparison_plan_id: comparisonPlan.id,
    comparison_plan_name: comparisonPlan.name,
    normalized_price_per_seat_monthly: normalizedPerSeatMonthly,
    normalized_price_per_seat_annual: normalizedPerSeatAnnual,
    display: {
      starting_from: startingFromDisplay,
      caveat: caveats.length > 0 ? `(${caveats.join(', ')})` : null,
      per_unit: perUnitDisplay,
    },
    is_seat_based: isSeatBased,
    is_flat_rate: isFlatRate,
    has_free_tier: plans.some(p => p.price_monthly === 0),
    min_seats: minSeats > 1 ? minSeats : null,
    model,
  };
}

/**
 * Compare pricing between two tools on the same tier
 * Returns a human-readable comparison
 */
export function comparePricing(
  toolA: { name: string; pricing: NormalizedPricing | null },
  toolB: { name: string; pricing: NormalizedPricing | null }
): {
  cheaper: string | 'tie';  // Tool name or 'tie'
  difference: number | null;  // Dollar difference
  summary: string;  // Human-readable summary
} {
  if (!toolA.pricing || !toolB.pricing) {
    return {
      cheaper: 'tie',
      difference: null,
      summary: 'Pricing data unavailable for comparison',
    };
  }

  const priceA = toolA.pricing.effective_starting_price_monthly || 0;
  const priceB = toolB.pricing.effective_starting_price_monthly || 0;

  if (priceA === priceB) {
    return {
      cheaper: 'tie',
      difference: 0,
      summary: `Both start at $${priceA}/mo`,
    };
  }

  const cheaper = priceA < priceB ? toolA.name : toolB.name;
  const difference = Math.abs(priceA - priceB);

  let summary = `${cheaper} is $${difference}/mo cheaper`;

  // Add caveats if pricing models differ
  if (toolA.pricing.is_seat_based !== toolB.pricing.is_seat_based) {
    summary += ' (but pricing models differ: seat-based vs flat rate)';
  } else if (toolA.pricing.is_seat_based && toolB.pricing.is_seat_based) {
    const seatPriceA = toolA.pricing.normalized_price_per_seat_monthly || 0;
    const seatPriceB = toolB.pricing.normalized_price_per_seat_monthly || 0;
    const seatDiff = Math.abs(seatPriceA - seatPriceB);
    summary += ` (${Math.abs(seatPriceA - seatPriceB).toFixed(2)}/user/mo difference)`;
  }

  return { cheaper, difference, summary };
}

/**
 * Get pricing for a specific team size (cost calculator)
 */
export function getPricingForTeamSize(
  pricingData: SMPPricingData | null | undefined,
  teamSize: number,
  preferredTier?: ComparisonTier
): {
  monthly: number;
  annual: number;
  plan_name: string;
  caveats: string[];
} | null {
  const normalized = normalizePricing(pricingData, preferredTier);
  if (!normalized) return null;

  const effectiveTeamSize = Math.max(teamSize, normalized.min_seats || 1);
  const caveats: string[] = [];

  if (effectiveTeamSize > teamSize) {
    caveats.push(`Minimum ${normalized.min_seats} seats required`);
  }

  let monthly: number;
  let annual: number;

  if (normalized.is_seat_based && normalized.normalized_price_per_seat_monthly) {
    monthly = normalized.normalized_price_per_seat_monthly * effectiveTeamSize;
    annual = (normalized.normalized_price_per_seat_annual || monthly * 12) * effectiveTeamSize;
  } else {
    // Flat rate - same price regardless of team size
    monthly = normalized.effective_starting_price_monthly || 0;
    annual = normalized.effective_starting_price_annual || monthly * 12;
  }

  return {
    monthly,
    annual,
    plan_name: normalized.comparison_plan_name || 'Unknown',
    caveats,
  };
}
