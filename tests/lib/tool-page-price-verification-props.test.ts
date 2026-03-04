import { describe, expect, it } from 'vitest';
import { buildToolPagePriceVerificationProps } from '@/lib/tool-page/price-verification-props';

describe('tool page price verification props', () => {
  it('defaults verification count to zero', () => {
    const result = buildToolPagePriceVerificationProps({
      toolId: '1',
      toolName: 'Tool',
      currentPrice: null,
      pricingType: null,
      verificationCount: undefined,
    });

    expect(result.verificationCount).toBe(0);
    expect(result.variant).toBe('inline');
  });
});
