interface BuildToolPagePricingEvidenceStateInput {
  hasOfficialPricingSource: boolean;
  pricingEvidenceCount: number;
}

export function buildToolPagePricingEvidenceState(
  input: BuildToolPagePricingEvidenceStateInput
): {
  hasEvidencePanel: boolean;
} {
  return {
    hasEvidencePanel: input.hasOfficialPricingSource || input.pricingEvidenceCount > 0,
  };
}
