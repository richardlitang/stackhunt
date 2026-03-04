interface BuildToolPageAlternativesIntroTextInput {
  alternativesLabel: 'Alternatives' | 'Related Tools';
  primaryFunction: string | null;
  categoryName: string | null;
}

export function buildToolPageAlternativesIntroText(
  input: BuildToolPageAlternativesIntroTextInput
): string {
  if (input.alternativesLabel !== 'Alternatives') {
    return 'Similar tools you might find useful';
  }

  const subject =
    input.primaryFunction?.trim().toLowerCase() || input.categoryName?.trim().toLowerCase() || 'software';

  return `Other ${subject} tools to consider`;
}
