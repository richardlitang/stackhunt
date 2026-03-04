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

export function deriveToolPageReviewContextSignals(
  reviewContext: unknown
): ToolPageReviewContextSignals {
  const context = asRecord(reviewContext);
  const userAdvocate = asRecord(context?.userAdvocate || context?.user_advocate);
  const budgetAnalyst = asRecord(context?.budgetAnalyst || context?.budget_analyst);
  const humanVerdict =
    typeof (context?.humanVerdict || context?.human_verdict) === 'string'
      ? ((context?.humanVerdict || context?.human_verdict) as string)
      : null;
  const decisionSlotsRaw = asRecord(context?.decisionSlots || context?.decision_slots);
  const decisionIntroRaw = asRecord(context?.decisionIntro || context?.decision_intro);

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
  const idealFor = toStringArray(userAdvocate?.idealFor || userAdvocate?.ideal_for);
  const avoidIf = toStringArray(userAdvocate?.avoidIf || userAdvocate?.avoid_if);

  const budgetCostDrivers = toStringArray(budgetAnalyst?.costDrivers || budgetAnalyst?.cost_drivers);
  const budgetOneTimeFees = toStringArray(budgetAnalyst?.oneTimeFees || budgetAnalyst?.one_time_fees);
  const budgetCommitmentTerms = (budgetAnalyst?.commitmentTerms ||
    budgetAnalyst?.commitment_terms) as string | null | undefined;
  const budgetRoiThreshold = (budgetAnalyst?.roiThreshold ||
    budgetAnalyst?.roi_threshold) as string | null | undefined;

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
