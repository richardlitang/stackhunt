import type { buildToolPageNavigationState } from '@/lib/tool-page/navigation/navigation-state';
import { buildToolPageDecisionPresentationState } from '@/lib/tool-page/decision/decision-presentation-state';
import type { buildToolPageDecisionRouteState } from '@/lib/tool-page/decision/decision-route-state';
import type { buildToolPageChromeRouteStateFromDecisionContext } from '@/lib/tool-page/presentation/chrome-route-state';

interface BuildToolPageDecisionNavigationRouteStateInput {
  navigationState: ReturnType<typeof buildToolPageNavigationState>;
  categorySlug: string | null;
  hasGettingStarted: boolean;
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
      hasGettingStarted: input.hasGettingStarted,
      workflowFitCardsCount: input.workflowFitCardsCount,
      workflowFitHighlightsCount: input.workflowFitHighlightsCount,
      decisionUtilityState: input.decisionUtilityState,
      prosConsView: input.prosConsView,
      quickJumpLinks,
    }),
  };
}
