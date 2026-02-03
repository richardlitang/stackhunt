/**
 * Comparator - Pure utility functions for computing item comparisons
 *
 * Design Principles:
 * 1. Pure functions - no side effects, no DB calls
 * 2. Polymorphic - handles tools and gear differently
 * 3. Confidence-aware - hedges claims when data quality is low
 *
 * @module lib/analysis/comparator
 */

import type { Item, ItemSpecs, ToolSpecs, GearSpecs } from '../../types/database';

// ============================================================================
// TYPES
// ============================================================================

export interface FeatureComparison {
  both: string[];
  only_a: string[];
  only_b: string[];
}

export interface PriceComparison {
  a: string | null;
  b: string | null;
  free_tier_a: string | null;
  free_tier_b: string | null;
  winner: 'a' | 'b' | 'tie' | 'unknown';
  confidence: number;
}

export interface MigrationAnalysis {
  can_migrate_a_to_b: boolean;
  can_migrate_b_to_a: boolean;
  difficulty_leaving_a: number | null; // 1-5
  difficulty_leaving_b: number | null; // 1-5
  wont_transfer_from_a: string[];
  wont_transfer_from_b: string[];
}

export interface AudienceFit {
  audience: string;
  better_for: 'a' | 'b' | 'tie' | 'unknown';
  confidence: number;
  reason?: string;
}

export interface ToolComparison {
  type: 'tool';
  items: { a: Item; b: Item };

  // Computed from specs
  integrations: FeatureComparison;
  platforms: FeatureComparison;
  security: FeatureComparison;
  support: FeatureComparison;

  // Pricing
  price: PriceComparison;

  // Migration
  migration: MigrationAnalysis;

  // Learning curve
  learning_curve: {
    a: string | null;
    b: string | null;
    easier: 'a' | 'b' | 'tie' | 'unknown';
  };

  // Quality scores
  scores: {
    base_a: number | null;
    base_b: number | null;
    better_quality: 'a' | 'b' | 'tie' | 'unknown';
    confidence: number;
  };

  // Audience fit (computed from ideal_for if available)
  audience_fits: AudienceFit[];

  // Overall confidence (min of all data confidence)
  overall_confidence: number;
}

export interface GearComparison {
  type: 'gear';
  items: { a: Item; b: Item };

  // Physical specs
  weight: { a: string | null; b: string | null; lighter: 'a' | 'b' | 'unknown' };
  battery: { a: string | null; b: string | null; longer: 'a' | 'b' | 'unknown' };
  warranty: { a: string | null; b: string | null };

  // Connectivity
  connectivity: FeatureComparison;
  certifications: FeatureComparison;

  // Price
  price: PriceComparison;

  // Quality
  scores: {
    base_a: number | null;
    base_b: number | null;
    better_quality: 'a' | 'b' | 'tie' | 'unknown';
    confidence: number;
  };

  overall_confidence: number;
}

export type ComparisonResult = ToolComparison | GearComparison;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Set intersection
 */
function intersection<T>(a: T[] | undefined, b: T[] | undefined): T[] {
  if (!a || !b) return [];
  const setB = new Set(b);
  return a.filter(x => setB.has(x));
}

/**
 * Set difference (a - b)
 */
function difference<T>(a: T[] | undefined, b: T[] | undefined): T[] {
  if (!a) return [];
  if (!b) return a;
  const setB = new Set(b);
  return a.filter(x => !setB.has(x));
}

/**
 * Compare features and return structured comparison
 */
function compareFeatures(
  a: string[] | undefined,
  b: string[] | undefined
): FeatureComparison {
  return {
    both: intersection(a, b),
    only_a: difference(a, b),
    only_b: difference(b, a),
  };
}

/**
 * Parse price string to cents for comparison
 * Returns null if unparseable
 */
function parsePriceToCents(price: string | null | undefined): number | null {
  if (!price) return null;

  // Handle common formats: "$12/mo", "$99/year", "Free", "$299"
  const lower = price.toLowerCase();
  if (lower === 'free' || lower.includes('free')) return 0;

  const match = price.match(/\$?([\d,]+(?:\.\d{2})?)/);
  if (!match) return null;

  const amount = parseFloat(match[1].replace(',', ''));
  if (isNaN(amount)) return null;

  // Normalize to monthly (rough estimate)
  if (lower.includes('/year') || lower.includes('/yr')) {
    return Math.round((amount / 12) * 100);
  }
  return Math.round(amount * 100);
}

/**
 * Compare prices
 */
function comparePrices(
  specsA: ToolSpecs | GearSpecs | undefined,
  specsB: ToolSpecs | GearSpecs | undefined,
  confidenceA: number,
  confidenceB: number
): PriceComparison {
  const priceA = (specsA as ToolSpecs)?.starting_price || null;
  const priceB = (specsB as ToolSpecs)?.starting_price || null;
  const freeA = (specsA as ToolSpecs)?.free_tier_limits || null;
  const freeB = (specsB as ToolSpecs)?.free_tier_limits || null;

  const centsA = parsePriceToCents(priceA);
  const centsB = parsePriceToCents(priceB);

  let winner: 'a' | 'b' | 'tie' | 'unknown' = 'unknown';
  if (centsA !== null && centsB !== null) {
    if (centsA < centsB) winner = 'a';
    else if (centsB < centsA) winner = 'b';
    else winner = 'tie';
  }

  return {
    a: priceA,
    b: priceB,
    free_tier_a: freeA,
    free_tier_b: freeB,
    winner,
    confidence: Math.min(confidenceA, confidenceB),
  };
}

/**
 * Compare learning curves
 */
const LEARNING_CURVE_ORDER = ['minutes', 'hours', 'days', 'weeks', 'months'];

function compareLearningCurve(
  a: string | null,
  b: string | null
): 'a' | 'b' | 'tie' | 'unknown' {
  if (!a || !b) return 'unknown';
  const indexA = LEARNING_CURVE_ORDER.indexOf(a);
  const indexB = LEARNING_CURVE_ORDER.indexOf(b);
  if (indexA === -1 || indexB === -1) return 'unknown';
  if (indexA < indexB) return 'a';
  if (indexB < indexA) return 'b';
  return 'tie';
}

// ============================================================================
// MAIN COMPARISON FUNCTIONS
// ============================================================================

/**
 * Compute comparison for two software tools
 */
function computeToolComparison(itemA: Item, itemB: Item): ToolComparison {
  const specsA = (itemA.specs || {}) as ToolSpecs;
  const specsB = (itemB.specs || {}) as ToolSpecs;
  const confA = itemA.data_confidence ?? 0.5;
  const confB = itemB.data_confidence ?? 0.5;
  const minConf = Math.min(confA, confB);

  // Quality comparison
  let betterQuality: 'a' | 'b' | 'tie' | 'unknown' = 'unknown';
  if (itemA.base_score !== null && itemB.base_score !== null) {
    if (itemA.base_score > itemB.base_score) betterQuality = 'a';
    else if (itemB.base_score > itemA.base_score) betterQuality = 'b';
    else betterQuality = 'tie';
  }

  // Migration analysis
  const migration: MigrationAnalysis = {
    can_migrate_a_to_b: specsB.data_import_from?.includes(itemA.slug) ?? false,
    can_migrate_b_to_a: specsA.data_import_from?.includes(itemB.slug) ?? false,
    difficulty_leaving_a: (specsA as any).migration_out_difficulty ?? null,
    difficulty_leaving_b: (specsB as any).migration_out_difficulty ?? null,
    wont_transfer_from_a: (specsA as any).proprietary_features ?? [],
    wont_transfer_from_b: (specsB as any).proprietary_features ?? [],
  };

  // Audience fit (from metadata if available)
  const audience_fits: AudienceFit[] = [];
  const idealA = (itemA.metadata as any)?.ideal_for || [];
  const idealB = (itemB.metadata as any)?.ideal_for || [];
  const allAudiences = Array.from(new Set([...idealA, ...idealB]));

  for (const audience of allAudiences) {
    const aHas = idealA.includes(audience);
    const bHas = idealB.includes(audience);
    let better_for: 'a' | 'b' | 'tie' | 'unknown' = 'unknown';
    if (aHas && !bHas) better_for = 'a';
    else if (bHas && !aHas) better_for = 'b';
    else if (aHas && bHas) better_for = 'tie';

    audience_fits.push({
      audience,
      better_for,
      confidence: minConf * 0.9, // Slightly lower confidence for inferred fits
    });
  }

  return {
    type: 'tool',
    items: { a: itemA, b: itemB },

    integrations: compareFeatures(specsA.integrations, specsB.integrations),
    platforms: compareFeatures(specsA.platforms, specsB.platforms),
    security: compareFeatures(specsA.security, specsB.security),
    support: compareFeatures(specsA.support_options, specsB.support_options),

    price: comparePrices(specsA, specsB, confA, confB),

    migration,

    learning_curve: {
      a: itemA.learning_curve,
      b: itemB.learning_curve,
      easier: compareLearningCurve(itemA.learning_curve, itemB.learning_curve),
    },

    scores: {
      base_a: itemA.base_score,
      base_b: itemB.base_score,
      better_quality: betterQuality,
      confidence: minConf,
    },

    audience_fits,
    overall_confidence: minConf,
  };
}

/**
 * Compute comparison for two hardware items
 */
function computeGearComparison(itemA: Item, itemB: Item): GearComparison {
  const specsA = (itemA.specs || {}) as GearSpecs;
  const specsB = (itemB.specs || {}) as GearSpecs;
  const confA = itemA.data_confidence ?? 0.5;
  const confB = itemB.data_confidence ?? 0.5;
  const minConf = Math.min(confA, confB);

  // Quality comparison
  let betterQuality: 'a' | 'b' | 'tie' | 'unknown' = 'unknown';
  if (itemA.base_score !== null && itemB.base_score !== null) {
    if (itemA.base_score > itemB.base_score) betterQuality = 'a';
    else if (itemB.base_score > itemA.base_score) betterQuality = 'b';
    else betterQuality = 'tie';
  }

  // Weight comparison (lower is better for portability)
  // This is a simplistic comparison - real implementation would parse units
  const lighter: 'a' | 'b' | 'unknown' = 'unknown'; // Would need unit parsing

  // Battery comparison (higher is better)
  const longer: 'a' | 'b' | 'unknown' = 'unknown'; // Would need unit parsing

  return {
    type: 'gear',
    items: { a: itemA, b: itemB },

    weight: {
      a: specsA.weight || null,
      b: specsB.weight || null,
      lighter,
    },

    battery: {
      a: specsA.battery_life || null,
      b: specsB.battery_life || null,
      longer,
    },

    warranty: {
      a: specsA.warranty || null,
      b: specsB.warranty || null,
    },

    connectivity: compareFeatures(specsA.connectivity, specsB.connectivity),
    certifications: compareFeatures(specsA.certifications, specsB.certifications),

    price: comparePrices(specsA as any, specsB as any, confA, confB),

    scores: {
      base_a: itemA.base_score,
      base_b: itemB.base_score,
      better_quality: betterQuality,
      confidence: minConf,
    },

    overall_confidence: minConf,
  };
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Compute comparison between two items
 * Polymorphic - handles tools and gear differently
 *
 * @param itemA - First item
 * @param itemB - Second item
 * @returns Typed comparison result
 */
export function computeComparison(itemA: Item, itemB: Item): ComparisonResult {
  // Both must be same type
  if (itemA.type !== itemB.type) {
    throw new Error(`Cannot compare items of different types: ${itemA.type} vs ${itemB.type}`);
  }

  switch (itemA.type) {
    case 'tool':
      return computeToolComparison(itemA, itemB);
    case 'gear':
      return computeGearComparison(itemA, itemB);
    default:
      throw new Error(`Unknown item type: ${itemA.type}`);
  }
}

/**
 * Get a hedged statement based on confidence level
 *
 * @param statement - The claim to hedge
 * @param confidence - Confidence level (0-1)
 * @returns Hedged statement if confidence < 0.8
 */
export function hedgeByConfidence(statement: string, confidence: number): string {
  if (confidence >= 0.9) return statement;
  if (confidence >= 0.8) return statement; // High confidence, no hedge
  if (confidence >= 0.6) return `Likely: ${statement}`;
  if (confidence >= 0.4) return `Possibly: ${statement}`;
  return `Uncertain: ${statement}`;
}

/**
 * Determine winner text with hedging
 */
export function getWinnerText(
  winner: 'a' | 'b' | 'tie' | 'unknown',
  nameA: string,
  nameB: string,
  confidence: number
): string {
  if (winner === 'unknown') return 'Unable to determine';
  if (winner === 'tie') return 'Roughly equal';

  const winnerName = winner === 'a' ? nameA : nameB;

  if (confidence >= 0.8) return `${winnerName} wins`;
  if (confidence >= 0.6) return `${winnerName} likely wins`;
  return `${winnerName} may have an edge`;
}

/**
 * Order slugs alphabetically (for comparison_insights lookups)
 */
export function orderSlugsAlphabetically(
  slug1: string,
  slug2: string
): { slugA: string; slugB: string; swapped: boolean } {
  if (slug1 < slug2) {
    return { slugA: slug1, slugB: slug2, swapped: false };
  }
  return { slugA: slug2, slugB: slug1, swapped: true };
}

// ============================================================================
// COMPARISON VALIDATION
// ============================================================================

/**
 * Comparable function groups - tools in these groups can be compared
 */
const COMPARABLE_FUNCTION_GROUPS = [
  ['Project Management', 'Task Management', 'Work Management'],
  ['Communication', 'Team Chat', 'Messaging'],
  ['Design', 'Graphic Design', 'Video Editing', 'Creative'],
  ['Note-Taking', 'Knowledge Management', 'Documentation'],
  ['CRM', 'Sales', 'Marketing Automation', 'Email Marketing', 'Lead Generation'],
  ['Accounting', 'Finance', 'Expense Management', 'Invoicing'],
  ['HR', 'Payroll', 'Recruitment'],
  ['Analytics', 'Business Intelligence', 'Data Visualization'],
  ['Advertising Platform', 'Ad Management', 'Marketing'],
];

/**
 * Check if two primary functions are comparable
 */
function areFunctionsComparable(funcA: string | undefined, funcB: string | undefined): boolean {
  if (!funcA || !funcB) return false;
  if (funcA === funcB) return true;

  // Check if both functions are in the same comparable group
  for (const group of COMPARABLE_FUNCTION_GROUPS) {
    const aInGroup = group.some(f => funcA.toLowerCase().includes(f.toLowerCase()));
    const bInGroup = group.some(f => funcB.toLowerCase().includes(f.toLowerCase()));
    if (aInGroup && bInGroup) return true;
  }

  return false;
}

/**
 * Minimal tool info needed for comparison validation
 */
export interface ComparableToolInfo {
  slug: string;
  category_id?: string | null;
  metadata?: {
    smp_taxonomy?: {
      primary_function?: string;
    };
  } | null;
}

/**
 * Check if two tools are comparable and should have a comparison link
 *
 * Criteria:
 * 1. Same category (category_id matches)
 * 2. OR comparable functions (from smp_taxonomy.primary_function)
 *
 * @param toolA - First tool
 * @param toolB - Second tool
 * @returns true if tools are comparable
 */
export function areToolsComparable(
  toolA: ComparableToolInfo,
  toolB: ComparableToolInfo
): boolean {
  // Same tool is not comparable to itself
  if (toolA.slug === toolB.slug) return false;

  // Check same category
  const sameCategory =
    toolA.category_id != null &&
    toolB.category_id != null &&
    toolA.category_id === toolB.category_id;

  if (sameCategory) return true;

  // Check comparable functions
  const functionA = toolA.metadata?.smp_taxonomy?.primary_function;
  const functionB = toolB.metadata?.smp_taxonomy?.primary_function;

  return areFunctionsComparable(functionA, functionB);
}
