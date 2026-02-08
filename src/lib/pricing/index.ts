/**
 * Pricing Module - Public API
 *
 * Centralized pricing normalization and comparison logic.
 */

export {
  normalizePricing,
  comparePricing,
  getPricingForTeamSize,
  type NormalizedPricing,
  type ComparisonTier,
} from './normalize';

export { updateNormalizedPricing, backfillNormalizedPricing } from './persist';
export { mapSmpPricingToV2 } from './v2-mapper';
export { PricingV2ProductPricingSchema } from './v2-schema';
export {
  computeBestPlanPricingV2,
  computePricingV2ForPlan,
  type PricingV2Scenario,
  type PricingV2PlanBreakdown,
  type PricingV2FxPolicy,
  type PricingV2OneTimePolicy,
} from './v2-cost';
