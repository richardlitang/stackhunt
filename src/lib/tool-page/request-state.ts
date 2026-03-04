import type { ReviewLens } from '@/lib/tool-page/view-model';

const REVIEW_LENSES: ReadonlyArray<ReviewLens> = ['general', 'personal', 'startup', 'enterprise'];

export interface ToolPageRequestState {
  activeReviewLens: ReviewLens;
  hasVersionBypassParam: boolean;
}

export function deriveToolPageRequestState(searchParams: URLSearchParams): ToolPageRequestState {
  const lensParam = (searchParams.get('lens') || '').toLowerCase();
  const activeReviewLens: ReviewLens = REVIEW_LENSES.includes(lensParam as ReviewLens)
    ? (lensParam as ReviewLens)
    : 'general';

  return {
    activeReviewLens,
    hasVersionBypassParam: searchParams.has('v'),
  };
}
