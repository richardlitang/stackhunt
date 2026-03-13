import { buildToolPageChromeAssemblyRouteState } from '@/lib/tool-page/chrome-assembly-route-state';
import { buildToolPageDecisionAssemblyRouteStateFromRouteContext } from '@/lib/tool-page/decision-assembly-route-state';
import { buildToolPageDecisionNavigationRouteState } from '@/lib/tool-page/decision-navigation-route-state';
import { buildToolPageRuntimeRouteState } from '@/lib/tool-page/runtime-route-state';
import type { buildToolPageRuntimeMidRouteState } from '@/lib/tool-page/runtime-mid-route-state';

interface BuildToolPagePageAssemblyRouteStateFromRouteContextInput {
  runtime: Parameters<typeof buildToolPageRuntimeRouteState>[0];
  chrome: Parameters<typeof buildToolPageChromeAssemblyRouteState>[0];
  decision: Omit<
    Parameters<typeof buildToolPageDecisionAssemblyRouteStateFromRouteContext>[0],
    'trustBar' | 'lensBestFitLine' | 'lensWeakFitLine' | 'lensTradeoffLine'
  >;
  navigation: Omit<
    Parameters<typeof buildToolPageDecisionNavigationRouteState>[0],
    'decisionUtilityState' | 'prosConsView' | 'workflowFitCardsCount' | 'workflowFitHighlightsCount'
  >;
  ctaMediaState: ReturnType<typeof buildToolPageRuntimeMidRouteState>['ctaMediaState'];
}

export function buildToolPagePageAssemblyRouteStateFromRouteContext(
  input: BuildToolPagePageAssemblyRouteStateFromRouteContextInput
): ReturnType<typeof buildToolPageRuntimeRouteState> &
  ReturnType<typeof buildToolPageChromeAssemblyRouteState> &
  ReturnType<typeof buildToolPageDecisionAssemblyRouteStateFromRouteContext> &
  ReturnType<typeof buildToolPageDecisionNavigationRouteState> &
  Pick<
    BuildToolPagePageAssemblyRouteStateFromRouteContextInput['ctaMediaState'],
    | 'compareButtonProps'
    | 'addToStackProps'
    | 'priceVerificationProps'
    | 'videoState'
    | 'videoProps'
    | 'verdictContent'
  > {
  const runtimeState = buildToolPageRuntimeRouteState(input.runtime);
  const chromeState = buildToolPageChromeAssemblyRouteState(input.chrome);
  const decisionState = buildToolPageDecisionAssemblyRouteStateFromRouteContext({
    ...input.decision,
    lensBestFitLine: chromeState.lensBestFitLine,
    lensWeakFitLine: chromeState.lensWeakFitLine,
    lensTradeoffLine: chromeState.lensTradeoffLine,
    trustBar: {
      confidence: chromeState.trustBarProps.confidence,
      pendingCount: chromeState.trustBarProps.pendingCount,
    },
  });
  const navigationState = buildToolPageDecisionNavigationRouteState({
    ...input.navigation,
    workflowFitCardsCount: chromeState.workflowFitCards.length,
    workflowFitHighlightsCount: chromeState.workflowFitHighlights.length,
    decisionUtilityState: decisionState.decisionUtilityState,
    prosConsView: chromeState.prosConsView,
  });
  const {
    compareButtonProps,
    addToStackProps,
    priceVerificationProps,
    videoState,
    videoProps,
    verdictContent,
  } = input.ctaMediaState;

  return {
    ...runtimeState,
    ...chromeState,
    ...decisionState,
    ...navigationState,
    compareButtonProps,
    addToStackProps,
    priceVerificationProps,
    videoState,
    videoProps,
    verdictContent,
  };
}
