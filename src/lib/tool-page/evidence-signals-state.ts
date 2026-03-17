import { buildToolPageConstraintEvidence } from '@/lib/tool-page/constraint-evidence';
import { buildToolPageConstraintEvidenceView } from '@/lib/tool-page/constraint-evidence-view';
import { buildToolPageEvidenceRuntimeInput } from '@/lib/tool-page/evidence-runtime-input';
import { buildToolPageEvidenceRuntime } from '@/lib/tool-page/evidence-runtime';
import { buildToolPageReviewSignalsInput } from '@/lib/tool-page/review-signals-input';
import { deriveToolPageReviewSignals } from '@/lib/tool-page/review-signals';
import { buildToolPageReviewSignalsView } from '@/lib/tool-page/review-signals-view';

interface BuildToolPageEvidenceSignalsStateInput {
  reviewSignalsInput: Parameters<typeof buildToolPageReviewSignalsInput>[0];
  constraintEvidenceInput: Parameters<typeof buildToolPageConstraintEvidence>[0];
  evidenceRuntimeInput: Omit<
    Parameters<typeof buildToolPageEvidenceRuntimeInput>[0],
    | 'hiddenCostBullets'
    | 'hardLimitFromConstraints'
    | 'pricingVerifiedLabel'
    | 'specsVerifiedLabel'
    | 'communityVerifiedLabel'
  >;
}

export function buildToolPageEvidenceSignalsState(input: BuildToolPageEvidenceSignalsStateInput): {
  reviewSignals: ReturnType<typeof deriveToolPageReviewSignals>;
  reviewSignalsView: ReturnType<typeof buildToolPageReviewSignalsView>;
  evidenceRuntime: ReturnType<typeof buildToolPageEvidenceRuntime>;
} {
  const reviewSignals = deriveToolPageReviewSignals(
    buildToolPageReviewSignalsInput(input.reviewSignalsInput)
  );
  const reviewSignalsView = buildToolPageReviewSignalsView(reviewSignals);
  const constraintEvidence = buildToolPageConstraintEvidence(input.constraintEvidenceInput);
  const { hiddenCostBullets, hardLimitFromConstraints } =
    buildToolPageConstraintEvidenceView(constraintEvidence);
  const evidenceRuntime = buildToolPageEvidenceRuntime(
    buildToolPageEvidenceRuntimeInput({
      ...input.evidenceRuntimeInput,
      hiddenCostBullets,
      hardLimitFromConstraints,
      pricingVerifiedLabel: reviewSignalsView.pricingVerifiedLabel,
      specsVerifiedLabel: reviewSignalsView.specsVerifiedLabel,
      communityVerifiedLabel: reviewSignalsView.communityVerifiedLabel,
    })
  );

  return {
    reviewSignals,
    reviewSignalsView,
    evidenceRuntime,
  };
}
