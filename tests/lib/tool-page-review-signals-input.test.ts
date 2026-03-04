import { describe, expect, it } from 'vitest';
import { buildToolPageReviewSignalsInput } from '@/lib/tool-page/review-signals-input';

describe('tool page review signals input', () => {
  it('normalizes route values into review signals input', () => {
    const result = buildToolPageReviewSignalsInput({
      firstReview: { updated_at: '2026-03-01', created_at: '2026-02-25' },
      toolLastVerifiedAt: '2026-03-02',
      toolPricingVerifiedAt: '2026-03-03',
      extractionDate: '2026-03-04',
    });

    expect(result.firstReview?.updated_at).toBe('2026-03-01');
    expect(result.toolLastVerifiedAt).toBe('2026-03-02');
    expect(result.toolPricingVerifiedAt).toBe('2026-03-03');
    expect(result.extractionDate).toBe('2026-03-04');
  });
});
