interface BuildToolPageCategoryBreadcrumbInput {
  category:
    | {
        slug: string;
        name: string;
      }
    | null
    | undefined;
}

export interface ToolPageCategoryBreadcrumb {
  href: string;
  label: string;
}

export function buildToolPageCategoryBreadcrumb(
  input: BuildToolPageCategoryBreadcrumbInput
): ToolPageCategoryBreadcrumb | null {
  const category = input.category;
  if (!category?.slug || !category?.name) return null;

  return {
    href: `/categories/${category.slug}`,
    label: category.name,
  };
}
