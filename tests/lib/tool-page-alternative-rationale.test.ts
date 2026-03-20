import { describe, expect, it } from 'vitest';
import { buildAlternativeRebuttalAngle } from '@/lib/tool-page/alternative-rationale';

describe('tool page alternative rationale', () => {
  it('maps pricing diffs to cheaper-at-scale rebuttal angle', () => {
    const result = buildAlternativeRebuttalAngle({
      curatedVerdict: null,
      computedDiff: { priceDiff: 'Free vs $29 per seat' },
    });
    expect(result).toBe('Cheaper at scale');
  });

  it('maps governance language in curated verdict to governance angle', () => {
    const result = buildAlternativeRebuttalAngle({
      curatedVerdict: 'Choose this for stricter governance and audit controls.',
      computedDiff: null,
    });
    expect(result).toBe('Stronger governance');
  });
});
