interface ToolPageComparableAlternativeLike {
  slug: string;
  name: string;
}

interface BuildToolPageCompareTeasersInput {
  toolSlug: string;
  alternatives: ToolPageComparableAlternativeLike[];
}

export interface ToolPageCompareTeaserLink {
  href: string;
  label: string;
}

export function buildToolPageCompareTeaserLinks(
  input: BuildToolPageCompareTeasersInput
): ToolPageCompareTeaserLink[] {
  return input.alternatives.slice(0, 3).map((alt) => ({
    href: `/compare/${input.toolSlug}-vs-${alt.slug}`,
    label: `Compare ${alt.name}`,
  }));
}
