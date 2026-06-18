import type { MetaProps } from '@/lib/seo';
import { buildToolPageViewRuntime } from '@/lib/tool-page/runtime/view-runtime';
import type { ReviewLens } from '@/lib/tool-page/presentation/view-model';
import type { buildToolPageRuntime } from '@/lib/tool-page/runtime/runtime';

interface BuildToolPageRuntimeViewBundleInput {
  runtime: ReturnType<typeof buildToolPageRuntime>;
  toolName: string;
  toolMeta: {
    title: string;
    description: string;
    canonical: string;
    ogImage?: string;
    ogType?: 'website' | 'article';
  };
}

export function buildToolPageRuntimeViewBundle(input: BuildToolPageRuntimeViewBundleInput): {
  schemas: ReturnType<typeof buildToolPageRuntime>['schemas'];
  updateHistoryLabels: ReturnType<typeof buildToolPageRuntime>['updateHistoryLabels'];
  meta: MetaProps;
  indexPolicy: ReturnType<typeof buildToolPageRuntime>['metaRuntime']['indexPolicy'];
  pendingVerificationCount: number;
  trustStatus: ReturnType<typeof buildToolPageRuntime>['trustRuntime']['trustStatus'];
  trustConfidenceLabel: string;
  updateHistoryEntries: ReturnType<
    typeof buildToolPageRuntime
  >['trustRuntime']['updateHistoryEntries'];
  toolReviewHeading: string;
  lensLabelMap: Record<ReviewLens, string>;
  sourceAriaLabel: (context: string) => string;
  lensRuntime: ReturnType<typeof buildToolPageRuntime>['lensRuntime'];
} {
  const { lensRuntime, trustRuntime, metaRuntime, schemas, updateHistoryLabels } = input.runtime;
  const viewRuntime = buildToolPageViewRuntime({
    toolName: input.toolName,
    toolMeta: input.toolMeta,
    metaRuntimeMeta: metaRuntime.meta,
  });
  const { toolReviewHeading, lensLabelMap, sourceAriaLabel, meta } = viewRuntime;

  return {
    schemas,
    updateHistoryLabels,
    meta,
    indexPolicy: metaRuntime.indexPolicy,
    pendingVerificationCount: trustRuntime.pendingVerificationCount,
    trustStatus: trustRuntime.trustStatus,
    trustConfidenceLabel: trustRuntime.trustConfidenceLabel,
    updateHistoryEntries: trustRuntime.updateHistoryEntries,
    toolReviewHeading,
    lensLabelMap,
    sourceAriaLabel,
    lensRuntime,
  };
}
