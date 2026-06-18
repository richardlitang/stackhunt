import { evaluateStrictPublishGate } from '@/lib/review-publish-gate';
import {
  evaluateToolPageProvisionalIndexEligibility,
  type ToolPageProvisionalReviewLike,
} from '@/lib/tool-page/policy/provisional-index';
import type { Review, Tool } from '@/types/database';

interface ToolPageReviewProgressInput {
  tool: Tool;
  firstReview:
    | (ToolPageProvisionalReviewLike & Pick<Review, 'summary_markdown' | 'cons' | 'sources'>)
    | null;
  gateReasons: string[];
}

export interface ToolPageReviewProgress {
  strictGateBlockers: string[];
  showReviewInProgressBanner: boolean;
  provisionalReasons: string[];
}

export function deriveToolPageReviewProgress(
  input: ToolPageReviewProgressInput
): ToolPageReviewProgress {
  const strictGateBlockers = input.firstReview
    ? evaluateStrictPublishGate(input.tool, input.firstReview).blockers
    : [];
  const provisionalIndexEligibility = evaluateToolPageProvisionalIndexEligibility({
    firstReview: input.firstReview,
    gateReasons: input.gateReasons,
    strictBlockers: strictGateBlockers,
  });

  return {
    strictGateBlockers,
    showReviewInProgressBanner: provisionalIndexEligibility.allowed,
    provisionalReasons: provisionalIndexEligibility.reasons,
  };
}
