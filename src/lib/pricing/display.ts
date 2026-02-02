/**
 * Pricing Display Utilities
 *
 * Helpers for formatting pricing information consistently across UI components.
 * Handles different scaling units (users, contacts, seats, etc.) and pricing models.
 *
 * Key concept: Scaling units fall into categories that determine UI behavior:
 * - Team-based (user, seat, member): Scales with team size slider
 * - Non-team-based (contact, GB, request, etc.): Shown as flat rate with context
 */

import type { ScalingUnit, SMPPricingData, SMPPlanData } from '@/types/database';

/**
 * Labels for known scaling units (singular form)
 * Unknown units pass through as-is (tolerant reader pattern)
 */
const SCALING_UNIT_LABELS: Record<string, string> = {
  // Team-based
  user: 'user',
  seat: 'seat',
  member: 'user',      // Normalize to user
  agent: 'agent',
  teammate: 'user',    // Normalize to user
  // Audience-based
  contact: 'contact',
  subscriber: 'contact', // Normalize to contact
  lead: 'contact',       // Normalize to contact
  // Resource-based
  GB: 'GB',
  gb: 'GB',              // Case normalization
  storage: 'GB',
  project: 'project',
  workspace: 'workspace',
  site: 'site',
  // Usage-based
  message: 'message',
  email: 'message',      // Normalize
  sms: 'message',        // Normalize
  request: 'request',
  api_call: 'request',   // Normalize
  minute: 'minute',
  hour: 'hour',
  call: 'call',
  event: 'event',
  token: 'token',
  task: 'task',
  invocation: 'invocation',
  // Pass-through for unknown units happens in formatScalingUnit
};

/**
 * Scaling unit categories - determines how the UI handles pricing display
 */
export type ScalingCategory = 'team' | 'audience' | 'resource' | 'usage';

/**
 * Team-based scaling units - these scale with the team size slider
 * Represents "how many people use the tool"
 */
const TEAM_BASED_UNITS: string[] = ['user', 'seat', 'member', 'agent', 'teammate'];

/**
 * Audience-based scaling units - marketing/CRM tools
 * Represents "how many people you're reaching"
 */
const AUDIENCE_BASED_UNITS: string[] = ['contact', 'subscriber', 'lead'];

/**
 * Resource-based scaling units - storage/project tools
 * Represents "how much stuff you have"
 */
const RESOURCE_BASED_UNITS: string[] = ['GB', 'gb', 'storage', 'project', 'workspace', 'site'];

/**
 * Usage-based scaling units - API/messaging tools
 * Represents "how much you consume"
 * Note: Unknown units default to this category (most flexible)
 */
const USAGE_BASED_UNITS: string[] = ['message', 'email', 'sms', 'request', 'api_call', 'minute', 'hour', 'call', 'event', 'token', 'task', 'invocation', 'credit', 'zap', 'compute'];

/**
 * Format a scaling unit for display
 * Normalizes synonyms and passes through unknown units
 *
 * @param unit - The scaling unit (e.g., 'user', 'contact', 'seat', 'zap')
 * @param plural - Whether to pluralize (default: false)
 * @returns Formatted unit label
 *
 * @example
 * formatScalingUnit('user') // 'user'
 * formatScalingUnit('member') // 'user' (normalized)
 * formatScalingUnit('contact', true) // 'contacts'
 * formatScalingUnit('zap', true) // 'zaps' (unknown, passed through)
 * formatScalingUnit(null) // 'user' (default)
 */
export function formatScalingUnit(unit: ScalingUnit | null | undefined, plural = false): string {
  // Default to 'user' if no unit specified
  if (!unit) return plural ? 'users' : 'user';

  // Normalize known units, pass through unknown ones
  const normalizedUnit = unit.toLowerCase();
  const label = SCALING_UNIT_LABELS[normalizedUnit] || unit; // Pass through unknown

  if (!plural) return label;

  // Handle irregular plurals
  if (label === 'GB') return 'GB'; // GB doesn't pluralize
  return `${label}s`;
}

/**
 * Format a price breakdown string
 *
 * @param quantity - Number of units
 * @param pricePerUnit - Price per unit
 * @param scalingUnit - The scaling unit
 * @returns Formatted breakdown (e.g., "6 users × $10/user")
 *
 * @example
 * formatPriceBreakdown(6, 10, 'user') // '6 users × $10/user'
 * formatPriceBreakdown(500, 0.04, 'contact') // '500 contacts × $0.04/contact'
 */
export function formatPriceBreakdown(
  quantity: number,
  pricePerUnit: number,
  scalingUnit: ScalingUnit | null | undefined
): string {
  const unitLabel = formatScalingUnit(scalingUnit, quantity !== 1);
  const unitLabelSingular = formatScalingUnit(scalingUnit);
  return `${quantity} ${unitLabel} × $${pricePerUnit}/${unitLabelSingular}`;
}

/**
 * Get the category of a scaling unit
 * This determines how the UI handles pricing display
 * Unknown units default to 'usage' (most flexible category)
 */
export function getScalingCategory(unit: ScalingUnit | null | undefined): ScalingCategory {
  if (!unit) return 'team'; // Default to team-based (most common for SaaS)

  const normalizedUnit = unit.toLowerCase();

  if (TEAM_BASED_UNITS.includes(normalizedUnit)) return 'team';
  if (AUDIENCE_BASED_UNITS.includes(normalizedUnit)) return 'audience';
  if (RESOURCE_BASED_UNITS.includes(normalizedUnit)) return 'resource';

  // Unknown units default to 'usage' - the most flexible category
  // This handles novel units like 'zap', 'credit', 'compute' gracefully
  return 'usage';
}

/**
 * Check if pricing scales with team size
 * Team-based units (user, seat, member) scale with the team size slider
 * Everything else (contacts, GB, requests, etc.) does not
 *
 * @param pricingData - The pricing data object
 * @returns true if this tool's price scales with team size
 */
export function isTeamBasedPricing(pricingData: SMPPricingData | null | undefined): boolean {
  if (!pricingData) return true; // Default assumption

  const scalingUnit = getScalingUnit(pricingData);
  return getScalingCategory(scalingUnit) === 'team';
}

/**
 * @deprecated Use isTeamBasedPricing() instead - more general approach
 * Check if pricing data represents contact-based pricing
 */
export function isContactBasedPricing(pricingData: SMPPricingData | null | undefined): boolean {
  const scalingUnit = getScalingUnit(pricingData);
  return getScalingCategory(scalingUnit) === 'audience';
}

/**
 * Get the scaling unit from pricing data
 *
 * @param pricingData - The pricing data object
 * @returns The scaling unit or null
 */
export function getScalingUnit(pricingData: SMPPricingData | null | undefined): ScalingUnit | null {
  if (!pricingData) return null;

  // Get from the first plan (typically the comparison plan)
  const firstPlan = pricingData.plans?.[0];
  return (firstPlan?.scaling_unit as ScalingUnit) || null;
}

/**
 * Format contact-based pricing for display
 *
 * @param plan - The pricing plan
 * @returns Formatted string (e.g., "From $20/mo (up to 500 contacts)")
 */
export function formatContactBasedPrice(plan: SMPPlanData | null | undefined): string | null {
  if (!plan) return null;
  if (!plan.price_monthly) return null;

  const includedUnits = plan.included_units;
  const scalingUnit = plan.scaling_unit as ScalingUnit;

  if (includedUnits && scalingUnit) {
    const unitLabel = formatScalingUnit(scalingUnit, true);
    return `From $${plan.price_monthly}/mo (up to ${includedUnits.toLocaleString()} ${unitLabel})`;
  }

  return `$${plan.price_monthly}/mo`;
}

/**
 * Get a descriptive label for the pricing model
 */
export function getPricingModelLabel(model: SMPPricingData['model'] | null | undefined): string {
  const labels: Record<string, string> = {
    per_seat: 'Per-seat pricing',
    per_unit: 'Per-unit pricing',
    flat: 'Flat rate',
    tiered: 'Tiered pricing',
    freemium: 'Freemium',
    free: 'Free',
    hybrid: 'Hybrid pricing',
    contact_sales: 'Contact sales',
  };
  return model ? labels[model] || model : 'Unknown';
}

/**
 * Get a badge variant for pricing display
 */
export type PricingBadgeVariant = 'team' | 'audience' | 'resource' | 'usage' | 'flat' | 'free';

export function getPricingBadgeVariant(pricingData: SMPPricingData | null | undefined): PricingBadgeVariant {
  if (!pricingData) return 'team';
  if (pricingData.model === 'free') return 'free';
  if (pricingData.model === 'flat') return 'flat';

  const scalingUnit = getScalingUnit(pricingData);
  return getScalingCategory(scalingUnit);
}

/**
 * Get a human-readable label for the scaling category
 * Used for UI badges and explanatory text
 */
export function getScalingCategoryLabel(category: ScalingCategory): string {
  const labels: Record<ScalingCategory, string> = {
    team: 'Per user',
    audience: 'Per contacts',
    resource: 'Per resource',
    usage: 'Per usage',
  };
  return labels[category];
}

/**
 * Get explanatory text about how pricing scales
 * Used in pricing cards to explain non-team-based pricing
 */
export function getScalingExplanation(pricingData: SMPPricingData | null | undefined): string | null {
  const scalingUnit = getScalingUnit(pricingData);
  const category = getScalingCategory(scalingUnit);

  if (category === 'team') return null; // No explanation needed for team-based

  const unitLabel = formatScalingUnit(scalingUnit, true);

  switch (category) {
    case 'audience':
      return `Price scales with your ${unitLabel} list size, not team members`;
    case 'resource':
      return `Price scales with ${unitLabel}, not team members`;
    case 'usage':
      return `Price scales with ${unitLabel} consumed, not team members`;
    default:
      return null;
  }
}
