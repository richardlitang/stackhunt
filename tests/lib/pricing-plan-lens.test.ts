import {
  derivePlanLensTags,
  enrichSmpPricingForLens,
  filterPlansForLens,
  inferPlanTargetAudience,
} from '@/lib/pricing/plan-lens';

describe('pricing plan lens tagging', () => {
  it('infers enterprise audience from plan signals', () => {
    expect(
      inferPlanTargetAudience({
        name: 'Custom Enterprise',
        is_enterprise: true,
      })
    ).toBe('enterprise');
  });

  it('derives lens tags from target audience', () => {
    expect(derivePlanLensTags({ target_audience: 'individual' })).toEqual(['personal']);
    expect(derivePlanLensTags({ target_audience: 'team' })).toEqual(['startup']);
    expect(derivePlanLensTags({ target_audience: 'enterprise' })).toEqual(['enterprise']);
  });

  it('keeps source-provided lens tags when present', () => {
    expect(
      derivePlanLensTags({
        target_audience: 'enterprise',
        works_for_lenses: ['startup', 'enterprise'],
      })
    ).toEqual(['startup', 'enterprise']);
  });

  it('enriches pricing plans with audience and works_for_lenses', () => {
    const result = enrichSmpPricingForLens({
      model: 'tiered',
      currency: 'USD',
      billing_cycles: ['monthly'],
      plans: [
        { id: 'acme-free', name: 'Free', price_monthly: 0, price_annual: 0, is_enterprise: false },
        { id: 'acme-enterprise', name: 'Enterprise', is_enterprise: true },
      ],
      confidence: 'medium',
      discounts_available: [],
      is_standalone: true,
    });

    expect(result?.plans[0]?.target_audience).toBe('individual');
    expect(result?.plans[0]?.works_for_lenses).toEqual(['personal']);
    expect(result?.plans[1]?.target_audience).toBe('enterprise');
    expect(result?.plans[1]?.works_for_lenses).toEqual(['enterprise']);
  });

  it('filters plans by lens with fallback to all plans', () => {
    const plans = [
      { name: 'Free', target_audience: 'individual' as const },
      { name: 'Team', target_audience: 'team' as const },
      { name: 'Enterprise', target_audience: 'enterprise' as const },
    ];
    expect(filterPlansForLens(plans, 'personal').map((plan) => plan.name)).toEqual(['Free']);
    expect(filterPlansForLens(plans, 'enterprise').map((plan) => plan.name)).toEqual([
      'Enterprise',
    ]);
    expect(filterPlansForLens(plans, 'startup').map((plan) => plan.name)).toEqual(['Team']);
  });
});
