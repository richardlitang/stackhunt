interface BuildToolPageLowConfidenceSourcesStateInput {
  count: number;
}

export function buildToolPageLowConfidenceSourcesState(
  input: BuildToolPageLowConfidenceSourcesStateInput
): {
  show: boolean;
  title: string;
} {
  return {
    show: input.count > 0,
    title: `Low-confidence secondary sources (${input.count})`,
  };
}
