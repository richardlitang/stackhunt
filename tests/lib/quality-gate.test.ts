import { describe, expect, it } from 'vitest';
import { evaluateIndexReadiness } from '@/lib/quality-gate';

function buildTool(overrides: Record<string, unknown> = {}): any {
  return {
    id: 'tool-1',
    name: 'Mailchimp',
    slug: 'mailchimp',
    metadata: {},
    specs: {},
    category: { slug: 'social-media' },
    pricing_verified_at: null,
    updated_at: '2026-03-01T00:00:00.000Z',
    short_description:
      'Email marketing platform with campaign tooling, automations, and audience management.',
    verdict: 'Good fit for teams with established campaign workflows.',
    learning_curve: 'hours',
    ...overrides,
  };
}

function buildReview(overrides: Record<string, unknown> = {}): any {
  return {
    id: 'review-1',
    item_id: 'tool-1',
    context_id: 'context-1',
    score: 82,
    summary_markdown: 'Mailchimp has a free tier with limited contacts and entry automation.',
    pros: ['Has a free tier for small lists'],
    cons: [],
    sentiment_tags: [],
    sources: [
      {
        source_type: 'official',
        url: 'https://mailchimp.com/pricing/',
      },
      {
        source_type: 'official',
        url: 'https://mailchimp.com/help/getting-started-with-mailchimp/',
      },
      {
        source_type: 'official',
        url: 'https://mailchimp.com/developer/',
      },
    ],
    upvotes: 0,
    downvotes: 0,
    display_order: 0,
    fit_score: 80,
    value_rating: 4,
    standout_features: [],
    dealbreakers: [],
    switching_from: [],
    created_at: '2026-03-01T00:00:00.000Z',
    updated_at: '2026-03-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('quality gate revamp checks', () => {
  it('flags free-plan contradiction and blocks index readiness', () => {
    const tool = buildTool({
      metadata: {
        smp_pricing: {
          plans: [{ name: 'Free', price_monthly: 0 }],
        },
      },
      short_description: 'No free tier is available for this product.',
    });
    const review = buildReview({
      summary_markdown: 'No free tier or free trial is currently available.',
      cons: ['No free tier is currently available.'],
    });

    const result = evaluateIndexReadiness(tool, review);
    expect(result.reasons).toContain(
      'content_contradiction:free_plan_conflict:claims_no_free_but_pricing_has_free'
    );
    expect(result.signals.content_contradictions).toContain(
      'free_plan_conflict:claims_no_free_but_pricing_has_free'
    );
    expect(result.signals.conflicts_count).toBeGreaterThan(0);
    expect(result.shouldIndex).toBe(false);
  });

  it('returns section freshness map with stale pricing when old', () => {
    const tool = buildTool({
      pricing_verified_at: '2025-01-01T00:00:00.000Z',
      metadata: {
        smp_pricing: {
          plans: [{ name: 'Pro', price_monthly: 19 }],
        },
      },
    });
    const review = buildReview();

    const result = evaluateIndexReadiness(tool, review);
    expect(result.signals.section_freshness.pricing.status).toBe('stale');
    expect(result.signals.section_freshness.verdict.status).toBe('fresh');
  });
});
