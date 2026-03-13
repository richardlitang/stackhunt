import { buildToolPageChromeAssemblyRouteState } from '@/lib/tool-page/chrome-assembly-route-state';
import { buildToolPageDecisionAssemblyRouteState } from '@/lib/tool-page/decision-assembly-route-state';
import { buildToolPageDecisionNavigationRouteState } from '@/lib/tool-page/decision-navigation-route-state';
import { buildToolPageRuntimeRouteState } from '@/lib/tool-page/runtime-route-state';
import type { buildToolPageRuntimeMidRouteState } from '@/lib/tool-page/runtime-mid-route-state';

interface BuildToolPagePageAssemblyRouteStateFromRouteContextInput {
  runtime: Parameters<typeof buildToolPageRuntimeRouteState>[0];
  chrome: Parameters<typeof buildToolPageChromeAssemblyRouteState>[0];
  decision: Omit<
    Parameters<typeof buildToolPageDecisionAssemblyRouteState>[0],
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

export function buildToolPagePageAssemblyRouteStateFromRouteContext(
  input: BuildToolPagePageAssemblyRouteStateFromRouteContextInput
): ReturnType<typeof buildToolPageRuntimeRouteState> &
  ReturnType<typeof buildToolPageChromeAssemblyRouteState> &
  ReturnType<typeof buildToolPageDecisionAssemblyRouteState> &
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
  const firstPricingEvidenceLink = input.decision.pricingEvidenceLinks[0];
  const decisionState = buildToolPageDecisionAssemblyRouteState({
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
