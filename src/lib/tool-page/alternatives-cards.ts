interface ToolPageAlternativeLike {
  slug: string;
}

interface BuildToolPageAlternativesCardsInput<TAlternative extends ToolPageAlternativeLike> {
  alternatives: TAlternative[];
  canCompareByAlternativeSlug: Record<string, boolean>;
}

export interface ToolPageAlternativeCardView {
  alt: ToolPageAlternativeLike;
  showCompareLink: boolean;
}

export function buildToolPageAlternativeCardsView<TAlternative extends ToolPageAlternativeLike>(
  input: BuildToolPageAlternativesCardsInput<TAlternative>
): Array<{ alt: TAlternative; showCompareLink: boolean }> {
  return input.alternatives.map((alt) => ({
    alt,
    showCompareLink: Boolean(input.canCompareByAlternativeSlug[alt.slug]),
  }));
}
