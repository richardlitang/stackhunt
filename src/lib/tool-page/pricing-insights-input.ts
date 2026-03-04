export interface ToolPagePricingInsightsBudgetAnalyst {
  costDrivers: string[];
  oneTimeFees: string[];
  commitmentTerms?: string | null;
  roiThreshold?: string | null;
}

interface BuildToolPagePricingInsightsInput {
  budgetCostDrivers: string[];
  budgetOneTimeFees: string[];
  budgetCommitmentTerms: string | null | undefined;
  budgetRoiThreshold: string | null | undefined;
}

export function buildToolPagePricingInsightsBudgetAnalyst(
  input: BuildToolPagePricingInsightsInput
): ToolPagePricingInsightsBudgetAnalyst | undefined {
  const hasAny =
    input.budgetCostDrivers.length > 0 ||
    input.budgetOneTimeFees.length > 0 ||
    Boolean(input.budgetCommitmentTerms) ||
    Boolean(input.budgetRoiThreshold);

  if (!hasAny) return undefined;

  return {
    costDrivers: input.budgetCostDrivers,
    oneTimeFees: input.budgetOneTimeFees,
    commitmentTerms: input.budgetCommitmentTerms,
    roiThreshold: input.budgetRoiThreshold,
  };
}
