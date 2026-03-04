import type { ToolPageReviewSignals } from '@/lib/tool-page/review-signals';

export function buildToolPageReviewSignalsView(
  reviewSignals: ToolPageReviewSignals
): {
  pricingVerifiedLabel: string | null;
  specsVerifiedLabel: string | null;
  communityVerifiedLabel: string | null;
} {
  return {
    pricingVerifiedLabel: reviewSignals.pricingVerifiedLabel,
    specsVerifiedLabel: reviewSignals.specsVerifiedLabel,
    communityVerifiedLabel: reviewSignals.communityVerifiedLabel,
  };
}
