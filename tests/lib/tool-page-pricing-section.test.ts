import { describe, expect, it } from 'vitest';
import { buildToolPagePricingSectionState } from '@/lib/tool-page/pricing-section';

describe('tool page pricing section state', () => {
  it('builds checked lead when label exists', () => {
    expect(buildToolPagePricingSectionState({ pricingCheckedLabel: 'today' }).checkedLead).toBe(
      'Pricing checked today'
    );
  });

  it('returns null checked lead when label missing', () => {
    expect(buildToolPagePricingSectionState({ pricingCheckedLabel: null }).checkedLead).toBeNull();
  });
});
