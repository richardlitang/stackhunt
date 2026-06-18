import { describe, expect, it } from 'vitest';
import { buildToolPageDisplaySignals } from '@/lib/tool-page/presentation/display-signals';

describe('tool page display signals', () => {
  it('builds pricing label and sanitized verdict text', () => {
    const result = buildToolPageDisplaySignals({
      toolPricingType: 'freemium',
      reviewSummaryMarkdown: 'Best for teams with clear rollout owner.',
      toolVerdict: null,
      humanVerdict: null,
    });

    expect(result.pricingTypeLabel).toBe('Freemium');
    expect(result.renderVerdict).toContain('Best for teams');
  });

  it('falls back to tool/human verdicts when review summary is missing', () => {
    const result = buildToolPageDisplaySignals({
      toolPricingType: null,
      reviewSummaryMarkdown: null,
      toolVerdict: null,
      humanVerdict: 'Human-authored verdict.',
    });

    expect(result.pricingTypeLabel).toBe('Paid');
    expect(result.renderVerdict).toContain('Human-authored verdict');
  });
});
