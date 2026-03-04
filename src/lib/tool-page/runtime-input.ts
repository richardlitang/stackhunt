import type { BuildToolPageRuntimeInput } from '@/lib/tool-page/runtime';

export interface BuildToolPageRuntimeInputParams {
  pathname: string;
  searchParams: URLSearchParams;
  activeReviewLens: 'general' | 'personal' | 'startup' | 'enterprise';
  viewModelInput: BuildToolPageRuntimeInput['lensInput']['viewModelInput'];
  lensContentInput: BuildToolPageRuntimeInput['lensInput']['lensContentInput'];
  trustInput: BuildToolPageRuntimeInput['trustInput'];
  qaInput: BuildToolPageRuntimeInput['metaInput']['qaInput'];
  indexInput: BuildToolPageRuntimeInput['metaInput']['indexInput'];
  baseMeta: BuildToolPageRuntimeInput['metaInput']['baseMeta'];
  schemasInput: BuildToolPageRuntimeInput['schemasInput'];
  updateHistoryLabelsInput: BuildToolPageRuntimeInput['updateHistoryLabelsInput'];
}

export function buildToolPageRuntimeInput(
  params: BuildToolPageRuntimeInputParams
): BuildToolPageRuntimeInput {
  return {
    lensInput: {
      pathname: params.pathname,
      searchParams: params.searchParams,
      activeReviewLens: params.activeReviewLens,
      viewModelInput: params.viewModelInput,
      lensContentInput: params.lensContentInput,
    },
    trustInput: params.trustInput,
    metaInput: {
      qaInput: params.qaInput,
      indexInput: params.indexInput,
      baseMeta: params.baseMeta,
    },
    schemasInput: params.schemasInput,
    updateHistoryLabelsInput: params.updateHistoryLabelsInput,
  };
}
