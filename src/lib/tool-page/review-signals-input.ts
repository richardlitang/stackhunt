import type { DeriveToolPageReviewSignalsInput } from '@/lib/tool-page/review-signals';

interface BuildToolPageReviewSignalsInputContext {
  firstReview: DeriveToolPageReviewSignalsInput['firstReview'];
  toolLastVerifiedAt: string | null;
  toolPricingVerifiedAt: string | null;
  extractionDate: string | null;
}

export function buildToolPageReviewSignalsInput(
  input: BuildToolPageReviewSignalsInputContext
): DeriveToolPageReviewSignalsInput {
  return {
    firstReview: input.firstReview,
    toolLastVerifiedAt: input.toolLastVerifiedAt,
    toolPricingVerifiedAt: input.toolPricingVerifiedAt,
    extractionDate: input.extractionDate,
  };
}
