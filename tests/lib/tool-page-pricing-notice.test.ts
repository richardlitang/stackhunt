import { describe, expect, it } from 'vitest';
import { buildToolPagePricingNotice } from '@/lib/tool-page/pricing-notice';

describe('tool page pricing notice', () => {
  it('includes checked label when available', () => {
    expect(buildToolPagePricingNotice({ pricingCheckedLabel: 'today' })).toContain(
      'Shown as of today'
    );
  });

  it('returns pending-check notice when label missing', () => {
    expect(buildToolPagePricingNotice({ pricingCheckedLabel: null })).toContain(
      'most reliable cost drivers are seats, workspace count, and plan tier'
    );
  });
});
