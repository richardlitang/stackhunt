import type { buildToolPagePrepState } from '@/lib/tool-page/prep-state';
import type { ToolPageReviewContextSignals } from '@/lib/tool-page/review-context';
import { buildToolPagePrepDecisionStateFromRouteContext } from '@/lib/tool-page/prep-decision-state';

interface BuildToolPagePrepDecisionStateFromDecisionContextInput {
  prep: Parameters<typeof buildToolPagePrepDecisionStateFromRouteContext>[0]['prep'];
  decision: {
    tool: Parameters<typeof buildToolPagePrepDecisionStateFromRouteContext>[0]['decision']['tool'];
    firstReview: Parameters<
      typeof buildToolPagePrepDecisionStateFromRouteContext
    >[0]['decision']['firstReview'];
    reviewSelection: Parameters<
      typeof buildToolPagePrepDecisionStateFromRouteContext
    >[0]['decision']['reviewSelection'];
    canonicalFacts: Parameters<
      typeof buildToolPagePrepDecisionStateFromRouteContext
    >[0]['decision']['canonicalFacts'];
    knowledgeCard: Parameters<
      typeof buildToolPagePrepDecisionStateFromRouteContext
    >[0]['decision']['knowledgeCard'];
    setupTracks: Parameters<
      typeof buildToolPagePrepDecisionStateFromRouteContext
    >[0]['decision']['setupTracks'];
    reviewContentLists: Parameters<
      typeof buildToolPagePrepDecisionStateFromRouteContext
    >[0]['decision']['reviewContentLists'];
    audiences: Parameters<
      typeof buildToolPagePrepDecisionStateFromRouteContext
    >[0]['decision']['audiences'];
    reviewContextSignals: ToolPageReviewContextSignals;
    globalCons: string[];
    categorySpecificData: Parameters<
      typeof buildToolPagePrepDecisionStateFromRouteContext
    >[0]['decision']['categorySpecificData'];
    vipSpecifics: Parameters<
      typeof buildToolPagePrepDecisionStateFromRouteContext
    >[0]['decision']['vipSpecifics'];
    hasParentTool: boolean;
    now: Date;
    orderedAlternativesCount: number;
  };
}

export function buildToolPagePrepDecisionStateFromDecisionContext(
  input: BuildToolPagePrepDecisionStateFromDecisionContextInput
): {
  prepState: ReturnType<typeof buildToolPagePrepState>;
  decisionSectionState: ReturnType<
    typeof buildToolPagePrepDecisionStateFromRouteContext
  >['decisionSectionState'];
} {
  return buildToolPagePrepDecisionStateFromRouteContext({
    prep: input.prep,
    decision: {
      ...input.decision,
      idealFor: input.decision.reviewContextSignals.idealFor,
      avoidIf: input.decision.reviewContextSignals.avoidIf,
      delighters: input.decision.reviewContextSignals.delighters,
      frustrations: input.decision.reviewContextSignals.frustrations,
      powerTip: input.decision.reviewContextSignals.powerTip,
      humanVerdict: input.decision.reviewContextSignals.humanVerdict,
    },
  });
}
