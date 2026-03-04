interface BuildToolPageAlternativesSectionInput {
  category: {
    slug: string;
    name: string;
  } | null;
}

export function buildToolPageAlternativesSectionState(
  input: BuildToolPageAlternativesSectionInput
): {
  viewAllHref: string | null;
} {
  return {
    viewAllHref: input.category ? `/categories/${input.category.slug}` : null,
  };
}
