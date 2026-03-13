import { buildToolPagePrepDecisionStateFromDecisionContext } from '@/lib/tool-page/prep-decision-decision-context';
import { deriveToolPageReviewContextSignals } from '@/lib/tool-page/review-context';
import { buildToolPageReviewEvidenceStateFromDecisionContext } from '@/lib/tool-page/review-evidence-decision-context';
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
  ReturnType<typeof buildToolPagePrepDecisionStateFromDecisionContext> &
  ReturnType<typeof buildToolPageReviewEvidenceStateFromDecisionContext> & {
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
  const { prepState, decisionSectionState } = buildToolPagePrepDecisionStateFromDecisionContext({
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
      hasParentTool: Boolean(parentTool),
      now: input.now || new Date(),
      orderedAlternativesCount: orderedAlternatives?.length || 0,
    },
  });
  const { reviewArtifactsState, evidenceSignalsState } = buildToolPageReviewEvidenceStateFromDecisionContext(
    {
      reviewArtifacts: {
        canonicalFacts: canonicalFacts as any,
        reviewSources: reviewContentLists.sources,
        tool,
      },
      evidenceContext: {
        firstReview: firstReview as any,
        toolLastVerifiedAt: tool.last_verified_at || null,
        toolPricingVerifiedAt: tool.pricing_verified_at || null,
        extractionDate: knowledgeCard?.meta?.extraction_date,
        constraints: constraints as any,
        isEligibleEvidenceUrl: input.isEligibleEvidenceUrl,
        reviewPros: reviewContentLists.pros as any,
        reviewCons: reviewContentLists.cons as any,
        globalPros: Array.isArray(globalPros) ? globalPros : [],
        globalCons: Array.isArray(globalCons) ? globalCons : [],
        toEvidenceBullet: prepState.toEvidenceBullet,
        hasPricing: decisionSectionState.decisionRuntime.hasPricing,
        knowledgeCard,
        faqItems: decisionSectionState.faqState.faqItems.map((item) => ({
          question: typeof item.question === 'string' ? item.question : '',
          answer: typeof item.answer === 'string' ? item.answer : '',
          answer_source_url:
            typeof item.answer_source_url === 'string' || item.answer_source_url === null
              ? item.answer_source_url
              : null,
        })),
      },
      reviewContextSignals,
      prepState,
      decisionRuntime: decisionSectionState.decisionRuntime,
      qualityState: decisionSectionState.qualityState,
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
