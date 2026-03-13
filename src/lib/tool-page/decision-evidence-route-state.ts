import type { buildToolPageDecisionSectionState } from '@/lib/tool-page/decision-section-state';
import type { buildToolPageReviewArtifactsState } from '@/lib/tool-page/review-artifacts-state';
import type { buildToolPageEvidenceSignalsState } from '@/lib/tool-page/evidence-signals-state';

interface BuildToolPageDecisionEvidenceRouteStateInput {
  decisionSectionState: ReturnType<typeof buildToolPageDecisionSectionState>;
  reviewArtifactsState: ReturnType<typeof buildToolPageReviewArtifactsState>;
  evidenceSignalsState: ReturnType<typeof buildToolPageEvidenceSignalsState>;
}

export function buildToolPageDecisionEvidenceRouteState(
  input: BuildToolPageDecisionEvidenceRouteStateInput
): {
  qualityState: ReturnType<typeof buildToolPageDecisionSectionState>['qualityState'];
  faqItems: ReturnType<typeof buildToolPageDecisionSectionState>['faqState']['faqItems'];
  pricingTypeLabel: ReturnType<
    typeof buildToolPageDecisionSectionState
  >['displaySignals']['pricingTypeLabel'];
  decisionRuntime: ReturnType<typeof buildToolPageDecisionSectionState>['decisionRuntime'];
  sectionFlags: ReturnType<typeof buildToolPageDecisionSectionState>['sectionFlags'];
  presentationGates: ReturnType<typeof buildToolPageDecisionSectionState>['presentationGates'];
  faqSchema: ReturnType<typeof buildToolPageDecisionSectionState>['faqSchema'];
  reviewArtifactsState: ReturnType<typeof buildToolPageReviewArtifactsState>;
  reviewSignalsView: ReturnType<typeof buildToolPageEvidenceSignalsState>['reviewSignalsView'];
  evidenceRuntime: ReturnType<typeof buildToolPageEvidenceSignalsState>['evidenceRuntime'];
} {
  return {
    qualityState: input.decisionSectionState.qualityState,
    faqItems: input.decisionSectionState.faqState.faqItems,
    pricingTypeLabel: input.decisionSectionState.displaySignals.pricingTypeLabel,
    decisionRuntime: input.decisionSectionState.decisionRuntime,
    sectionFlags: input.decisionSectionState.sectionFlags,
    presentationGates: input.decisionSectionState.presentationGates,
    faqSchema: input.decisionSectionState.faqSchema,
    reviewArtifactsState: input.reviewArtifactsState,
    reviewSignalsView: input.evidenceSignalsState.reviewSignalsView,
    evidenceRuntime: input.evidenceSignalsState.evidenceRuntime,
  };
}
