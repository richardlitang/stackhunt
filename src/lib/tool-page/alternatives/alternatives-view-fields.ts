import type { ToolPageAlternativesState } from '@/lib/tool-page/alternatives/alternatives-state';

export function buildToolPageAlternativesViewFields(alternativesState: ToolPageAlternativesState): {
  comparableAlternatives: ToolPageAlternativesState['comparableAlternatives'];
  hasComparableAlternatives: boolean;
  canCompareByAlternativeSlug: ToolPageAlternativesState['canCompareBySlug'];
} {
  return {
    comparableAlternatives: alternativesState.comparableAlternatives,
    hasComparableAlternatives: alternativesState.hasComparableAlternatives,
    canCompareByAlternativeSlug: alternativesState.canCompareBySlug,
  };
}
