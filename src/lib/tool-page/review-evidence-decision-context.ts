import type { buildToolPageDecisionRuntime } from '@/lib/tool-page/decision-runtime';
import type { buildToolPagePrepState } from '@/lib/tool-page/prep-state';
import type { buildToolPageQualityState } from '@/lib/tool-page/quality-state';
import type { ToolPageReviewContextSignals } from '@/lib/tool-page/review-context';
import { buildToolPageReviewEvidenceStateFromRouteContext } from '@/lib/tool-page/review-evidence-state';

interface BuildToolPageReviewEvidenceStateFromDecisionContextInput {
  reviewArtifacts: Parameters<
    typeof buildToolPageReviewEvidenceStateFromRouteContext
  >[0]['reviewArtifacts'];
  evidenceContext: {
    firstReview: Parameters<
      typeof buildToolPageReviewEvidenceStateFromRouteContext
    >[0]['evidenceSignals']['firstReview'];
    toolLastVerifiedAt: Parameters<
      typeof buildToolPageReviewEvidenceStateFromRouteContext
    >[0]['evidenceSignals']['toolLastVerifiedAt'];
    toolPricingVerifiedAt: Parameters<
      typeof buildToolPageReviewEvidenceStateFromRouteContext
    >[0]['evidenceSignals']['toolPricingVerifiedAt'];
    extractionDate: Parameters<
      typeof buildToolPageReviewEvidenceStateFromRouteContext
    >[0]['evidenceSignals']['extractionDate'];
    constraints: Parameters<
      typeof buildToolPageReviewEvidenceStateFromRouteContext
    >[0]['evidenceSignals']['constraints'];
    isEligibleEvidenceUrl: Parameters<
      typeof buildToolPageReviewEvidenceStateFromRouteContext
    >[0]['evidenceSignals']['isEligibleEvidenceUrl'];
    reviewPros: Parameters<
      typeof buildToolPageReviewEvidenceStateFromRouteContext
    >[0]['evidenceSignals']['reviewPros'];
    reviewCons: Parameters<
      typeof buildToolPageReviewEvidenceStateFromRouteContext
    >[0]['evidenceSignals']['reviewCons'];
    globalPros: Parameters<
      typeof buildToolPageReviewEvidenceStateFromRouteContext
    >[0]['evidenceSignals']['globalPros'];
    globalCons: Parameters<
      typeof buildToolPageReviewEvidenceStateFromRouteContext
    >[0]['evidenceSignals']['globalCons'];
    toEvidenceBullet: Parameters<
      typeof buildToolPageReviewEvidenceStateFromRouteContext
    >[0]['evidenceSignals']['toEvidenceBullet'];
    hasPricing: boolean;
    knowledgeCard: Parameters<
      typeof buildToolPageReviewEvidenceStateFromRouteContext
    >[0]['evidenceSignals']['knowledgeCard'];
    faqItems: Parameters<
      typeof buildToolPageReviewEvidenceStateFromRouteContext
    >[0]['evidenceSignals']['faqItems'];
  };
  decisionRuntime: Pick<
    ReturnType<typeof buildToolPageDecisionRuntime>,
    'isDisallowedConClaim' | 'decisionSnapshotWatchOuts' | 'decisionTradeoffSummaryInitial'
  >;
  prepState: Pick<ReturnType<typeof buildToolPagePrepState>, 'buildEvidenceBulletV2'>;
  qualityState: Pick<ReturnType<typeof buildToolPageQualityState>, 'sectionStatus'>;
  reviewContextSignals: Pick<
    ToolPageReviewContextSignals,
    'budgetCostDrivers' | 'budgetOneTimeFees' | 'budgetCommitmentTerms' | 'budgetRoiThreshold'
  >;
}

export function buildToolPageReviewEvidenceStateFromDecisionContext(
  input: BuildToolPageReviewEvidenceStateFromDecisionContextInput
): ReturnType<typeof buildToolPageReviewEvidenceStateFromRouteContext> {
  return buildToolPageReviewEvidenceStateFromRouteContext({
    reviewArtifacts: input.reviewArtifacts,
    evidenceSignals: {
      firstReview: input.evidenceContext.firstReview,
      toolLastVerifiedAt: input.evidenceContext.toolLastVerifiedAt,
      toolPricingVerifiedAt: input.evidenceContext.toolPricingVerifiedAt,
      extractionDate: input.evidenceContext.extractionDate,
      constraints: input.evidenceContext.constraints,
      isEligibleEvidenceUrl: input.evidenceContext.isEligibleEvidenceUrl,
      isDisallowedConClaim: input.decisionRuntime.isDisallowedConClaim,
      reviewPros: input.evidenceContext.reviewPros,
      reviewCons: input.evidenceContext.reviewCons,
      globalPros: input.evidenceContext.globalPros,
      globalCons: input.evidenceContext.globalCons,
      toEvidenceBullet: input.evidenceContext.toEvidenceBullet,
      decisionSnapshotWatchOuts: input.decisionRuntime.decisionSnapshotWatchOuts,
      decisionTradeoffSummaryInitial: input.decisionRuntime.decisionTradeoffSummaryInitial,
      hasPricing: input.evidenceContext.hasPricing,
      knowledgeCard: input.evidenceContext.knowledgeCard,
      sectionPricingStatus: input.qualityState.sectionStatus.pricing || 'hide',
      budgetCostDrivers: input.reviewContextSignals.budgetCostDrivers,
      budgetOneTimeFees: input.reviewContextSignals.budgetOneTimeFees,
      budgetCommitmentTerms: input.reviewContextSignals.budgetCommitmentTerms,
      budgetRoiThreshold: input.reviewContextSignals.budgetRoiThreshold,
      faqItems: input.evidenceContext.faqItems,
      buildEvidenceBulletV2: input.prepState.buildEvidenceBulletV2,
    },
  });
}
