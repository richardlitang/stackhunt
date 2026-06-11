/**
 * Research-time coverage-gap detection. Runs over raw scout sources before
 * Knowledge Card extraction so missing lanes can be filled with targeted
 * follow-up queries in the same hunt.
 */

import {
  COVERAGE_MIGRATION_TOKENS,
  COVERAGE_ONBOARDING_TOKENS,
  COVERAGE_PRICING_TOKENS,
  COVERAGE_SUPPORT_TOKENS,
  type CoverageDimension,
} from './coverage-gaps';

interface ScoutSourceLike {
  url?: string;
  title?: string;
  snippet?: string;
}

const LANE_TOKENS: Array<{ lane: CoverageDimension; tokens: RegExp }> = [
  { lane: 'onboarding', tokens: COVERAGE_ONBOARDING_TOKENS },
  { lane: 'pricing_ceilings', tokens: COVERAGE_PRICING_TOKENS },
  { lane: 'migration_risk', tokens: COVERAGE_MIGRATION_TOKENS },
  { lane: 'support_quality', tokens: COVERAGE_SUPPORT_TOKENS },
];

const GAP_QUERY_TEMPLATES: Record<CoverageDimension, (toolName: string) => string> = {
  onboarding: (toolName) => `${toolName} setup onboarding how long to get started`,
  pricing_ceilings: (toolName) => `${toolName} pricing plan limits hidden costs`,
  migration_risk: (toolName) => `${toolName} export data migrate away lock-in`,
  support_quality: (toolName) => `${toolName} support response time reddit`,
};

export function detectSourceLaneGaps(sources: ScoutSourceLike[]): CoverageDimension[] {
  const corpus = sources
    .map((source) => `${source.title || ''} ${source.snippet || ''}`)
    .join('\n');
  return LANE_TOKENS.filter(({ tokens }) => !tokens.test(corpus)).map(({ lane }) => lane);
}

export function buildGapQueries(toolName: string, gaps: CoverageDimension[]): string[] {
  return gaps.slice(0, 4).map((gap) => GAP_QUERY_TEMPLATES[gap](toolName));
}
