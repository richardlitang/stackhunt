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

function hasText(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
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

const ENTERPRISE_CONTROL_HINT =
  /\b(sso|scim|soc ?2|audit|compliance|governance|access control|procurement)\b/i;
const ENTERPRISE_CAVEAT_HINT =
  /\b(depends|unless|without|only if|requires|require|missing|limited|gap|constraint|tradeoff|procurement|rollout)\b/i;

function hasEnterpriseFitContradiction(laneOutputs: ToolPageLaneOutputs | null): boolean {
  const enterpriseRow = laneOutputs?.editorial_decision.fit_matrix?.enterprise;
  if (!enterpriseRow || enterpriseRow.fit !== 'weak') return false;
  const enterpriseSignalsText = [
    laneOutputs?.editorial_decision.best_for || '',
    laneOutputs?.editorial_decision.summary || '',
    ...(laneOutputs?.fact_sheet.official_facts || []).map((claim) => claim.text || ''),
  ].join(' ');
  if (!ENTERPRISE_CONTROL_HINT.test(enterpriseSignalsText)) return false;
  const caveatText = `${enterpriseRow.reason || ''} ${enterpriseRow.caveat || ''}`.trim();
  return !ENTERPRISE_CAVEAT_HINT.test(caveatText);
}

export function deriveToolPageDecisionLayerConsistencySignals(
  input: DecisionLayerTextSignalsInput
): {
  hasMalformedDecisionLayerSignal: boolean;
  hasDuplicatePricingRealitySignal: boolean;
  hasDuplicateFitMatrixRowsSignal: boolean;
  hasEnterpriseFitContradictionSignal: boolean;
  hasUnsupportedGenerationModeSignal: boolean;
} {
  const generationMode = input.laneOutputs?.editorial_decision.generation_mode;
  const pricingRealityMode = input.laneOutputs?.fact_sheet.pricing_reality?.generation_mode;
  const fitMatrix = input.laneOutputs?.editorial_decision.fit_matrix;
  const hasFitMatrixRows = Boolean(
    fitMatrix &&
    [fitMatrix.solo, fitMatrix.startup, fitMatrix.mid_market, fitMatrix.enterprise].some((row) =>
      Boolean(row && (hasText(row.reason) || hasText(row.caveat)))
    )
  );
  const hasUnsupportedGenerationModeSignal = Boolean(
    (generationMode?.best_for === 'llm_phrase_only' &&
      hasText(input.laneOutputs?.editorial_decision.best_for || null)) ||
    (generationMode?.not_for === 'llm_phrase_only' &&
      hasText(input.laneOutputs?.editorial_decision.not_for || null)) ||
    (generationMode?.main_tradeoff === 'llm_phrase_only' &&
      hasText(input.laneOutputs?.editorial_decision.main_tradeoff || null)) ||
    (generationMode?.main_risk === 'llm_phrase_only' &&
      hasText(input.laneOutputs?.editorial_decision.main_risk || null)) ||
    (generationMode?.upgrade_trigger === 'llm_phrase_only' &&
      hasText(input.laneOutputs?.editorial_decision.upgrade_trigger || null)) ||
    (generationMode?.fit_matrix === 'llm_phrase_only' && hasFitMatrixRows) ||
    (pricingRealityMode?.free_works_if === 'llm_phrase_only' &&
      hasText(input.laneOutputs?.fact_sheet.pricing_reality?.free_works_if || null)) ||
    (pricingRealityMode?.paid_needed_when === 'llm_phrase_only' &&
      hasText(input.laneOutputs?.fact_sheet.pricing_reality?.paid_needed_when || null)) ||
    (pricingRealityMode?.hidden_cost_triggers === 'llm_phrase_only' &&
      (input.laneOutputs?.fact_sheet.pricing_reality?.hidden_cost_triggers?.length || 0) > 0) ||
    (pricingRealityMode?.main_cost_drivers === 'llm_phrase_only' &&
      (input.laneOutputs?.fact_sheet.pricing_reality?.main_cost_drivers?.length || 0) > 0)
  );

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
    hasEnterpriseFitContradictionSignal: hasEnterpriseFitContradiction(input.laneOutputs),
    hasUnsupportedGenerationModeSignal,
  };
}
