import { buildToolPagePrepDecisionStateFromDecisionContext } from '@/lib/tool-page/prep-decision-decision-context';
import { buildToolPageReviewEvidenceStateFromDecisionContext } from '@/lib/tool-page/review-evidence-decision-context';

interface BuildToolPagePrepReviewEvidenceStateFromDecisionContextInput {
  prepDecision: Parameters<typeof buildToolPagePrepDecisionStateFromDecisionContext>[0];
  reviewEvidence: {
    reviewArtifacts: Parameters<
      typeof buildToolPageReviewEvidenceStateFromDecisionContext
    >[0]['reviewArtifacts'];
    evidenceContext: Omit<
      Parameters<typeof buildToolPageReviewEvidenceStateFromDecisionContext>[0]['evidenceContext'],
      'isDisallowedConClaim' | 'toEvidenceBullet' | 'hasPricing' | 'faqItems'
    >;
    reviewContextSignals: Parameters<
      typeof buildToolPageReviewEvidenceStateFromDecisionContext
    >[0]['reviewContextSignals'];
  };
}

export function buildToolPagePrepReviewEvidenceStateFromDecisionContext(
  input: BuildToolPagePrepReviewEvidenceStateFromDecisionContextInput
): {
  prepState: ReturnType<typeof buildToolPagePrepDecisionStateFromDecisionContext>['prepState'];
  decisionSectionState: ReturnType<
    typeof buildToolPagePrepDecisionStateFromDecisionContext
  >['decisionSectionState'];
  reviewArtifactsState: ReturnType<
    typeof buildToolPageReviewEvidenceStateFromDecisionContext
  >['reviewArtifactsState'];
  evidenceSignalsState: ReturnType<
    typeof buildToolPageReviewEvidenceStateFromDecisionContext
  >['evidenceSignalsState'];
} {
  const { prepState, decisionSectionState } = buildToolPagePrepDecisionStateFromDecisionContext(
    input.prepDecision
  );
  const { reviewArtifactsState, evidenceSignalsState } =
    buildToolPageReviewEvidenceStateFromDecisionContext({
      reviewArtifacts: input.reviewEvidence.reviewArtifacts,
      evidenceContext: {
        ...input.reviewEvidence.evidenceContext,
        toEvidenceBullet: prepState.toEvidenceBullet,
        hasPricing: decisionSectionState.decisionRuntime.hasPricing,
        faqItems: decisionSectionState.faqState.faqItems.map((item) => ({
          question: typeof item.question === 'string' ? item.question : '',
          answer: typeof item.answer === 'string' ? item.answer : '',
          answer_source_url:
            typeof item.answer_source_url === 'string' || item.answer_source_url === null
              ? item.answer_source_url
              : null,
        })),
      },
      reviewContextSignals: input.reviewEvidence.reviewContextSignals,
      prepState,
      decisionRuntime: decisionSectionState.decisionRuntime,
      qualityState: decisionSectionState.qualityState,
    });

  return { prepState, decisionSectionState, reviewArtifactsState, evidenceSignalsState };
}
