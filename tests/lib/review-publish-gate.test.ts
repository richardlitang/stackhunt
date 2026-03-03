import { describe, expect, it } from 'vitest';
import { evaluateStrictPublishGate } from '@/lib/review-publish-gate';

function baseItem(overrides: Record<string, unknown> = {}): any {
  return {
    id: 'item-1',
    metadata: {
      smp_pricing: {
        pricing_page_url: 'https://example.com/pricing',
      },
    },
    specs: {
      canonical: {
        quality: {
          required_sections_complete: true,
          conflicts_count: 0,
          score: 120,
          noindex_reasons: [],
        },
      },
    },
    pricing_verified_at: '2026-03-01T00:00:00.000Z',
    pricing_confidence: 'high',
    short_description:
      'Tool for lifecycle email automation, segmentation, and campaign analytics with source-backed setup details.',
    verdict:
      'If you need fast onboarding and simple automations, choose this. If enterprise SSO is mandatory on day one, avoid and switch to a stricter enterprise stack.',
    updated_at: '2026-03-01T00:00:00.000Z',
    ...overrides,
  };
}

function baseReview(overrides: Record<string, unknown> = {}): any {
  return {
    summary_markdown:
      'If you need quick campaign launch with reliable templates, choose this platform. If you need strict contract controls on day one, avoid and pick an enterprise-first alternative.',
    cons: [
      {
        text: 'Priority support requires higher plan tiers.',
        source_url: 'https://example.com/pricing',
        checked_at: '2026-03-01T00:00:00.000Z',
        scope: 'teams over 10 seats',
        volatility: 'medium',
      },
    ],
    sources: [
      { source_type: 'official', url: 'https://example.com/pricing' },
      { source_type: 'official', url: 'https://example.com/help/getting-started' },
      { source_type: 'official', url: 'https://example.com/docs/api' },
    ],
    ...overrides,
  };
}

describe('review publish gate copy quality', () => {
  it('blocks generic filler copy and missing scenario recommendations', () => {
    const result = evaluateStrictPublishGate(
      baseItem({
        verdict: 'Great tool for teams.',
        short_description: 'Solid choice for growing companies.',
      }),
      baseReview({
        summary_markdown: 'This is a powerful platform with an intuitive interface that helps you.',
      })
    );

    expect(result.blockers).toContain('strict:copy_missing_scenario_recommendation');
    expect(result.blockers.some((b) => b.startsWith('strict:copy_contains_generic_filler:'))).toBe(
      true
    );
    expect(result.metrics.genericPhraseCount).toBeGreaterThan(0);
    expect(result.pass).toBe(false);
  });

  it('passes copy gate when scenario guidance is concrete and specific', () => {
    const result = evaluateStrictPublishGate(baseItem(), baseReview());

    expect(result.blockers).not.toContain('strict:copy_missing_scenario_recommendation');
    expect(result.metrics.scenarioRecommendationCount).toBeGreaterThan(0);
    expect(result.metrics.copyQualityScore).toBeGreaterThanOrEqual(60);
  });
});
