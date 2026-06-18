interface BuildToolPagePricingNoticeInput {
  pricingCheckedLabel: string | null;
}

export function buildToolPagePricingNotice(input: BuildToolPagePricingNoticeInput): string {
  if (input.pricingCheckedLabel) {
    return `Pricing changes frequently; confirm on the vendor site. Shown as of ${input.pricingCheckedLabel}.`;
  }

  return "Pricing varies and may change. We're re-verifying published pricing, meanwhile the most reliable cost drivers are seats, workspace count, and plan tier.";
}
