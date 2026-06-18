interface DeriveToolPageUpdateHistoryLabelsInput {
  communityVerifiedLabel: string | null;
  specsVerifiedLabel: string | null;
  pricingCheckedLabel: string | null;
}

export interface ToolPageUpdateHistoryLabels {
  lastUpdateLabel: string;
  lastCheckLabel: string;
}

export function deriveToolPageUpdateHistoryLabels(
  input: DeriveToolPageUpdateHistoryLabelsInput
): ToolPageUpdateHistoryLabels {
  return {
    lastUpdateLabel:
      input.communityVerifiedLabel ||
      input.specsVerifiedLabel ||
      input.pricingCheckedLabel ||
      'unknown',
    lastCheckLabel:
      input.pricingCheckedLabel ||
      input.specsVerifiedLabel ||
      input.communityVerifiedLabel ||
      'unknown',
  };
}
