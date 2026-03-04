import { describe, expect, it } from 'vitest';
import { buildToolPageFreshnessLabels } from '@/lib/tool-page/freshness-labels';

describe('tool page freshness labels', () => {
  it('prefers community then specs then pricing for verdict freshness', () => {
    const result = buildToolPageFreshnessLabels({
      communityVerifiedLabel: null,
      specsVerifiedLabel: '2 days ago',
      pricingVerifiedLabel: 'today',
      pricingCheckedLabel: '3 days ago',
    });

    expect(result.verdictAsOfLabel).toBe('2 days ago');
    expect(result.trustBarLastCheckedLabel).toBe('2 days ago');
    expect(result.pricingSectionLastCheckedLabel).toBe('3 days ago');
  });

  it('applies defaults when labels are missing', () => {
    const result = buildToolPageFreshnessLabels({
      communityVerifiedLabel: null,
      specsVerifiedLabel: null,
      pricingVerifiedLabel: null,
      pricingCheckedLabel: null,
    });

    expect(result.verdictAsOfLabel).toBe('the latest review');
    expect(result.trustBarLastCheckedLabel).toBe('Unknown');
    expect(result.pricingSectionLastCheckedLabel).toBe('unknown');
  });
});
