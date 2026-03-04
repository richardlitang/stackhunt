import { areToolsComparable } from '@/lib/analysis/comparator';

export interface ToolPageAlternativeCategoryRef {
  category?: {
    id?: string | null;
  } | null;
  item_category_links?: Array<{
    category?: {
      id?: string | null;
    } | null;
  }> | null;
}

export interface ToolPageAlternativeComparableRef extends ToolPageAlternativeCategoryRef {
  slug?: string | null;
  metadata?: unknown;
}

export interface ToolPageAlternativesState {
  comparableAlternatives: ToolPageAlternativeComparableRef[];
  hasComparableAlternatives: boolean;
  canCompareBySlug: Record<string, boolean>;
}

function getPrimaryCategoryId(item: ToolPageAlternativeCategoryRef): string | null {
  return item?.category?.id || item?.item_category_links?.[0]?.category?.id || null;
}

export function buildToolPageAlternativesState(
  mainTool: ToolPageAlternativeComparableRef,
  alternatives: ToolPageAlternativeComparableRef[]
): ToolPageAlternativesState {
  const comparableAlternatives: ToolPageAlternativeComparableRef[] = [];
  const canCompareBySlug: Record<string, boolean> = {};

  for (const alternative of alternatives) {
    const alternativeSlug = typeof alternative.slug === 'string' ? alternative.slug : '';
    if (!alternativeSlug) continue;
    const canCompare = areToolsComparable(
      {
        slug: mainTool.slug || '',
        category_id: getPrimaryCategoryId(mainTool),
        metadata: (mainTool.metadata as Record<string, unknown> | null) || null,
      },
      {
        slug: alternativeSlug,
        category_id: getPrimaryCategoryId(alternative),
        metadata: (alternative.metadata as Record<string, unknown> | null) || null,
      }
    );
    canCompareBySlug[alternativeSlug] = canCompare;
    if (canCompare) {
      comparableAlternatives.push(alternative);
    }
  }

  return {
    comparableAlternatives,
    hasComparableAlternatives: comparableAlternatives.length > 0,
    canCompareBySlug,
  };
}
