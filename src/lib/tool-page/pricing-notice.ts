interface BuildToolPagePricingNoticeInput {
  pricingCheckedLabel: string | null;
}

export function buildToolPagePricingNotice(input: BuildToolPagePricingNoticeInput): string {
  if (input.pricingCheckedLabel) {
    return `Pricing changes frequently; confirm on the vendor site. Shown as of ${input.pricingCheckedLabel}.`;
  }

  return 'Pricing changes frequently. Pricing check is pending until a pricing source URL and retrieved date are both captured.';
}
