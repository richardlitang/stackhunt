interface ToolPageCategoryLike {
  slug?: unknown;
  name?: unknown;
}

export function buildToolPageCategoryRef(
  category: ToolPageCategoryLike | null | undefined
): { slug: string; name: string } | null {
  if (!category || typeof category.slug !== 'string' || typeof category.name !== 'string') {
    return null;
  }

  return {
    slug: category.slug,
    name: category.name,
  };
}
