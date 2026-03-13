import { buildToolPageChromeRouteStateFromDecisionContext } from '@/lib/tool-page/chrome-route-state';
import { buildToolPageDecisionNavigationRouteState } from '@/lib/tool-page/decision-navigation-route-state';
import { buildToolPageDecisionRouteState } from '@/lib/tool-page/decision-route-state';
import { buildToolPageRuntimeRouteState } from '@/lib/tool-page/runtime-route-state';
import type { buildToolPageRuntimeMidRouteState } from '@/lib/tool-page/runtime-mid-route-state';

interface BuildToolPagePageAssemblyRouteStateFromRouteDataInput {
  runtime: Parameters<typeof buildToolPageRuntimeRouteState>[0];
  chrome: Parameters<typeof buildToolPageChromeRouteStateFromDecisionContext>[0];
  decision: Omit<
    Parameters<typeof buildToolPageDecisionRouteState>[0],
    | 'trustBar'
    | 'lensBestFitLine'
    | 'lensWeakFitLine'
    | 'lensTradeoffLine'
    | 'audienceSlugs'
    | 'pricingEvidenceSourceUrl'
    | 'pricingEvidenceSummary'
  > & {
    audiences: Array<{ slug?: string | null; name?: string | null }>;
    pricingEvidenceLinks: Array<{ sourceUrl?: string | null; text?: string | null }>;
    officialPricingSourceUrl: string | null;
  };
  navigation: Omit<
    Parameters<typeof buildToolPageDecisionNavigationRouteState>[0],
    'decisionUtilityState' | 'prosConsView' | 'workflowFitCardsCount' | 'workflowFitHighlightsCount'
  >;
  ctaMediaState: ReturnType<typeof buildToolPageRuntimeMidRouteState>['ctaMediaState'];
}

export function buildToolPagePageAssemblyRouteStateFromRouteData(
  input: BuildToolPagePageAssemblyRouteStateFromRouteDataInput
): ReturnType<typeof buildToolPageRuntimeRouteState> &
  ReturnType<typeof buildToolPageChromeRouteStateFromDecisionContext> &
  ReturnType<typeof buildToolPageDecisionRouteState> &
  ReturnType<typeof buildToolPageDecisionNavigationRouteState> &
  Pick<
    BuildToolPagePageAssemblyRouteStateFromRouteDataInput['ctaMediaState'],
    | 'compareButtonProps'
    | 'addToStackProps'
    | 'priceVerificationProps'
    | 'videoState'
    | 'videoProps'
    | 'verdictContent'
  > {
  const runtimeState = buildToolPageRuntimeRouteState(input.runtime);
  const chromeState = buildToolPageChromeRouteStateFromDecisionContext(input.chrome);
  const firstPricingEvidenceLink = input.decision.pricingEvidenceLinks[0];
  const decisionState = buildToolPageDecisionRouteState({
    tool: input.decision.tool,
    resolvedSubject: input.decision.resolvedSubject,
    activeReviewLens: input.decision.activeReviewLens,
    hasApi: input.decision.hasApi,
    hasParentTool: input.decision.hasParentTool,
    audienceSlugs: input.decision.audiences.map((audience) => audience.slug || audience.name || ''),
    lensBestFitLine: chromeState.lensBestFitLine,
    lensWeakFitLine: chromeState.lensWeakFitLine,
    lensTradeoffLine: chromeState.lensTradeoffLine,
    topLensHardLimit: input.decision.topLensHardLimit,
    pricingEvidenceSourceUrl:
      firstPricingEvidenceLink?.sourceUrl || input.decision.officialPricingSourceUrl,
    pricingEvidenceSummary: firstPricingEvidenceLink?.text || null,
    contentConfidenceLabel: input.decision.contentConfidenceLabel,
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
