import type { ToolPageLaneOutputs } from '@/lib/tool-page/lane-outputs';

export interface ToolPageLaneDecisionEvidenceSignals {
  hasSourceBackedMainRiskSignal: boolean;
  hasSourceBackedUpgradeTriggerSignal: boolean;
  hasSourceBackedImplementationFrictionSignal: boolean;
  hasSourceBackedFitMatrixSignal: boolean;
  hasSourceBackedTestBeforeBuySignal: boolean;
}

function hasText(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function countPopulatedFitRows(laneOutputs: ToolPageLaneOutputs | null): number {
  const fitMatrix = laneOutputs?.editorial_decision.fit_matrix;
  if (!fitMatrix) return 0;
  const rows = [fitMatrix.solo, fitMatrix.startup, fitMatrix.mid_market, fitMatrix.enterprise];
  return rows.filter((row) => row && (hasText(row.reason) || hasText(row.caveat))).length;
}

function hasSufficientDecisionTests(laneOutputs: ToolPageLaneOutputs | null): boolean {
  const tests = laneOutputs?.editorial_decision.test_before_buy || [];
  if (tests.length !== 3) return false;
  return tests.every(
    (test) =>
      hasText(test.name) &&
      hasText(test.why_it_matters) &&
      hasText(test.test) &&
      hasText(test.pass_condition)
  );
}

export function deriveToolPageLaneDecisionEvidenceSignals(
  laneOutputs: ToolPageLaneOutputs | null
): ToolPageLaneDecisionEvidenceSignals {
  return {
    hasSourceBackedMainRiskSignal: hasText(laneOutputs?.editorial_decision.main_risk),
    hasSourceBackedUpgradeTriggerSignal: hasText(laneOutputs?.editorial_decision.upgrade_trigger),
    hasSourceBackedImplementationFrictionSignal: Boolean(
      laneOutputs?.editorial_decision.implementation_friction_level
    ),
    hasSourceBackedFitMatrixSignal: countPopulatedFitRows(laneOutputs) > 0,
    hasSourceBackedTestBeforeBuySignal: hasSufficientDecisionTests(laneOutputs),
  };
}
