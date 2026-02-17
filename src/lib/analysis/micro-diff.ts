/**
 * Micro-Diff Generator
 *
 * Generates concise, human-readable comparison snippets for alternative cards.
 * These are computed on-the-fly from item specs.
 *
 * @module lib/analysis/micro-diff
 */

import type { ToolSpecs } from '../../types/database';
import { parsePriceToCents } from '../pricing/cost';

interface ItemForDiff {
  slug: string;
  name: string;
  pricing_type: string;
  learning_curve?: string | null;
  base_score?: number | null;
  specs?: ToolSpecs | Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
}

export interface MicroDiff {
  priceDiff?: string;
  learningDiff?: string;
  featureDiff?: string;
}

const LEARNING_CURVE_ORDER = ['minutes', 'hours', 'days', 'weeks', 'months'];
const LEARNING_CURVE_LABELS: Record<string, string> = {
  minutes: 'Minutes',
  hours: 'Hours',
  days: 'Days',
  weeks: 'Weeks',
  months: 'Months',
};

/**
 * Generate micro-diff comparing alt to main item
 * Returns human-readable snippets highlighting key differences
 */
export function computeMicroDiff(main: ItemForDiff, alt: ItemForDiff): MicroDiff {
  const diff: MicroDiff = {};

  // Price difference
  const priceDiff = computePriceDiff(main, alt);
  if (priceDiff) diff.priceDiff = priceDiff;

  // Learning curve difference
  const learningDiff = computeLearningDiff(main, alt);
  if (learningDiff) diff.learningDiff = learningDiff;

  // Feature difference
  const featureDiff = computeFeatureDiff(main, alt);
  if (featureDiff) diff.featureDiff = featureDiff;

  return diff;
}

function computePriceDiff(main: ItemForDiff, alt: ItemForDiff): string | undefined {
  const mainPrice = main.pricing_type;
  const altPrice = alt.pricing_type;

  // Same pricing model - no diff
  if (mainPrice === altPrice) return undefined;

  // Free vs Paid
  if (altPrice === 'free' && mainPrice !== 'free') {
    return `${alt.name} is free`;
  }
  if (altPrice === 'open_source' && mainPrice !== 'open_source') {
    return `${alt.name} is open source`;
  }
  if (mainPrice === 'free' && altPrice !== 'free') {
    return `${main.name} is free`;
  }

  // Freemium vs Paid
  if (altPrice === 'freemium' && mainPrice === 'paid') {
    return `${alt.name} has a free tier`;
  }
  if (mainPrice === 'freemium' && altPrice === 'paid') {
    return `${main.name} has a free tier`;
  }

  // Try to compare actual prices from specs
  const mainSpecs = main.specs as ToolSpecs | undefined;
  const altSpecs = alt.specs as ToolSpecs | undefined;
  const mainStarting = mainSpecs?.starting_price;
  const altStarting = altSpecs?.starting_price;

  if (mainStarting && altStarting) {
    const mainCents = parsePriceToCents(mainStarting);
    const altCents = parsePriceToCents(altStarting);

    if (mainCents !== null && altCents !== null && mainCents !== altCents) {
      const cheaper = altCents < mainCents ? alt.name : main.name;
      const priceDiffPct = Math.abs(Math.round(((altCents - mainCents) / mainCents) * 100));
      if (priceDiffPct >= 20) {
        return `${cheaper} is ${priceDiffPct}% cheaper`;
      }
    }
  }

  return undefined;
}

function computeLearningDiff(main: ItemForDiff, alt: ItemForDiff): string | undefined {
  const mainCurve = main.learning_curve;
  const altCurve = alt.learning_curve;

  if (!mainCurve || !altCurve || mainCurve === altCurve) return undefined;

  const mainIndex = LEARNING_CURVE_ORDER.indexOf(mainCurve);
  const altIndex = LEARNING_CURVE_ORDER.indexOf(altCurve);

  if (mainIndex === -1 || altIndex === -1) return undefined;

  // If alt is easier to learn (lower index)
  if (altIndex < mainIndex) {
    return `${alt.name} is easier to learn (~${LEARNING_CURVE_LABELS[altCurve]})`;
  }
  // If main is easier (alt is harder)
  if (mainIndex < altIndex) {
    return `${alt.name} has steeper learning curve (~${LEARNING_CURVE_LABELS[altCurve]})`;
  }

  return undefined;
}

function computeFeatureDiff(main: ItemForDiff, alt: ItemForDiff): string | undefined {
  const mainSpecs = main.specs as ToolSpecs | undefined;
  const altSpecs = alt.specs as ToolSpecs | undefined;

  // Compare integrations count
  const mainIntegrations = Array.isArray(mainSpecs?.integrations)
    ? mainSpecs?.integrations.length
    : 0;
  const altIntegrations = Array.isArray(altSpecs?.integrations) ? altSpecs?.integrations.length : 0;

  if (altIntegrations > mainIntegrations + 5) {
    return `${alt.name} has ${altIntegrations - mainIntegrations}+ more integrations`;
  }
  if (mainIntegrations > altIntegrations + 5) {
    return `${alt.name} has fewer integrations`;
  }

  // Compare platforms
  const mainPlatforms = mainSpecs?.platforms?.length || 0;
  const altPlatforms = altSpecs?.platforms?.length || 0;

  if (altPlatforms > mainPlatforms && altPlatforms >= 3) {
    return `More platforms available`;
  }

  // Check for notable features alt has that main doesn't
  const mainSecurity = new Set(mainSpecs?.security || []);
  const altSecurity = altSpecs?.security || [];

  if (altSecurity.includes('SOC2') && !mainSecurity.has('SOC2')) {
    return 'SOC2 certified';
  }
  if (altSecurity.includes('HIPAA') && !mainSecurity.has('HIPAA')) {
    return 'HIPAA compliant';
  }

  // Check API availability
  if (altSpecs?.api_available && !mainSpecs?.api_available) {
    return 'Has API access';
  }

  // Check open source
  if (altSpecs?.open_source_repo && !mainSpecs?.open_source_repo) {
    return 'Open source';
  }

  return undefined;
}

/**
 * Batch compute micro-diffs for multiple alternatives
 */
export function computeMicroDiffs(
  main: ItemForDiff,
  alternatives: ItemForDiff[]
): Map<string, MicroDiff> {
  const results = new Map<string, MicroDiff>();

  for (const alt of alternatives) {
    results.set(alt.slug, computeMicroDiff(main, alt));
  }

  return results;
}
