import type { ToolPageLaneOutputs } from '@/lib/tool-page/lane-outputs';

interface DecisionLayerTextSignalsInput {
  decisionSnapshotBestWhen: string[];
  decisionSnapshotWatchOuts: string[];
  decisionTradeoffSummary: string | null;
  laneOutputs: ToolPageLaneOutputs | null;
}

const MALFORMED_TEXT_PATTERNS = [/\[object object\]/i, /^that need\b/i];

function hasMalformedText(value: string | null | undefined): boolean {
  if (!value) return false;
  const cleaned = value.trim();
  if (!cleaned) return false;
  return MALFORMED_TEXT_PATTERNS.some((pattern) => pattern.test(cleaned));
}

function hasDuplicateFitMatrixRows(laneOutputs: ToolPageLaneOutputs | null): boolean {
  const fitMatrix = laneOutputs?.editorial_decision.fit_matrix;
  if (!fitMatrix) return false;
  const keys = [fitMatrix.solo, fitMatrix.startup, fitMatrix.mid_market, fitMatrix.enterprise]
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .map(
      (row) =>
        `${(row.reason || '').trim().toLowerCase()}|${(row.caveat || '').trim().toLowerCase()}`
    )
    .filter((key) => key !== '|');
  return keys.length > 1 && new Set(keys).size <= 1;
}

function hasDuplicatePricingReality(laneOutputs: ToolPageLaneOutputs | null): boolean {
  const freeWorksIf = laneOutputs?.fact_sheet.pricing_reality?.free_works_if;
  const paidNeededWhen = laneOutputs?.fact_sheet.pricing_reality?.paid_needed_when;
  if (!freeWorksIf || !paidNeededWhen) return false;
  const a = freeWorksIf.trim().toLowerCase();
  const b = paidNeededWhen.trim().toLowerCase();
  return a.length > 0 && a === b;
}

export function deriveToolPageDecisionLayerConsistencySignals(
  input: DecisionLayerTextSignalsInput
): {
  hasMalformedDecisionLayerSignal: boolean;
  hasDuplicatePricingRealitySignal: boolean;
  hasDuplicateFitMatrixRowsSignal: boolean;
} {
  const hasMalformedDecisionLayerSignal = Boolean(
    input.decisionSnapshotBestWhen.some((item) => hasMalformedText(item)) ||
    input.decisionSnapshotWatchOuts.some((item) => hasMalformedText(item)) ||
    hasMalformedText(input.decisionTradeoffSummary) ||
    hasMalformedText(input.laneOutputs?.editorial_decision.best_for || null) ||
    hasMalformedText(input.laneOutputs?.editorial_decision.not_for || null) ||
    hasMalformedText(input.laneOutputs?.editorial_decision.main_tradeoff || null)
  );

  return {
    hasMalformedDecisionLayerSignal,
    hasDuplicatePricingRealitySignal: hasDuplicatePricingReality(input.laneOutputs),
    hasDuplicateFitMatrixRowsSignal: hasDuplicateFitMatrixRows(input.laneOutputs),
  };
}
