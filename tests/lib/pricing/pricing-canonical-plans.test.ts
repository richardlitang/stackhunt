import { describe, expect, it } from 'vitest';
import { buildCanonicalPricingPlans, inferTargetMarket } from '@/lib/pricing/canonical-plans';

describe('canonical pricing plans (characterization)', () => {
  it('handles empty plan input without throwing', () => {
    expect(() => inferTargetMarket([])).not.toThrow();
    expect(() => buildCanonicalPricingPlans(null)).not.toThrow();
  });

  it('infers enterprise-only plan sets as enterprise', () => {
    expect(inferTargetMarket([{ target_audience: 'enterprise' }])).toBe('enterprise');
  });

  it('builds canonical plan entities and surfaces conflicting monthly prices', () => {
    const result = buildCanonicalPricingPlans({
      pricing_page_url: 'https://example.com/pricing',
      currency: 'USD',
      plans: [
        {
          id: 'pro',
          name: 'Pro',
          target_audience: 'business',
          scaling_unit: 'seat',
          price_monthly: 10,
          price_annual: 8,
        },
        {
          id: 'pro',
          name: 'Pro',
          target_audience: 'business',
          scaling_unit: 'seat',
          price_monthly: 12,
          price_annual: 8,
        },
      ],
    });

    expect(result.entities).toHaveLength(2);
    expect(result.entities[0]?.plan_id).toBe('pro');
    expect(result.conflicts).toEqual([
      {
        key: 'pro|business:price_monthly',
        values: [10, 12],
        urls: ['https://example.com/pricing'],
      },
    ]);
  });
});
