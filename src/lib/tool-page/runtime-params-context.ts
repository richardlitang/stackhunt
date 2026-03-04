import type { BuildToolPageRuntimeParamsInput } from '@/lib/tool-page/runtime-params';

interface BuildToolPageRuntimeParamsContextInput {
  pathname: string;
  searchParams: URLSearchParams;
  activeReviewLens: BuildToolPageRuntimeParamsInput['request']['activeReviewLens'];
  viewModelInput: BuildToolPageRuntimeParamsInput['lens']['viewModelInput'];
  lensContentInput: BuildToolPageRuntimeParamsInput['lens']['contentInput'];
  canonicalHardLimits: BuildToolPageRuntimeParamsInput['lens']['canonicalHardLimits'];
  trust: BuildToolPageRuntimeParamsInput['trust'];
  meta: BuildToolPageRuntimeParamsInput['meta'];
  schemas: BuildToolPageRuntimeParamsInput['schemas'];
  updateHistory: BuildToolPageRuntimeParamsInput['updateHistory'];
}

export function buildToolPageRuntimeParamsContext(
  input: BuildToolPageRuntimeParamsContextInput
): BuildToolPageRuntimeParamsInput {
  return {
    request: {
      pathname: input.pathname,
      searchParams: input.searchParams,
      activeReviewLens: input.activeReviewLens,
    },
    lens: {
      viewModelInput: input.viewModelInput,
      contentInput: input.lensContentInput,
      canonicalHardLimits: input.canonicalHardLimits,
    },
    trust: input.trust,
    meta: input.meta,
    schemas: input.schemas,
    updateHistory: input.updateHistory,
  };
}
