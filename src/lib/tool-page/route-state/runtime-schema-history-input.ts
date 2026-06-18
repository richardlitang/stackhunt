import type { BuildToolPageRuntimeParamsInput } from '@/lib/tool-page/runtime/runtime-params';

interface BuildToolPageRuntimeSchemasInputFromRouteInput {
  tool: BuildToolPageRuntimeParamsInput['schemas']['tool'];
  primaryOffer: BuildToolPageRuntimeParamsInput['schemas']['primaryOffer'];
  reviewCount: number;
  faqSchema: BuildToolPageRuntimeParamsInput['schemas']['faqSchema'];
}

interface BuildToolPageRuntimeUpdateHistoryInputFromRouteInput {
  communityVerifiedLabel: string | null;
  specsVerifiedLabel: string | null;
  pricingCheckedLabel: string | null;
}

export function buildToolPageRuntimeSchemasInputFromRoute(
  input: BuildToolPageRuntimeSchemasInputFromRouteInput
): BuildToolPageRuntimeParamsInput['schemas'] {
  return {
    tool: input.tool,
    primaryOffer: input.primaryOffer,
    reviewCount: input.reviewCount,
    faqSchema: input.faqSchema,
  };
}

export function buildToolPageRuntimeUpdateHistoryInputFromRoute(
  input: BuildToolPageRuntimeUpdateHistoryInputFromRouteInput
): BuildToolPageRuntimeParamsInput['updateHistory'] {
  return {
    communityVerifiedLabel: input.communityVerifiedLabel,
    specsVerifiedLabel: input.specsVerifiedLabel,
    pricingCheckedLabel: input.pricingCheckedLabel,
  };
}
