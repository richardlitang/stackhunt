import type { BuildToolPageRuntimeParamsInput } from '@/lib/tool-page/runtime/runtime-params';

interface BuildToolPageRuntimeViewModelInputFromRouteInput {
  hasVerdict: boolean;
  showProceduralVerdict: boolean;
  showPricingSection: boolean;
  hasGettingStarted: boolean;
  hasFeatures: boolean;
  hasSpecs: boolean;
  showProceduralSpecs: boolean;
  hasPlatform: boolean;
  hasAlternatives: boolean;
}

export function buildToolPageRuntimeViewModelInputFromRoute(
  input: BuildToolPageRuntimeViewModelInputFromRouteInput
): BuildToolPageRuntimeParamsInput['lens']['viewModelInput'] {
  return {
    hasVerdict: input.hasVerdict,
    showProceduralVerdict: input.showProceduralVerdict,
    showPricingSection: input.showPricingSection,
    hasGettingStarted: input.hasGettingStarted,
    hasFeatures: input.hasFeatures,
    hasSpecs: input.hasSpecs,
    showProceduralSpecs: input.showProceduralSpecs,
    hasPlatform: input.hasPlatform,
    hasAlternatives: input.hasAlternatives,
  };
}
