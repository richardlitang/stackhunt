import { buildToolPageCategoryRef } from '@/lib/tool-page/category-ref';
import { buildToolPageSpecsSignals } from '@/lib/tool-page/specs-signals';

interface BuildToolPageSpecsCategoryRouteStateInput {
  specs: Parameters<typeof buildToolPageSpecsSignals>[0]['specs'];
  userReportedPros: Parameters<typeof buildToolPageSpecsSignals>[0]['userReportedPros'];
  userReportedCons: Parameters<typeof buildToolPageSpecsSignals>[0]['userReportedCons'];
  activeReviewLens: Parameters<typeof buildToolPageSpecsSignals>[0]['activeReviewLens'];
  category: Parameters<typeof buildToolPageCategoryRef>[0];
}

export function buildToolPageSpecsCategoryRouteState(
  input: BuildToolPageSpecsCategoryRouteStateInput
): ReturnType<typeof buildToolPageSpecsSignals> & {
  toolCategoryRef: ReturnType<typeof buildToolPageCategoryRef>;
} {
  return {
    ...buildToolPageSpecsSignals({
      specs: input.specs,
      userReportedPros: input.userReportedPros,
      userReportedCons: input.userReportedCons,
      activeReviewLens: input.activeReviewLens,
    }),
    toolCategoryRef: buildToolPageCategoryRef(input.category),
  };
}
