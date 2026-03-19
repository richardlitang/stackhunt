import type { buildToolPageBuyerDecisionLayer } from '@/lib/tool-page/blueprint-contract';
import type { buildToolPageDecisionNavigationRouteState } from '@/lib/tool-page/decision-navigation-route-state';
import type { buildToolPageDecisionRouteState } from '@/lib/tool-page/decision-route-state';
import type { buildToolPageChromeRouteStateFromDecisionContext } from '@/lib/tool-page/chrome-route-state';
import type { ReviewLens } from '@/lib/tool-page/view-model';

interface BuildToolPageBlueprintRuntimeInputFromRouteDataInput {
  activeReviewLens: ReviewLens;
  lensHrefs: Record<ReviewLens, string>;
  chromeState: Pick<
    ReturnType<typeof buildToolPageChromeRouteStateFromDecisionContext>,
    'trustBarProps' | 'gettingStartedProps'
  >;
  decisionState: Pick<ReturnType<typeof buildToolPageDecisionRouteState>, 'decisionUtilityState'>;
  navigationState: Pick<
    ReturnType<typeof buildToolPageDecisionNavigationRouteState>,
    'quickJumpLinksView'
  >;
}

export function buildToolPageBlueprintRuntimeInputFromRouteData(
  input: BuildToolPageBlueprintRuntimeInputFromRouteDataInput
): Parameters<typeof buildToolPageBuyerDecisionLayer>[0] {
  return {
    activeLens: input.activeReviewLens,
    lensHrefs: input.lensHrefs,
    jumpLinks: input.navigationState.quickJumpLinksView,
    trust: {
      status: input.chromeState.trustBarProps.status,
      confidence: input.chromeState.trustBarProps.confidence,
      lastChecked: input.chromeState.trustBarProps.lastChecked,
      pendingCount: input.chromeState.trustBarProps.pendingCount,
    },
    heroDecisionCard: {
      bestFor: input.decisionState.decisionUtilityState.decisionUseIf || null,
      notFor: input.decisionState.decisionUtilityState.decisionAvoidIf || null,
      mainRisk: input.decisionState.decisionUtilityState.decisionWatchOut || null,
      upgradeTrigger: input.decisionState.decisionUtilityState.decisionUpgradeTrigger || null,
      implementationFriction: {
        level: 'unknown',
        summary: input.chromeState.gettingStartedProps.setupComplexity || null,
        drivers: [],
      },
      evidence: {
        evidenceType: 'editorial_inference',
        confidence: 'medium',
        lastChecked: input.chromeState.trustBarProps.lastChecked,
        sourceUrl: null,
      },
    },
    beforeYouBuyTests: [],
    alternativesRebuttals: [],
  };
}
