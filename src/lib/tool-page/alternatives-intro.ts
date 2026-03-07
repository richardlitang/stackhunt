interface BuildToolPageAlternativesIntroTextInput {
  alternativesLabel: 'Alternatives' | 'Related Tools';
  primaryFunction: string | null;
  categoryName: string | null;
}

export function buildToolPageAlternativesIntroText(
  input: BuildToolPageAlternativesIntroTextInput
): string | null {
  if (input.alternativesLabel !== 'Alternatives') {
    return null;
  }

  const subject =
    input.primaryFunction?.trim().toLowerCase() || input.categoryName?.trim().toLowerCase() || null;
  if (!subject) return null;

  return `Other ${subject} tools to consider`;
}
