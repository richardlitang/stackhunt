import type { buildToolPageNavigationState } from '@/lib/tool-page/navigation-state';
import { buildToolPageDecisionPresentationState } from '@/lib/tool-page/decision-presentation-state';
import type { buildToolPageDecisionRouteState } from '@/lib/tool-page/decision-route-state';
import type { buildToolPageChromeRouteStateFromDecisionContext } from '@/lib/tool-page/chrome-route-state';

interface BuildToolPageDecisionNavigationRouteStateInput {
  navigationState: ReturnType<typeof buildToolPageNavigationState>;
  categorySlug: string | null;
  workflowFitCardsCount: number;
  workflowFitHighlightsCount: number;
  decisionUtilityState: ReturnType<typeof buildToolPageDecisionRouteState>['decisionUtilityState'];
  prosConsView: ReturnType<typeof buildToolPageChromeRouteStateFromDecisionContext>['prosConsView'];
}

export function buildToolPageDecisionNavigationRouteState(
  input: BuildToolPageDecisionNavigationRouteStateInput
): ReturnType<typeof buildToolPageDecisionPresentationState> &
  Pick<
    ReturnType<typeof buildToolPageNavigationState>,
    'sourcesSectionState' | 'lowConfidenceSourcesState' | 'faqItemsView' | 'updateHistoryState'
  > & { quickJumpLinks: ReturnType<typeof buildToolPageNavigationState>['quickJumpLinks'] } {
  const {
    sourcesSectionState,
    lowConfidenceSourcesState,
    faqItemsView,
    updateHistoryState,
    quickJumpLinks,
  } = input.navigationState;

  return {
    sourcesSectionState,
    lowConfidenceSourcesState,
    faqItemsView,
    updateHistoryState,
    quickJumpLinks,
    ...buildToolPageDecisionPresentationState({
      categorySlug: input.categorySlug,
      workflowFitCardsCount: input.workflowFitCardsCount,
      workflowFitHighlightsCount: input.workflowFitHighlightsCount,
      decisionUtilityState: input.decisionUtilityState,
      prosConsView: input.prosConsView,
      quickJumpLinks,
    }),
  };
}
