import { describe, expect, it } from 'vitest';
import { buildToolPageAddToStackProps } from '@/lib/tool-page/add-to-stack-props';

describe('tool page add-to-stack props', () => {
  it('builds pricing payload for add-to-stack button', () => {
    const result = buildToolPageAddToStackProps({
      toolSlug: 'slack',
      toolName: 'Slack',
      toolLogo: null,
      pricingStartingPrice: 10,
      pricingModel: 'per-seat',
      pricingPlans: [{ name: 'Pro' }],
    });

    expect(result.pricing).toEqual({ starting_price: 10, model: 'per-seat' });
    expect(result.plans).toEqual([{ name: 'Pro' }]);
  });
});
