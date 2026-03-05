import { buildToolPageDecisionSectionState } from '@/lib/tool-page/decision-section-state';
import { buildToolPageDecisionSectionStateInputFromRouteContext } from '@/lib/tool-page/decision-section-route-input';
import { buildToolPagePrepState } from '@/lib/tool-page/prep-state';
import { buildToolPagePrepStateInputFromRouteContext } from '@/lib/tool-page/prep-input';
import type { ToolPageReviewContextSignals } from '@/lib/tool-page/review-context';

interface BuildToolPagePrepDecisionStateFromRouteContextInput {
  prep: Parameters<typeof buildToolPagePrepStateInputFromRouteContext>[0];
  decision: {
    tool: Parameters<typeof buildToolPageDecisionSectionStateInputFromRouteContext>[0]['tool'];
    firstReview: Parameters<
      typeof buildToolPageDecisionSectionStateInputFromRouteContext
    >[0]['firstReview'];
    reviewSelection: Parameters<
      typeof buildToolPageDecisionSectionStateInputFromRouteContext
    >[0]['reviewSelection'];
    canonicalFacts: Parameters<
      typeof buildToolPageDecisionSectionStateInputFromRouteContext
    >[0]['canonicalFacts'];
    knowledgeCard: Parameters<
      typeof buildToolPageDecisionSectionStateInputFromRouteContext
    >[0]['knowledgeCard'];
    setupTracks: Parameters<
      typeof buildToolPageDecisionSectionStateInputFromRouteContext
    >[0]['setupTracks'];
    reviewContentLists: Parameters<
      typeof buildToolPageDecisionSectionStateInputFromRouteContext
    >[0]['reviewContentLists'];
    audiences: Parameters<
      typeof buildToolPageDecisionSectionStateInputFromRouteContext
    >[0]['audiences'];
    reviewContextSignals: ToolPageReviewContextSignals;
    globalCons: string[];
    categorySpecificData: Parameters<
      typeof buildToolPageDecisionSectionStateInputFromRouteContext
    >[0]['categorySpecificData'];
    vipSpecifics: Parameters<
      typeof buildToolPageDecisionSectionStateInputFromRouteContext
    >[0]['vipSpecifics'];
    idealFor: string[];
    avoidIf: string[];
    delighters: string[];
    frustrations: string[];
    powerTip: string | null;
    humanVerdict: string | null;
    hasParentTool: boolean;
    now: Date;
    orderedAlternativesCount: number;
  };
}

export function buildToolPagePrepDecisionStateFromRouteContext(
  input: BuildToolPagePrepDecisionStateFromRouteContextInput
): {
  prepState: ReturnType<typeof buildToolPagePrepState>;
  decisionSectionState: ReturnType<typeof buildToolPageDecisionSectionState>;
} {
  const prepState = buildToolPagePrepState(buildToolPagePrepStateInputFromRouteContext(input.prep));

  const decisionSectionState = buildToolPageDecisionSectionState(
    buildToolPageDecisionSectionStateInputFromRouteContext({
      tool: input.decision.tool,
      firstReview: input.decision.firstReview,
      reviewSelection: input.decision.reviewSelection,
      canonicalFacts: input.decision.canonicalFacts,
      knowledgeCard: input.decision.knowledgeCard,
      setupTracks: input.decision.setupTracks,
      reviewContentLists: input.decision.reviewContentLists,
      audiences: input.decision.audiences,
      reviewContextSignals: input.decision.reviewContextSignals,
      globalCons: input.decision.globalCons,
      hasEligibleNegativeEvidence: prepState.hasEligibleNegativeEvidence,
      categorySpecificData: input.decision.categorySpecificData,
      vipSpecifics: input.decision.vipSpecifics,
      orderedAlternativesCount: input.decision.orderedAlternativesCount,
      eligibleSignalEvidenceCount: prepState.eligibleSignalEvidenceCount,
      idealFor: input.decision.idealFor,
      avoidIf: input.decision.avoidIf,
      delighters: input.decision.delighters,
      frustrations: input.decision.frustrations,
      powerTip: input.decision.powerTip,
      humanVerdict: input.decision.humanVerdict,
      hasParentTool: input.decision.hasParentTool,
      now: input.decision.now,
    })
  );

  return { prepState, decisionSectionState };
}
