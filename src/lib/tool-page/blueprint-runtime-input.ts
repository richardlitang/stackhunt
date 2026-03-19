import type { buildToolPageBuyerDecisionLayer } from '@/lib/tool-page/blueprint-contract';
import type { buildToolPageDecisionNavigationRouteState } from '@/lib/tool-page/decision-navigation-route-state';
import type { buildToolPageDecisionRouteState } from '@/lib/tool-page/decision-route-state';
import type { buildToolPageChromeRouteStateFromDecisionContext } from '@/lib/tool-page/chrome-route-state';
import type { ReviewLens } from '@/lib/tool-page/view-model';
import type { ToolPageBeforeYouBuyTest, ToolPageFitMatrix } from '@/types/tool-page-blueprint';

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
  const fitMatrix: ToolPageFitMatrix = {
    solo: {
      fit: input.activeReviewLens === 'personal' ? 'strong' : 'mixed',
      caveat:
        input.decisionState.decisionUtilityState.decisionUpgradeTrigger ||
        'Verify free-tier and admin overhead in a live workflow.',
      reason:
        input.decisionState.decisionUtilityState.decisionUseIf ||
        'Best fit depends on how quickly one operator can run the core task end to end.',
      evidence: {
        evidenceType: 'editorial_inference',
        confidence: 'medium',
        lastChecked: input.chromeState.trustBarProps.lastChecked,
      },
    },
    startup: {
      fit: input.activeReviewLens === 'startup' ? 'strong' : 'mixed',
      caveat:
        input.decisionState.decisionUtilityState.decisionUpgradeTrigger ||
        'Seat and automation thresholds can force an early paid move.',
      reason:
        input.decisionState.decisionUtilityState.decisionUseIf ||
        'Fit is strongest when team workflow and ownership are defined before rollout.',
      evidence: {
        evidenceType: 'editorial_inference',
        confidence: 'medium',
        lastChecked: input.chromeState.trustBarProps.lastChecked,
      },
    },
    midMarket: {
      fit: 'mixed',
      caveat:
        input.decisionState.decisionUtilityState.decisionWatchOut ||
        'Governance and reporting requirements should be validated before expansion.',
      reason: 'Depends on role model, approval flow, and reporting depth for operational decisions.',
      evidence: {
        evidenceType: 'editorial_inference',
        confidence: 'medium',
        lastChecked: input.chromeState.trustBarProps.lastChecked,
      },
    },
    enterprise: {
      fit: input.activeReviewLens === 'enterprise' ? 'mixed' : 'weak',
      caveat:
        input.decisionState.decisionUtilityState.decisionAvoidIf ||
        'Verify controls, procurement constraints, and migration friction.',
      reason:
        'Enterprise fit depends on governance controls, auditability, and rollout ownership clarity.',
      evidence: {
        evidenceType: 'editorial_inference',
        confidence: 'low',
        lastChecked: input.chromeState.trustBarProps.lastChecked,
      },
    },
  };

  const checklistItems = input.decisionState.decisionUtilityState.testChecklistItems.slice(0, 3);
  const beforeYouBuyTests: ToolPageBeforeYouBuyTest[] = checklistItems.map((item, index) => {
    const testType: ToolPageBeforeYouBuyTest['testType'] =
      index === 0 ? 'daily_workflow' : index === 1 ? 'admin_setup' : 'failure_export';
    const testLabel =
      testType === 'daily_workflow'
        ? 'Daily workflow test'
        : testType === 'admin_setup'
          ? 'Admin/setup test'
          : 'Failure and export test';

    return {
      testType,
      name: testLabel,
      whyItMatters: item,
      whatToDo: item,
      passCondition: 'The workflow completes without role, plan, or handoff blockers.',
      commonFailure: 'A key step depends on a gated feature, hidden limit, or missing ownership.',
      evidence: {
        evidenceType: 'editorial_inference',
        confidence: 'medium',
        lastChecked: input.chromeState.trustBarProps.lastChecked,
      },
    };
  });

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
    fitMatrix,
    pricingReality: {
      freeWorksIf:
        input.decisionState.decisionUtilityState.pricingMentalModelItems[0]?.text ||
        input.decisionState.decisionUtilityState.decisionUseIf ||
        null,
      paidNeededWhen:
        input.decisionState.decisionUtilityState.decisionUpgradeTrigger ||
        input.decisionState.decisionUtilityState.pricingMentalModelItems[1]?.text ||
        null,
      hiddenCostTriggers: input.decisionState.decisionUtilityState.pricingMentalModelItems
        .slice(0, 3)
        .map((entry) => entry.text),
      mainCostDrivers: input.decisionState.decisionUtilityState.pricingMentalModelItems
        .slice(0, 2)
        .map((entry) => entry.text),
      evidence: {
        evidenceType: 'editorial_inference',
        confidence: 'medium',
        lastChecked: input.chromeState.trustBarProps.lastChecked,
      },
    },
    beforeYouBuyTests,
    alternativesRebuttals: [],
  };
}
