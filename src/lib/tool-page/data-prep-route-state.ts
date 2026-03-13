import { buildToolPagePrepDecisionStateFromRouteContext } from '@/lib/tool-page/prep-decision-state';
import { deriveToolPageReviewContextSignals } from '@/lib/tool-page/review-context';
import { buildToolPageReviewEvidenceStateFromRouteContext } from '@/lib/tool-page/review-evidence-state';
import type { ToolPageData } from '@/lib/tool-page/data';

interface BuildToolPageDataPrepRouteStateInput {
  toolPageData: ToolPageData;
  isEligibleEvidenceUrl: (url: unknown) => boolean;
  now?: Date;
}

export function buildToolPageDataPrepRouteState(
  input: BuildToolPageDataPrepRouteStateInput
): ToolPageData &
  ToolPageData['coreState'] &
  ReturnType<typeof buildToolPagePrepDecisionStateFromRouteContext> &
  ReturnType<typeof buildToolPageReviewEvidenceStateFromRouteContext> & {
    reviewContextSignals: ReturnType<typeof deriveToolPageReviewContextSignals>;
  } {
  const {
    tool,
    parentTool,
    resolvedSubject,
    laneOutputs,
    subjectSelectionSuppressed,
    subjectSelectionReason,
    tags,
    primaryOffer,
    reviewSelection,
    firstReview,
    reviewContentLists,
    coreState,
    orderedAlternatives,
    alternativesLabel,
    microDiffs,
    curatedVerdictEntries,
  } = input.toolPageData;
  const {
    knowledgeCard,
    globalPros,
    globalCons,
    constraints,
    canonicalFacts,
    setupTracks,
    categorySpecificData,
    vipSpecifics,
    reviewContext,
  } = coreState;
  const reviewContextSignals = deriveToolPageReviewContextSignals(reviewContext);
  const { prepState, decisionSectionState } = buildToolPagePrepDecisionStateFromRouteContext({
    prep: {
      reviewSources: reviewContentLists.sources,
      isEligibleEvidenceUrl: input.isEligibleEvidenceUrl,
      tool,
      orderedAlternatives,
    },
    decision: {
      tool,
      firstReview: firstReview as any,
      reviewSelection,
      canonicalFacts: canonicalFacts as any,
      knowledgeCard: (knowledgeCard as Record<string, unknown> | null) || null,
      setupTracks: setupTracks as any,
      reviewContentLists: reviewContentLists as any,
      audiences: tags.audiences,
      reviewContextSignals,
      globalCons: globalCons as any,
      categorySpecificData: (categorySpecificData as Record<string, unknown> | null) || null,
      vipSpecifics: (vipSpecifics as Record<string, unknown> | null) || null,
      idealFor: reviewContextSignals.idealFor,
      avoidIf: reviewContextSignals.avoidIf,
      delighters: reviewContextSignals.delighters,
      frustrations: reviewContextSignals.frustrations,
      powerTip: reviewContextSignals.powerTip,
      humanVerdict: reviewContextSignals.humanVerdict,
      hasParentTool: Boolean(parentTool),
      now: input.now || new Date(),
      orderedAlternativesCount: orderedAlternatives?.length || 0,
    },
  });
  const { reviewArtifactsState, evidenceSignalsState } = buildToolPageReviewEvidenceStateFromRouteContext(
    {
      reviewArtifacts: {
        canonicalFacts: canonicalFacts as any,
        reviewSources: reviewContentLists.sources,
        tool,
      },
      evidenceSignals: {
        firstReview: firstReview as any,
        toolLastVerifiedAt: tool.last_verified_at || null,
        toolPricingVerifiedAt: tool.pricing_verified_at || null,
        extractionDate: knowledgeCard?.meta?.extraction_date,
        constraints: constraints as any,
        isEligibleEvidenceUrl: input.isEligibleEvidenceUrl,
        isDisallowedConClaim: decisionSectionState.decisionRuntime.isDisallowedConClaim,
        reviewPros: reviewContentLists.pros as any,
        reviewCons: reviewContentLists.cons as any,
        globalPros: Array.isArray(globalPros) ? globalPros : [],
        globalCons: Array.isArray(globalCons) ? globalCons : [],
        toEvidenceBullet: prepState.toEvidenceBullet,
        decisionSnapshotWatchOuts: decisionSectionState.decisionRuntime.decisionSnapshotWatchOuts,
        decisionTradeoffSummaryInitial:
          decisionSectionState.decisionRuntime.decisionTradeoffSummaryInitial,
        hasPricing: decisionSectionState.decisionRuntime.hasPricing,
        knowledgeCard,
        sectionPricingStatus: decisionSectionState.qualityState.sectionStatus.pricing || 'hide',
        budgetCostDrivers: reviewContextSignals.budgetCostDrivers,
        budgetOneTimeFees: reviewContextSignals.budgetOneTimeFees,
        budgetCommitmentTerms: reviewContextSignals.budgetCommitmentTerms,
        budgetRoiThreshold: reviewContextSignals.budgetRoiThreshold,
        faqItems: decisionSectionState.faqState.faqItems.map((item) => ({
          question: typeof item.question === 'string' ? item.question : '',
          answer: typeof item.answer === 'string' ? item.answer : '',
          answer_source_url:
            typeof item.answer_source_url === 'string' || item.answer_source_url === null
              ? item.answer_source_url
              : null,
        })),
        buildEvidenceBulletV2: prepState.buildEvidenceBulletV2,
      },
    }
  );

  return {
    tool,
    parentTool,
    resolvedSubject,
    laneOutputs,
    subjectSelectionSuppressed,
    subjectSelectionReason,
    tags,
    primaryOffer,
    reviewSelection,
    firstReview,
    reviewContentLists,
    coreState,
    orderedAlternatives,
    alternativesLabel,
    microDiffs,
    curatedVerdictEntries,
    ...coreState,
    reviewContextSignals,
    prepState,
    decisionSectionState,
    reviewArtifactsState,
    evidenceSignalsState,
  };
}
