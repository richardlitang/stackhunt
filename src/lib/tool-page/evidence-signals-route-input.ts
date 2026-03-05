import type { buildToolPageEvidenceSignalsState } from '@/lib/tool-page/evidence-signals-state';
import { toToolPageStringOrNull } from '@/lib/tool-page/route-normalizers';

interface BuildToolPageEvidenceSignalsStateFromRouteInput {
  reviewSignalsInput: Parameters<typeof buildToolPageEvidenceSignalsState>[0]['reviewSignalsInput'];
  constraintEvidenceInput: Parameters<
    typeof buildToolPageEvidenceSignalsState
  >[0]['constraintEvidenceInput'];
  evidenceRuntimeInput: Parameters<
    typeof buildToolPageEvidenceSignalsState
  >[0]['evidenceRuntimeInput'];
}

type ToolPageEvidenceSignalsStateInput = Parameters<typeof buildToolPageEvidenceSignalsState>[0];

interface BuildToolPageEvidenceSignalsStateInputFromRouteContextInput {
  firstReview: ToolPageEvidenceSignalsStateInput['reviewSignalsInput']['firstReview'];
  toolLastVerifiedAt: ToolPageEvidenceSignalsStateInput['reviewSignalsInput']['toolLastVerifiedAt'];
  toolPricingVerifiedAt: ToolPageEvidenceSignalsStateInput['reviewSignalsInput']['toolPricingVerifiedAt'];
  extractionDate: unknown;
  constraints: ToolPageEvidenceSignalsStateInput['constraintEvidenceInput']['constraints'];
  isEligibleEvidenceUrl: ToolPageEvidenceSignalsStateInput['constraintEvidenceInput']['isEligibleEvidenceUrl'];
  isDisallowedConClaim: ToolPageEvidenceSignalsStateInput['constraintEvidenceInput']['isDisallowedConClaim'];
  reviewPros: ToolPageEvidenceSignalsStateInput['evidenceRuntimeInput']['reviewPros'];
  reviewCons: ToolPageEvidenceSignalsStateInput['evidenceRuntimeInput']['reviewCons'];
  globalPros: ToolPageEvidenceSignalsStateInput['evidenceRuntimeInput']['globalPros'];
  globalCons: ToolPageEvidenceSignalsStateInput['evidenceRuntimeInput']['globalCons'];
  toEvidenceBullet: ToolPageEvidenceSignalsStateInput['evidenceRuntimeInput']['toEvidenceBullet'];
  decisionSnapshotWatchOuts: ToolPageEvidenceSignalsStateInput['evidenceRuntimeInput']['decisionSnapshotWatchOuts'];
  decisionTradeoffSummaryInitial: ToolPageEvidenceSignalsStateInput['evidenceRuntimeInput']['decisionTradeoffSummaryInitial'];
  officialEvidenceLinks: ToolPageEvidenceSignalsStateInput['evidenceRuntimeInput']['officialEvidenceLinks'];
  evidenceLinksAll: ToolPageEvidenceSignalsStateInput['evidenceRuntimeInput']['evidenceLinksAll'];
  evidenceLinks: ToolPageEvidenceSignalsStateInput['evidenceRuntimeInput']['evidenceLinks'];
  hasPricing: ToolPageEvidenceSignalsStateInput['evidenceRuntimeInput']['hasPricing'];
  knowledgeCard: ToolPageEvidenceSignalsStateInput['evidenceRuntimeInput']['knowledgeCard'];
  sectionPricingStatus: ToolPageEvidenceSignalsStateInput['evidenceRuntimeInput']['sectionPricingStatus'];
  budgetCostDrivers: ToolPageEvidenceSignalsStateInput['evidenceRuntimeInput']['budgetCostDrivers'];
  budgetOneTimeFees: ToolPageEvidenceSignalsStateInput['evidenceRuntimeInput']['budgetOneTimeFees'];
  budgetCommitmentTerms: ToolPageEvidenceSignalsStateInput['evidenceRuntimeInput']['budgetCommitmentTerms'];
  budgetRoiThreshold: ToolPageEvidenceSignalsStateInput['evidenceRuntimeInput']['budgetRoiThreshold'];
  faqItems: ToolPageEvidenceSignalsStateInput['evidenceRuntimeInput']['faqItems'];
  buildEvidenceBulletV2: ToolPageEvidenceSignalsStateInput['evidenceRuntimeInput']['buildEvidenceBulletV2'];
}

export function buildToolPageEvidenceSignalsStateInputFromRoute(
  input: BuildToolPageEvidenceSignalsStateFromRouteInput
): Parameters<typeof buildToolPageEvidenceSignalsState>[0] {
  return {
    reviewSignalsInput: input.reviewSignalsInput,
    constraintEvidenceInput: input.constraintEvidenceInput,
    evidenceRuntimeInput: input.evidenceRuntimeInput,
  };
}

export function buildToolPageEvidenceSignalsStateInputFromRouteContext(
  input: BuildToolPageEvidenceSignalsStateInputFromRouteContextInput
): Parameters<typeof buildToolPageEvidenceSignalsState>[0] {
  const isEligibleEvidenceUrl = (value: unknown): boolean =>
    typeof value === 'string' && input.isEligibleEvidenceUrl(value);

  return buildToolPageEvidenceSignalsStateInputFromRoute({
    reviewSignalsInput: {
      firstReview: input.firstReview,
      toolLastVerifiedAt: input.toolLastVerifiedAt,
      toolPricingVerifiedAt: input.toolPricingVerifiedAt,
      extractionDate: toToolPageStringOrNull(input.extractionDate),
    },
    constraintEvidenceInput: {
      constraints: input.constraints,
      isEligibleEvidenceUrl,
      isDisallowedConClaim: input.isDisallowedConClaim,
    },
    evidenceRuntimeInput: {
      reviewPros: input.reviewPros,
      reviewCons: input.reviewCons,
      globalPros: input.globalPros,
      globalCons: input.globalCons,
      toEvidenceBullet: input.toEvidenceBullet,
      isDisallowedConClaim: input.isDisallowedConClaim,
      decisionSnapshotWatchOuts: input.decisionSnapshotWatchOuts,
      decisionTradeoffSummaryInitial: input.decisionTradeoffSummaryInitial,
      officialEvidenceLinks: input.officialEvidenceLinks,
      evidenceLinksAll: input.evidenceLinksAll,
      evidenceLinks: input.evidenceLinks,
      hasPricing: input.hasPricing,
      knowledgeCard: input.knowledgeCard,
      sectionPricingStatus: input.sectionPricingStatus,
      budgetCostDrivers: input.budgetCostDrivers,
      budgetOneTimeFees: input.budgetOneTimeFees,
      budgetCommitmentTerms: input.budgetCommitmentTerms,
      budgetRoiThreshold: input.budgetRoiThreshold,
      faqItems: input.faqItems,
      buildEvidenceBulletV2: input.buildEvidenceBulletV2,
      isEligibleEvidenceUrl,
    },
  });
}
