import { describe, expect, it } from 'vitest';
import { buildToolPageReviewSignalsView } from '@/lib/tool-page/review-signals-view';

describe('tool page review signals view', () => {
  it('projects verification labels from review signals', () => {
    const result = buildToolPageReviewSignalsView({
      firstReviewUpdatedAt: '2026-03-04',
      firstReviewCreatedAt: '2026-03-01',
      pricingVerifiedLabel: 'Mar 4, 2026',
      specsVerifiedLabel: 'Mar 3, 2026',
      communityVerifiedLabel: 'Mar 2, 2026',
    });

    expect(result.pricingVerifiedLabel).toBe('Mar 4, 2026');
    expect(result.specsVerifiedLabel).toBe('Mar 3, 2026');
    expect(result.communityVerifiedLabel).toBe('Mar 2, 2026');
  });
});
