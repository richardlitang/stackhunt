interface ItemCategoryLink {
  category?: {
    id?: string | null;
  } | null;
}

interface ToolAlternativeInput {
  slug: string;
  metadata?: unknown;
  item_category_links?: unknown;
}

interface BuildToolPageAlternativesStateInput {
  tool: ToolAlternativeInput;
  orderedAlternatives: ToolAlternativeInput[];
}

interface ToolAlternativeStateItem {
  slug: string;
  category: null;
  item_category_links: ItemCategoryLink[] | null;
  metadata?: unknown;
}

function toItemCategoryLinks(value: unknown): ItemCategoryLink[] | null {
  if (!Array.isArray(value)) return null;
  return value.filter((entry): entry is ItemCategoryLink =>
    Boolean(entry && typeof entry === 'object')
  );
}

export interface ToolPageAlternativesStateInput {
  primaryTool: ToolAlternativeStateItem;
  alternatives: ToolAlternativeStateItem[];
}

export function buildToolPageAlternativesStateInput(
  input: BuildToolPageAlternativesStateInput
): ToolPageAlternativesStateInput {
  return {
    primaryTool: {
      slug: input.tool.slug,
      category: null,
      item_category_links: toItemCategoryLinks(input.tool.item_category_links),
      metadata: input.tool.metadata,
    },
    alternatives: input.orderedAlternatives.map((item) => ({
      slug: item.slug,
      category: null,
      item_category_links: toItemCategoryLinks(item.item_category_links),
      metadata: item.metadata,
    })),
  };
}
