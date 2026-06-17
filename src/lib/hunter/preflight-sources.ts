/**
 * Source pre-flight scoring.
 *
 * Pure functions that count LLM-eligible scout sources by lane and decide
 * whether there is enough material to justify the (expensive) analysis phase.
 * Extracted verbatim from the orchestrator's inline pre-flight check, which
 * duplicated this logic for the initial and the fresh-research re-evaluation.
 *
 * @module hunter/preflight-sources
 */
import { isLlmEligibleScoutSource } from './utils';
import type { RawSource } from './types';

const OFFICIAL_SOURCE_TYPES: ReadonlyArray<string> = ['official', 'docs', 'support', 'legal'];

export interface ScoutSourceCounts {
  /** Total sources that pass LLM-ingestion policy. */
  eligible: number;
  review: number;
  tribal: number;
  official: number;
  pricing: number;
}

/**
 * Count LLM-eligible scout sources, bucketed by lane. Only sources that pass
 * `isLlmEligibleScoutSource` are counted in any bucket.
 */
export function scoutSourceCounts(sources: RawSource[]): ScoutSourceCounts {
  const review = sources.filter(
    (source) => source.intent_tags.includes('reviews') && isLlmEligibleScoutSource(source)
  ).length;
  const tribal = sources.filter(
    (source) => source.source_type === 'community' && isLlmEligibleScoutSource(source)
  ).length;
  const official = sources
    .filter((source) => OFFICIAL_SOURCE_TYPES.includes(source.source_type))
    .filter((source) => isLlmEligibleScoutSource(source)).length;
  const pricing = sources.filter(
    (source) => source.intent_tags.includes('pricing') && isLlmEligibleScoutSource(source)
  ).length;
  const eligible = sources.filter((source) => isLlmEligibleScoutSource(source)).length;
  return { eligible, review, tribal, official, pricing };
}

export interface SourcePreflightResult {
  passed: boolean;
  /** Minimum eligible sources required (adaptive on official-source count). */
  minEligible: number;
  /** Minimum official sources required. */
  minOfficial: number;
}

/**
 * Decide whether the eligible/official counts clear the adaptive pre-flight bar.
 *
 * Adaptive threshold: a contextual hunt needs 3 eligible sources, a discovery
 * hunt needs 4 — but when at least 2 official sources are present the bar drops
 * to 2 eligible. This prevents over-blocking well-documented tools while keeping
 * strictness for weak evidence.
 */
export function passesSourcePreflight(
  counts: Pick<ScoutSourceCounts, 'eligible' | 'official'>,
  opts: { hasContext: boolean }
): SourcePreflightResult {
  const baseMinEligible = opts.hasContext ? 3 : 4;
  const minEligible = counts.official >= 2 ? Math.min(baseMinEligible, 2) : baseMinEligible;
  const minOfficial = 1;
  return {
    passed: counts.eligible >= minEligible && counts.official >= minOfficial,
    minEligible,
    minOfficial,
  };
}
