interface BuildToolPageSourcesSectionStateInput {
  evidenceBasisCount: number;
}

export function buildToolPageSourcesSectionState(input: BuildToolPageSourcesSectionStateInput): {
  hasSources: boolean;
} {
  return {
    hasSources: input.evidenceBasisCount > 0,
  };
}
