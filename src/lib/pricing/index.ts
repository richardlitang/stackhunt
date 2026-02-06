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
