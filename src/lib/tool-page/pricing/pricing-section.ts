interface BuildToolPagePricingSectionStateInput {
  pricingCheckedLabel: string | null;
}

export function buildToolPagePricingSectionState(input: BuildToolPagePricingSectionStateInput): {
  checkedLead: string | null;
} {
  return {
    checkedLead: input.pricingCheckedLabel ? `Pricing checked ${input.pricingCheckedLabel}` : null,
  };
}
