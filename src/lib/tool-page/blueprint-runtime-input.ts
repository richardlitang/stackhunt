import type { buildToolPageBuyerDecisionLayer } from '@/lib/tool-page/blueprint-contract';
import type { buildToolPageDecisionNavigationRouteState } from '@/lib/tool-page/decision-navigation-route-state';
import type { buildToolPageDecisionRouteState } from '@/lib/tool-page/decision-route-state';
import type { buildToolPageChromeRouteStateFromDecisionContext } from '@/lib/tool-page/chrome-route-state';
import type { ReviewLens } from '@/lib/tool-page/view-model';
import type { ToolPageBeforeYouBuyTest, ToolPageFitMatrix } from '@/types/tool-page-blueprint';
import type { ToolPageLaneOutputs } from '@/lib/tool-page/lane-outputs';

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
  allowedAlternativeSlugs?: string[];
  laneOutputs: ToolPageLaneOutputs | null;
}

function toAlternativeRebuttalDifferentiatorLabel(
  value:
    | 'cheaper_at_scale'
    | 'faster_setup'
    | 'deeper_automation'
    | 'stronger_governance'
    | 'better_developer_control'
    | 'better_reporting'
    | 'workflow_fit'
): string {
  if (value === 'cheaper_at_scale') return 'Cheaper at scale';
  if (value === 'faster_setup') return 'Faster setup';
  if (value === 'deeper_automation') return 'Deeper automation';
  if (value === 'stronger_governance') return 'Stronger governance';
  if (value === 'better_developer_control') return 'Better developer control';
  if (value === 'better_reporting') return 'Better reporting';
  return 'Workflow fit';
}

export function buildToolPageBlueprintRuntimeInputFromRouteData(
  input: BuildToolPageBlueprintRuntimeInputFromRouteDataInput
): Parameters<typeof buildToolPageBuyerDecisionLayer>[0] {
  const setupComplexitySummary = (() => {
    const setupComplexity = input.chromeState.gettingStartedProps.setupComplexity as unknown;
    if (typeof setupComplexity === 'string' && setupComplexity.trim().length > 0) {
      return setupComplexity;
    }
    if (setupComplexity && typeof setupComplexity === 'object') {
      const record = setupComplexity as Record<string, unknown>;
      if (typeof record.estimated_setup_time === 'string' && record.estimated_setup_time.trim()) {
        return `Estimated setup time: ${record.estimated_setup_time.trim()}.`;
      }
      if (typeof record.setup_type === 'string' && record.setup_type.trim()) {
        return `Setup path: ${record.setup_type.trim().replace(/_/g, ' ')}.`;
      }
    }
    return null;
  })();
  const fitEvidence = {
    evidenceType: 'editorial_inference' as const,
    confidence: 'medium' as const,
    lastChecked: input.chromeState.trustBarProps.lastChecked,
  };
  const toFitRowWithEvidence = (
    row:
      | { fit: 'weak' | 'mixed' | 'strong'; caveat: string | null; reason: string | null }
      | null
      | undefined
  ) => (row ? { ...row, evidence: fitEvidence } : null);

  const fitMatrix: ToolPageFitMatrix = {
    solo: toFitRowWithEvidence(input.laneOutputs?.editorial_decision.fit_matrix?.solo) || {
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
    startup: toFitRowWithEvidence(input.laneOutputs?.editorial_decision.fit_matrix?.startup) || {
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
    midMarket: toFitRowWithEvidence(
      input.laneOutputs?.editorial_decision.fit_matrix?.mid_market
    ) || {
      fit: 'mixed',
      caveat:
        input.decisionState.decisionUtilityState.decisionWatchOut ||
        'Governance and reporting requirements should be validated before expansion.',
      reason:
        'Depends on role model, approval flow, and reporting depth for operational decisions.',
      evidence: {
        evidenceType: 'editorial_inference',
        confidence: 'medium',
        lastChecked: input.chromeState.trustBarProps.lastChecked,
      },
    },
    enterprise: toFitRowWithEvidence(
      input.laneOutputs?.editorial_decision.fit_matrix?.enterprise
    ) || {
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

  const laneTests = input.laneOutputs?.editorial_decision.test_before_buy || [];
  const checklistItems = input.decisionState.decisionUtilityState.testChecklistItems.slice(0, 3);
  const beforeYouBuyTests: ToolPageBeforeYouBuyTest[] = (
    laneTests.length > 0
      ? laneTests.map((item) => ({
          testType: item.name.toLowerCase().includes('admin')
            ? ('admin_setup' as const)
            : item.name.toLowerCase().includes('failure') ||
                item.name.toLowerCase().includes('export')
              ? ('failure_export' as const)
              : ('daily_workflow' as const),
          name: item.name,
          whyItMatters: item.why_it_matters,
          whatToDo: item.test,
          passCondition: item.pass_condition,
          commonFailure: item.common_failure,
          evidence: {
            evidenceType: 'editorial_inference' as const,
            confidence: 'medium' as const,
            lastChecked: input.chromeState.trustBarProps.lastChecked,
          },
        }))
      : checklistItems.map((item, index) => {
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
            commonFailure:
              'A key step depends on a gated feature, hidden limit, or missing ownership.',
            evidence: {
              evidenceType: 'editorial_inference' as const,
              confidence: 'medium' as const,
              lastChecked: input.chromeState.trustBarProps.lastChecked,
            },
          };
        })
  ).slice(0, 3);

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
      mainRisk:
        input.laneOutputs?.editorial_decision.main_risk ||
        input.decisionState.decisionUtilityState.decisionWatchOut ||
        null,
      upgradeTrigger:
        input.laneOutputs?.editorial_decision.upgrade_trigger ||
        input.decisionState.decisionUtilityState.decisionUpgradeTrigger ||
        null,
      implementationFriction: {
        level: input.laneOutputs?.editorial_decision.implementation_friction_level || 'unknown',
        summary: setupComplexitySummary,
        drivers: input.laneOutputs?.editorial_decision.implementation_friction_drivers || [],
        stakeholders:
          input.laneOutputs?.editorial_decision.implementation_friction_stakeholders || [],
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
        input.laneOutputs?.fact_sheet.pricing_reality?.free_works_if ||
        input.decisionState.decisionUtilityState.pricingMentalModelItems[0]?.text ||
        input.decisionState.decisionUtilityState.decisionUseIf ||
        null,
      paidNeededWhen:
        input.laneOutputs?.fact_sheet.pricing_reality?.paid_needed_when ||
        input.decisionState.decisionUtilityState.decisionUpgradeTrigger ||
        input.decisionState.decisionUtilityState.pricingMentalModelItems[1]?.text ||
        null,
      hiddenCostTriggers: input.laneOutputs?.fact_sheet.pricing_reality?.hidden_cost_triggers
        ?.length
        ? input.laneOutputs.fact_sheet.pricing_reality.hidden_cost_triggers
        : input.decisionState.decisionUtilityState.pricingMentalModelItems
            .slice(0, 3)
            .map((entry) => entry.text),
      mainCostDrivers: input.laneOutputs?.fact_sheet.pricing_reality?.main_cost_drivers?.length
        ? input.laneOutputs.fact_sheet.pricing_reality.main_cost_drivers
        : input.decisionState.decisionUtilityState.pricingMentalModelItems
            .slice(0, 2)
            .map((entry) => entry.text),
      evidence: {
        evidenceType: 'editorial_inference',
        confidence: 'medium',
        lastChecked: input.chromeState.trustBarProps.lastChecked,
      },
    },
    beforeYouBuyTests,
    alternativesRebuttals: (input.laneOutputs?.editorial_decision.alternatives_rebuttals || [])
      .filter((entry) =>
        input.allowedAlternativeSlugs?.length
          ? input.allowedAlternativeSlugs.includes(entry.slug)
          : true
      )
      .map((entry) => ({
        slug: entry.slug,
        toolName: entry.tool_name,
        chooseInsteadIf: entry.choose_instead_if,
        differentiator: toAlternativeRebuttalDifferentiatorLabel(entry.differentiator),
        confidence: entry.confidence,
      })),
  };
}
