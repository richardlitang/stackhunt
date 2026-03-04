import { formatToolPageVerifiedDate } from '@/lib/tool-page/source-labels';

export interface ToolPageReviewLike {
  updated_at?: string | null;
  created_at?: string | null;
}

export interface DeriveToolPageReviewSignalsInput {
  firstReview: ToolPageReviewLike | null;
  toolLastVerifiedAt?: string | null;
  toolPricingVerifiedAt?: string | null;
  extractionDate?: string | null;
}

export interface ToolPageReviewSignals {
  firstReviewUpdatedAt: string | null;
  firstReviewCreatedAt: string | null;
  pricingVerifiedLabel: string | null;
  specsVerifiedLabel: string | null;
  communityVerifiedLabel: string | null;
}

export function deriveToolPageReviewSignals(
  input: DeriveToolPageReviewSignalsInput
): ToolPageReviewSignals {
  const firstReviewUpdatedAt = input.firstReview?.updated_at || null;
  const firstReviewCreatedAt = input.firstReview?.created_at || null;
  const pricingVerifiedLabel = formatToolPageVerifiedDate(
    input.toolPricingVerifiedAt || input.toolLastVerifiedAt || null
  );
  const specsVerifiedLabel = formatToolPageVerifiedDate(
    input.extractionDate || input.toolLastVerifiedAt || null
  );
  const communityVerifiedLabel = formatToolPageVerifiedDate(
    firstReviewUpdatedAt || firstReviewCreatedAt || input.toolLastVerifiedAt || null
  );

  return {
    firstReviewUpdatedAt,
    firstReviewCreatedAt,
    pricingVerifiedLabel,
    specsVerifiedLabel,
    communityVerifiedLabel,
  };
}
