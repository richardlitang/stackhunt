import type { buildToolPageBuyerDecisionLayer } from '@/lib/tool-page/runtime/blueprint-contract';
import type { buildToolPageDecisionNavigationRouteState } from '@/lib/tool-page/decision/decision-navigation-route-state';
import type { buildToolPageDecisionRouteState } from '@/lib/tool-page/decision/decision-route-state';
import type { buildToolPageChromeRouteStateFromDecisionContext } from '@/lib/tool-page/presentation/chrome-route-state';
import type { ReviewLens } from '@/lib/tool-page/presentation/view-model';
import type { ToolPageBeforeYouBuyTest, ToolPageFitMatrix } from '@/types/tool-page-blueprint';
import type { ToolPageLaneOutputs } from '@/lib/tool-page/decision/lane-outputs';

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

type GenerationMode = 'deterministic' | 'extractive' | 'llm_phrase_only' | 'suppress' | undefined;

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
  const laneDecisionMode = input.laneOutputs?.editorial_decision.generation_mode;
  const lanePricingMode = input.laneOutputs?.fact_sheet.pricing_reality?.generation_mode;
  const isRenderableMode = (mode: GenerationMode): boolean =>
    mode === 'deterministic' || mode === 'extractive';
  const shouldRenderFitMatrix = isRenderableMode(laneDecisionMode?.fit_matrix);
  const shouldRenderMainRisk = isRenderableMode(laneDecisionMode?.main_risk);
  const shouldRenderUpgradeTrigger = isRenderableMode(laneDecisionMode?.upgrade_trigger);
  const shouldRenderImplementationFriction = isRenderableMode(
    laneDecisionMode?.implementation_friction
  );
  const shouldRenderTests = isRenderableMode(laneDecisionMode?.test_before_buy);
  const shouldRenderAlternativesRebuttals = isRenderableMode(
    laneDecisionMode?.alternatives_rebuttals
  );
  const shouldRenderPricingFreeWorksIf = isRenderableMode(lanePricingMode?.free_works_if);
  const shouldRenderPricingPaidNeededWhen = isRenderableMode(lanePricingMode?.paid_needed_when);
  const shouldRenderPricingHiddenCosts = isRenderableMode(lanePricingMode?.hidden_cost_triggers);
  const shouldRenderPricingMainDrivers = isRenderableMode(lanePricingMode?.main_cost_drivers);
  const toFitRowWithEvidence = (
    row:
      | { fit: 'weak' | 'mixed' | 'strong'; caveat: string | null; reason: string | null }
      | null
      | undefined
  ) => (row ? { ...row, evidence: fitEvidence } : null);

  const fitMatrix: ToolPageFitMatrix = {
    solo: shouldRenderFitMatrix
      ? toFitRowWithEvidence(input.laneOutputs?.editorial_decision.fit_matrix?.solo)
      : null,
    startup: shouldRenderFitMatrix
      ? toFitRowWithEvidence(input.laneOutputs?.editorial_decision.fit_matrix?.startup)
      : null,
    midMarket: shouldRenderFitMatrix
      ? toFitRowWithEvidence(input.laneOutputs?.editorial_decision.fit_matrix?.mid_market)
      : null,
    enterprise: shouldRenderFitMatrix
      ? toFitRowWithEvidence(input.laneOutputs?.editorial_decision.fit_matrix?.enterprise)
      : null,
  };

  const laneTests = shouldRenderTests
    ? input.laneOutputs?.editorial_decision.test_before_buy || []
    : [];
  const beforeYouBuyTests: ToolPageBeforeYouBuyTest[] = laneTests
    .map((item) => ({
      testType: item.name.toLowerCase().includes('admin')
        ? ('admin_setup' as const)
        : item.name.toLowerCase().includes('failure') || item.name.toLowerCase().includes('export')
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
    .slice(0, 3);

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
      bestFor: shouldRenderFitMatrix
        ? input.laneOutputs?.editorial_decision.best_for || null
        : null,
      notFor: shouldRenderFitMatrix ? input.laneOutputs?.editorial_decision.not_for || null : null,
      mainRisk: shouldRenderMainRisk
        ? input.laneOutputs?.editorial_decision.main_risk || null
        : null,
      upgradeTrigger: shouldRenderUpgradeTrigger
        ? input.laneOutputs?.editorial_decision.upgrade_trigger || null
        : null,
      implementationFriction: {
        level:
          shouldRenderImplementationFriction &&
          input.laneOutputs?.editorial_decision.implementation_friction_level
            ? input.laneOutputs.editorial_decision.implementation_friction_level
            : 'unknown',
        summary: setupComplexitySummary,
        drivers: shouldRenderImplementationFriction
          ? input.laneOutputs?.editorial_decision.implementation_friction_drivers || []
          : [],
        stakeholders: shouldRenderImplementationFriction
          ? input.laneOutputs?.editorial_decision.implementation_friction_stakeholders || []
          : [],
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
      freeWorksIf: shouldRenderPricingFreeWorksIf
        ? input.laneOutputs?.fact_sheet.pricing_reality?.free_works_if || null
        : null,
      paidNeededWhen: shouldRenderPricingPaidNeededWhen
        ? input.laneOutputs?.fact_sheet.pricing_reality?.paid_needed_when || null
        : null,
      hiddenCostTriggers:
        shouldRenderPricingHiddenCosts &&
        input.laneOutputs?.fact_sheet.pricing_reality?.hidden_cost_triggers?.length
          ? input.laneOutputs.fact_sheet.pricing_reality.hidden_cost_triggers
          : [],
      mainCostDrivers:
        shouldRenderPricingMainDrivers &&
        input.laneOutputs?.fact_sheet.pricing_reality?.main_cost_drivers?.length
          ? input.laneOutputs.fact_sheet.pricing_reality.main_cost_drivers
          : [],
      evidence: {
        evidenceType: 'editorial_inference',
        confidence: 'medium',
        lastChecked: input.chromeState.trustBarProps.lastChecked,
      },
    },
    beforeYouBuyTests,
    alternativesRebuttals: (shouldRenderAlternativesRebuttals
      ? input.laneOutputs?.editorial_decision.alternatives_rebuttals || []
      : []
    )
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
