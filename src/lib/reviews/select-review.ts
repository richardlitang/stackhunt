export interface ToolPageReviewLike {
  status?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
}

export interface ToolPageReviewSelection<T extends ToolPageReviewLike> {
  firstPublished: T | null;
  freshestUnpublished: T | null;
  hasNewerUnpublishedThanPublished: boolean;
  hasPublishedReview: boolean;
  hasDraftReview: boolean;
  publishedReviewScore: number | null;
  unpublishedReviewScore: number | null;
}

interface SelectToolPageReviewOptions<T extends ToolPageReviewLike> {
  getReviewScore?: (review: T) => number;
}

function toEpochMs(value: unknown): number {
  if (typeof value !== 'string' || value.trim().length === 0) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function reviewTimestamp(review: ToolPageReviewLike): number {
  return toEpochMs(review.updated_at) || toEpochMs(review.created_at);
}

export function selectToolPageReview<T extends ToolPageReviewLike>(
  reviews: Array<T | null | undefined>,
  options: SelectToolPageReviewOptions<T> = {}
): ToolPageReviewSelection<T> {
  const getReviewScore = options.getReviewScore || (() => 0);
  const validReviews = reviews.filter((review): review is T => Boolean(review));
  const publishedReviews = validReviews
    .filter((review) => review.status === 'published')
    .sort((a, b) => {
      const scoreDelta = getReviewScore(b) - getReviewScore(a);
      if (scoreDelta !== 0) return scoreDelta;
      return reviewTimestamp(b) - reviewTimestamp(a);
    });
  const unpublishedReviews = validReviews
    .filter((review) => review.status === 'draft' || review.status === 'review')
    .sort((a, b) => {
      const scoreDelta = getReviewScore(b) - getReviewScore(a);
      if (scoreDelta !== 0) return scoreDelta;
      return reviewTimestamp(b) - reviewTimestamp(a);
    });
  const firstPublished = publishedReviews[0] || null;
  const freshestUnpublished = unpublishedReviews[0] || null;
  const hasNewerUnpublishedThanPublished =
    Boolean(firstPublished) &&
    Boolean(freshestUnpublished) &&
    reviewTimestamp(freshestUnpublished) > reviewTimestamp(firstPublished);

  return {
    firstPublished,
    freshestUnpublished,
    hasNewerUnpublishedThanPublished,
    hasPublishedReview: publishedReviews.length > 0,
    hasDraftReview: validReviews.some((review) => review.status === 'draft'),
    publishedReviewScore: firstPublished ? getReviewScore(firstPublished) : null,
    unpublishedReviewScore: freshestUnpublished ? getReviewScore(freshestUnpublished) : null,
  };
}
