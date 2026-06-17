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

const GENERIC_PRICING_COPY_PATTERN =
  /\bsupports core workflows\b.*\bplan limits\b.*\bfeature constraints\b.*\bdocumented in (?:the )?source\b/i;

function sanitizePricingInsightText(value: string | null | undefined): string | null {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) return null;
  if (GENERIC_PRICING_COPY_PATTERN.test(text)) return null;
  return text;
}

function sanitizePricingInsightList(items: string[]): string[] {
  return items
    .map((item) => sanitizePricingInsightText(item))
    .filter((item): item is string => Boolean(item));
}

export function buildToolPagePricingInsightsBudgetAnalyst(
  input: BuildToolPagePricingInsightsInput
): ToolPagePricingInsightsBudgetAnalyst | undefined {
  const costDrivers = sanitizePricingInsightList(input.budgetCostDrivers);
  const oneTimeFees = sanitizePricingInsightList(input.budgetOneTimeFees);
  const commitmentTerms = sanitizePricingInsightText(input.budgetCommitmentTerms);
  const roiThreshold = sanitizePricingInsightText(input.budgetRoiThreshold);
  const hasAny =
    costDrivers.length > 0 ||
    oneTimeFees.length > 0 ||
    Boolean(commitmentTerms) ||
    Boolean(roiThreshold);

  if (!hasAny) return undefined;

  return {
    costDrivers,
    oneTimeFees,
    commitmentTerms,
    roiThreshold,
  };
}
