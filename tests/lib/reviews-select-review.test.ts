import { describe, expect, it } from 'vitest';
import { selectToolPageReview } from '@/lib/reviews/select-review';

describe('selectToolPageReview', () => {
  it('picks latest published review and detects newer unpublished review', () => {
    const selection = selectToolPageReview([
      { status: 'published', updated_at: '2025-01-01T00:00:00.000Z' },
      { status: 'draft', updated_at: '2025-02-01T00:00:00.000Z' },
      { status: 'published', updated_at: '2024-12-01T00:00:00.000Z' },
    ]);

    expect(selection.firstPublished?.updated_at).toBe('2025-01-01T00:00:00.000Z');
    expect(selection.freshestUnpublished?.updated_at).toBe('2025-02-01T00:00:00.000Z');
    expect(selection.hasNewerUnpublishedThanPublished).toBe(true);
    expect(selection.hasPublishedReview).toBe(true);
    expect(selection.hasDraftReview).toBe(true);
  });

  it('returns nulls and false flags when no qualifying reviews exist', () => {
    const selection = selectToolPageReview([{ status: 'queued' }, null, undefined]);

    expect(selection.firstPublished).toBeNull();
    expect(selection.freshestUnpublished).toBeNull();
    expect(selection.hasNewerUnpublishedThanPublished).toBe(false);
    expect(selection.hasPublishedReview).toBe(false);
    expect(selection.hasDraftReview).toBe(false);
  });

  it('prefers higher-scoring published review over fresher review when score callback is provided', () => {
    const oldHighScoreReview = {
      id: 'old-high',
      status: 'published',
      updated_at: '2025-01-01T00:00:00.000Z',
    };
    const freshLowScoreReview = {
      id: 'fresh-low',
      status: 'published',
      updated_at: '2025-02-01T00:00:00.000Z',
    };

    const selection = selectToolPageReview([oldHighScoreReview, freshLowScoreReview], {
      getReviewScore: (review) => (review.id === 'old-high' ? 10 : 1),
    });

    expect(selection.firstPublished?.id).toBe('old-high');
    expect(selection.publishedReviewScore).toBe(10);
  });
});
