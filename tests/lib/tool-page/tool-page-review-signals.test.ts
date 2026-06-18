import { describe, expect, it } from 'vitest';
import { deriveToolPageReviewSignals } from '@/lib/tool-page/evidence/review-signals';

describe('tool page review signals', () => {
  it('derives labels and timestamps from review and tool dates', () => {
    const result = deriveToolPageReviewSignals({
      firstReview: {
        updated_at: '2026-03-01T00:00:00.000Z',
        created_at: '2026-02-25T00:00:00.000Z',
      },
      toolLastVerifiedAt: '2026-02-20T00:00:00.000Z',
      toolPricingVerifiedAt: '2026-02-28T00:00:00.000Z',
      extractionDate: '2026-02-27T00:00:00.000Z',
    });

    expect(result.firstReviewUpdatedAt).toBe('2026-03-01T00:00:00.000Z');
    expect(result.firstReviewCreatedAt).toBe('2026-02-25T00:00:00.000Z');
    expect(result.pricingVerifiedLabel).toBeTruthy();
    expect(result.specsVerifiedLabel).toBeTruthy();
    expect(result.communityVerifiedLabel).toBeTruthy();
  });

  it('falls back safely when review is missing', () => {
    const result = deriveToolPageReviewSignals({
      firstReview: null,
      toolLastVerifiedAt: '2026-02-20T00:00:00.000Z',
      toolPricingVerifiedAt: null,
      extractionDate: null,
    });

    expect(result.firstReviewUpdatedAt).toBeNull();
    expect(result.firstReviewCreatedAt).toBeNull();
    expect(result.pricingVerifiedLabel).toBeTruthy();
    expect(result.specsVerifiedLabel).toBeTruthy();
    expect(result.communityVerifiedLabel).toBeTruthy();
  });
});
