import { describe, expect, it } from 'vitest';
import { computeComparison } from '@/lib/analysis/comparator';
import type { Item, PricingV2ProductPricing, ToolSpecs } from '@/types/database';
import { mergeDefined } from '@/lib/utils/merge-defined';

function evidence() {
  return [
    {
      url: 'https://example.com/pricing',
      source_type: 'official' as const,
      retrieved_at: '2026-02-06T00:00:00.000Z',
      claim_id: 'claim-1',
      policy_snapshot: {
        acquisition_mode: 'SCRAPE_ALLOWED' as const,
        llm_ingestion_allowed: 'YES_LIMITED' as const,
      },
    },
  ];
}

function makePricingV2(currency: string, planDefs: Array<{ id: string; name: string; price: number; isFree: boolean }>): PricingV2ProductPricing {
  return {
    product_id: `product-${currency}`,
    official_pricing_url: 'https://example.com/pricing',
    currency_default: currency,
    meters: [{ id: 'seat', label: 'Seat', unit_ucum: '1', category: 'team' }],
    plans: planDefs.map((plan) => ({
      id: plan.id,
      name: plan.name,
      is_free: plan.isFree,
      is_enterprise: false,
      billing_options: [
        {
          cadence: 'monthly',
          price_components: [
            {
              id: `${plan.id}-monthly-base`,
              component_kind: 'base',
              meter_id: null,
              rate_type: 'flat',
              cadence: 'monthly',
              timing: 'in_advance',
              currency,
              is_optional: false,
              flat_price: plan.price,
              evidence: evidence(),
              validation_status: 'verified',
            },
          ],
        },
      ],
      evidence: evidence(),
    })),
    last_verified_at: '2026-02-06T00:00:00.000Z',
    confidence: 'high',
    conflicts: [],
  };
}

function makeToolItem(name: string, slug: string, pricingV2: PricingV2ProductPricing): Item {
  const specs: ToolSpecs = { pricing_v2: pricingV2 };
  return {
    id: `${slug}-id`,
    name,
    slug,
    website: null,
    logo_path: null,
    logo_url: null,
    short_description: null,
    long_description: null,
    pricing_type: 'paid',
    avg_score: 0,
    review_count: 0,
    embedding: null,
    metadata: null,
    is_featured: false,
    is_verified: false,
    type: 'tool',
    video_id: null,
    video_title: null,
    verdict: null,
    base_score: null,
    last_major_update: null,
    specs,
    base_score_breakdown: {},
    data_confidence: 0.9,
    learning_curve: null,
    pricing_verified_at: null,
    pricing_confidence: null,
    review_context: null,
    parent_id: null,
    effective_starting_price_monthly: null,
    effective_starting_price_annual: null,
    pricing_comparison_tier: null,
    pricing_comparison_plan_id: null,
    normalized_price_per_seat_monthly: null,
    normalized_price_per_seat_annual: null,
    created_at: '2026-02-06T00:00:00.000Z',
    updated_at: '2026-02-06T00:00:00.000Z',
  };
}

describe('pricing v2 comparator behavior', () => {
  it('uses paid-entry baseline and does not rank freemium by free tier', () => {
    const freemium = makeToolItem(
      'FreemiumTool',
      'freemium-tool',
      makePricingV2('USD', [
        { id: 'free', name: 'Free', price: 0, isFree: true },
        { id: 'pro', name: 'Pro', price: 30, isFree: false },
      ])
    );
    const paid = makeToolItem(
      'PaidTool',
      'paid-tool',
      makePricingV2('USD', [{ id: 'starter', name: 'Starter', price: 20, isFree: false }])
    );

    const result = computeComparison(freemium, paid);
    if (result.type !== 'tool') throw new Error('Expected tool comparison');

    expect(result.price.winner).toBe('b');
    expect(result.price.a).toContain('USD');
    expect(result.price.b).toContain('USD');
  });

  it('returns unknown winner when currencies mismatch under same-currency guard', () => {
    const usdTool = makeToolItem(
      'UsdTool',
      'usd-tool',
      makePricingV2('USD', [{ id: 'starter', name: 'Starter', price: 20, isFree: false }])
    );
    const eurTool = makeToolItem(
      'EurTool',
      'eur-tool',
      makePricingV2('EUR', [{ id: 'starter', name: 'Starter', price: 10, isFree: false }])
    );

    const result = computeComparison(usdTool, eurTool);
    if (result.type !== 'tool') throw new Error('Expected tool comparison');

    expect(result.price.winner).toBe('unknown');
    expect(result.price.a).toContain('USD');
    expect(result.price.b).toContain('EUR');
  });
});

describe('mergeDefined', () => {
  it('does not overwrite existing fields with null/undefined patch values', () => {
    const merged = mergeDefined(
      {
        pricing_data: { model: 'flat' },
        pricing_v2: { plans: ['existing'] },
      },
      {
        pricing_data: { model: 'per_seat' },
        pricing_v2: null as unknown as { plans: string[] },
      }
    );

    expect(merged.pricing_data).toEqual({ model: 'per_seat' });
    expect(merged.pricing_v2).toEqual({ plans: ['existing'] });
  });
});

