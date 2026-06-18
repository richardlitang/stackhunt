import type { buildToolPageRuntimeViewBundle } from '@/lib/tool-page/runtime/runtime-view-bundle';
import { buildToolPagePageSchemaRouteState } from '@/lib/tool-page/route-state/page-schema-route-state';

interface BuildToolPageRuntimeRouteStateInput {
  runtimeViewBundle: ReturnType<typeof buildToolPageRuntimeViewBundle>;
  firstReview: Parameters<typeof buildToolPagePageSchemaRouteState>[0]['firstReview'];
  tool: Parameters<typeof buildToolPagePageSchemaRouteState>[0]['tool'];
  categoryName: string | null;
}

export function buildToolPageRuntimeRouteState(input: BuildToolPageRuntimeRouteStateInput): {
  pageSchemas: unknown[];
  updateHistoryLabels: BuildToolPageRuntimeRouteStateInput['runtimeViewBundle']['updateHistoryLabels'];
  meta: BuildToolPageRuntimeRouteStateInput['runtimeViewBundle']['meta'];
  indexPolicy: BuildToolPageRuntimeRouteStateInput['runtimeViewBundle']['indexPolicy'];
  updateHistoryEntries: BuildToolPageRuntimeRouteStateInput['runtimeViewBundle']['updateHistoryEntries'];
  toolReviewHeading: BuildToolPageRuntimeRouteStateInput['runtimeViewBundle']['toolReviewHeading'];
  lensLabelMap: BuildToolPageRuntimeRouteStateInput['runtimeViewBundle']['lensLabelMap'];
  sourceAriaLabel: BuildToolPageRuntimeRouteStateInput['runtimeViewBundle']['sourceAriaLabel'];
} {
  const { pageSchemas } = buildToolPagePageSchemaRouteState({
    schemas: input.runtimeViewBundle.schemas,
    firstReview: input.firstReview,
    tool: input.tool,
    categoryName: input.categoryName,
  });

  return {
    pageSchemas,
    updateHistoryLabels: input.runtimeViewBundle.updateHistoryLabels,
    meta: input.runtimeViewBundle.meta,
    indexPolicy: input.runtimeViewBundle.indexPolicy,
    updateHistoryEntries: input.runtimeViewBundle.updateHistoryEntries,
    toolReviewHeading: input.runtimeViewBundle.toolReviewHeading,
    lensLabelMap: input.runtimeViewBundle.lensLabelMap,
    sourceAriaLabel: input.runtimeViewBundle.sourceAriaLabel,
  };
}
