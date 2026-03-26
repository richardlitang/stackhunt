import type { ToolPageLaneOutputs } from '@/lib/tool-page/lane-outputs';

export interface ToolPageReviewContextSignals {
  userAdvocate: Record<string, unknown> | null;
  budgetAnalyst: Record<string, unknown> | null;
  humanVerdict: string | null;
  decisionSlotsRaw: Record<string, unknown> | null;
  decisionIntroRaw: Record<string, unknown> | null;
  delighters: string[];
  frustrations: string[];
  powerTip: string | null;
  vibe: string | null;
  originStory: string | null;
  idealFor: string[];
  avoidIf: string[];
  budgetCostDrivers: string[];
  budgetOneTimeFees: string[];
  budgetCommitmentTerms: string | null | undefined;
  budgetRoiThreshold: string | null | undefined;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map((item) => item.trim());
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function isRenderableMode(mode: unknown): boolean {
  return mode === 'deterministic' || mode === 'extractive';
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const value of values) {
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(trimmed);
  }
  return output;
}

export function deriveToolPageReviewContextSignals(input: {
  reviewContext: unknown;
  laneOutputs?: ToolPageLaneOutputs | null;
}): ToolPageReviewContextSignals {
  const context = asRecord(input.reviewContext);
  const laneDecision = input.laneOutputs?.editorial_decision;
  const lanePricing = input.laneOutputs?.fact_sheet.pricing_reality;
  const laneDecisionMode = laneDecision?.generation_mode;
  const lanePricingMode = lanePricing?.generation_mode;
  const userAdvocate = asRecord(context?.userAdvocate || context?.user_advocate);
  const budgetAnalyst = asRecord(context?.budgetAnalyst || context?.budget_analyst);
  const reviewContextHumanVerdict =
    typeof (context?.humanVerdict || context?.human_verdict) === 'string'
      ? ((context?.humanVerdict || context?.human_verdict) as string)
      : null;
  const laneHumanVerdict =
    typeof laneDecision?.human_verdict === 'string' && laneDecision.human_verdict.trim().length > 0
      ? laneDecision.human_verdict.trim()
      : null;
  const humanVerdict = laneHumanVerdict || reviewContextHumanVerdict;

  const reviewContextDecisionSlotsRaw = asRecord(context?.decisionSlots || context?.decision_slots);
  const reviewContextDecisionIntroRaw = asRecord(context?.decisionIntro || context?.decision_intro);
  const laneDecisionIntroRaw =
    isRenderableMode(laneDecisionMode?.summary) ||
    isRenderableMode(laneDecisionMode?.best_for) ||
    isRenderableMode(laneDecisionMode?.not_for) ||
    isRenderableMode(laneDecisionMode?.main_tradeoff)
      ? {
          what_it_is: isRenderableMode(laneDecisionMode?.summary)
            ? laneDecision?.summary || null
            : null,
          best_for: isRenderableMode(laneDecisionMode?.best_for)
            ? laneDecision?.best_for || null
            : null,
          not_for: isRenderableMode(laneDecisionMode?.not_for)
            ? laneDecision?.not_for || null
            : null,
          main_tradeoff: isRenderableMode(laneDecisionMode?.main_tradeoff)
            ? laneDecision?.main_tradeoff || null
            : null,
          summary: isRenderableMode(laneDecisionMode?.summary)
            ? laneDecision?.summary || null
            : null,
        }
      : null;
  const laneDecisionSlotsRaw =
    isRenderableMode(laneDecisionMode?.summary) ||
    isRenderableMode(laneDecisionMode?.best_for) ||
    isRenderableMode(laneDecisionMode?.not_for) ||
    isRenderableMode(laneDecisionMode?.main_tradeoff)
      ? {
          what_it_is: isRenderableMode(laneDecisionMode?.summary)
            ? laneDecision?.summary || null
            : null,
          best_fit: isRenderableMode(laneDecisionMode?.best_for)
            ? laneDecision?.best_for || null
            : null,
          weak_fit: isRenderableMode(laneDecisionMode?.not_for)
            ? laneDecision?.not_for || null
            : null,
          tradeoff: isRenderableMode(laneDecisionMode?.main_tradeoff)
            ? laneDecision?.main_tradeoff || null
            : null,
          summary: isRenderableMode(laneDecisionMode?.summary)
            ? laneDecision?.summary || null
            : null,
        }
      : null;
  const decisionSlotsRaw = laneDecisionSlotsRaw || reviewContextDecisionSlotsRaw;
  const decisionIntroRaw = laneDecisionIntroRaw || reviewContextDecisionIntroRaw;

  const delighters = toStringArray(userAdvocate?.delighters);
  const frustrations = toStringArray(userAdvocate?.frustrations);
  const powerTip =
    typeof (userAdvocate?.powerTip || userAdvocate?.power_tip) === 'string'
      ? ((userAdvocate?.powerTip || userAdvocate?.power_tip) as string)
      : null;
  const vibe = typeof userAdvocate?.vibe === 'string' ? (userAdvocate.vibe as string) : null;
  const originStory =
    typeof (userAdvocate?.originStory || userAdvocate?.origin_story) === 'string'
      ? ((userAdvocate?.originStory || userAdvocate?.origin_story) as string)
      : null;
  const reviewContextIdealFor = toStringArray(userAdvocate?.idealFor || userAdvocate?.ideal_for);
  const laneBestFor =
    isRenderableMode(laneDecisionMode?.best_for) &&
    typeof laneDecision?.best_for === 'string' &&
    laneDecision.best_for.trim().length > 0
      ? laneDecision.best_for.trim()
      : null;
  const idealFor = uniqueStrings([laneBestFor, ...reviewContextIdealFor]);

  const reviewContextAvoidIf = toStringArray(userAdvocate?.avoidIf || userAdvocate?.avoid_if);
  const laneNotFor =
    isRenderableMode(laneDecisionMode?.not_for) &&
    typeof laneDecision?.not_for === 'string' &&
    laneDecision.not_for.trim().length > 0
      ? laneDecision.not_for.trim()
      : null;
  const avoidIf = uniqueStrings([laneNotFor, ...reviewContextAvoidIf]);

  const reviewContextBudgetCostDrivers = toStringArray(
    budgetAnalyst?.costDrivers || budgetAnalyst?.cost_drivers
  );
  const laneBudgetCostDrivers =
    isRenderableMode(lanePricingMode?.main_cost_drivers) &&
    Array.isArray(lanePricing?.main_cost_drivers)
      ? lanePricing.main_cost_drivers
      : [];
  const budgetCostDrivers = uniqueStrings([
    ...laneBudgetCostDrivers,
    ...reviewContextBudgetCostDrivers,
  ]);
  const budgetOneTimeFees = toStringArray(
    budgetAnalyst?.oneTimeFees || budgetAnalyst?.one_time_fees
  );
  const budgetCommitmentTerms = (budgetAnalyst?.commitmentTerms ||
    budgetAnalyst?.commitment_terms) as string | null | undefined;
  const budgetRoiThresholdFromContext = (budgetAnalyst?.roiThreshold ||
    budgetAnalyst?.roi_threshold) as string | null | undefined;
  const budgetRoiThreshold =
    isRenderableMode(lanePricingMode?.paid_needed_when) &&
    typeof lanePricing?.paid_needed_when === 'string' &&
    lanePricing.paid_needed_when.trim().length > 0
      ? lanePricing.paid_needed_when.trim()
      : budgetRoiThresholdFromContext;

  return {
    userAdvocate,
    budgetAnalyst,
    humanVerdict,
    decisionSlotsRaw,
    decisionIntroRaw,
    delighters,
    frustrations,
    powerTip,
    vibe,
    originStory,
    idealFor,
    avoidIf,
    budgetCostDrivers,
    budgetOneTimeFees,
    budgetCommitmentTerms,
    budgetRoiThreshold,
  };
}
