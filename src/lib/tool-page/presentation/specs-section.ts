interface BuildToolPageSpecsSectionStateInput {
  specsVerifiedLabel: string | null;
}

export function buildToolPageSpecsSectionState(input: BuildToolPageSpecsSectionStateInput): {
  checkedLead: string | null;
} {
  return {
    checkedLead: input.specsVerifiedLabel ? `Specs checked ${input.specsVerifiedLabel}` : null,
  };
}
