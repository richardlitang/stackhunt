import { generateToolMeta } from '@/lib/seo';
import { buildToolPageLensHardLimitRouteState } from '@/lib/tool-page/lens-hard-limit-route-state';
import { buildToolPageRuntimeNavigationRouteState } from '@/lib/tool-page/runtime-navigation-route-state';
import { buildToolPageSpecsCategoryRouteState } from '@/lib/tool-page/specs-category-route-state';

interface BuildToolPageRuntimeMidRouteStateInput {
  activeReviewLens: Parameters<typeof buildToolPageRuntimeNavigationRouteState>[0]['activeReviewLens'];
  canonicalHardLimits: Parameters<typeof buildToolPageLensHardLimitRouteState>[0]['canonicalHardLimits'];
  specs: Parameters<typeof buildToolPageSpecsCategoryRouteState>[0]['specs'];
  userReportedPros: Parameters<typeof buildToolPageSpecsCategoryRouteState>[0]['userReportedPros'];
  userReportedCons: Parameters<typeof buildToolPageSpecsCategoryRouteState>[0]['userReportedCons'];
  category: Parameters<typeof buildToolPageSpecsCategoryRouteState>[0]['category'];
  runtimeNavigation: Omit<
    Parameters<typeof buildToolPageRuntimeNavigationRouteState>[0],
    'activeReviewLens' | 'canonicalHardLimits' | 'toolMeta' | 'category'
  >;
}

export function buildToolPageRuntimeMidRouteState(
  input: BuildToolPageRuntimeMidRouteStateInput
): ReturnType<typeof buildToolPageLensHardLimitRouteState> &
  ReturnType<typeof buildToolPageSpecsCategoryRouteState> &
  ReturnType<typeof buildToolPageRuntimeNavigationRouteState> {
  const lensHardLimitState = buildToolPageLensHardLimitRouteState({
    canonicalHardLimits: input.canonicalHardLimits,
    activeReviewLens: input.activeReviewLens,
  });
  const specsCategoryState = buildToolPageSpecsCategoryRouteState({
    specs: input.specs,
    userReportedPros: input.userReportedPros,
    userReportedCons: input.userReportedCons,
    activeReviewLens: input.activeReviewLens,
    category: input.category,
  });
  const toolMeta = generateToolMeta(
    input.runtimeNavigation.tool,
    input.runtimeNavigation.tool.review_count
  );
  const runtimeNavigationState = buildToolPageRuntimeNavigationRouteState({
    ...input.runtimeNavigation,
    activeReviewLens: input.activeReviewLens,
    canonicalHardLimits: input.canonicalHardLimits,
    toolMeta,
    category: specsCategoryState.toolCategoryRef,
  });

  return {
    ...lensHardLimitState,
    ...specsCategoryState,
    ...runtimeNavigationState,
  };
}
