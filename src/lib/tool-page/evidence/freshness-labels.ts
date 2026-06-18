interface BuildToolPageFreshnessLabelsInput {
  communityVerifiedLabel: string | null;
  specsVerifiedLabel: string | null;
  pricingVerifiedLabel: string | null;
  pricingCheckedLabel: string | null;
}

export interface ToolPageFreshnessLabels {
  verdictAsOfLabel: string;
  trustBarLastCheckedLabel: string;
  pricingSectionLastCheckedLabel: string;
}

export function buildToolPageFreshnessLabels(
  input: BuildToolPageFreshnessLabelsInput
): ToolPageFreshnessLabels {
  return {
    verdictAsOfLabel:
      input.communityVerifiedLabel ||
      input.specsVerifiedLabel ||
      input.pricingVerifiedLabel ||
      'the latest review',
    trustBarLastCheckedLabel:
      input.communityVerifiedLabel ||
      input.specsVerifiedLabel ||
      input.pricingCheckedLabel ||
      'Unknown',
    pricingSectionLastCheckedLabel: input.pricingCheckedLabel || 'unknown',
  };
}
