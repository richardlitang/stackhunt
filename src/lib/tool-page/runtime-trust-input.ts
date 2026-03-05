import type { BuildToolPageRuntimeParamsInput } from '@/lib/tool-page/runtime-params';

interface BuildToolPageRuntimeTrustInputFromRouteInput {
  baseEvidenceGrade: BuildToolPageRuntimeParamsInput['trust']['baseEvidenceGrade'];
  avoidIfBullet: BuildToolPageRuntimeParamsInput['trust']['avoidIfBullet'];
  tradeoffCons: BuildToolPageRuntimeParamsInput['trust']['tradeoffCons'];
  decisionProofPoints: BuildToolPageRuntimeParamsInput['trust']['decisionProofPoints'];
  hasCollectedSources: boolean;
  contentConfidenceLevel: BuildToolPageRuntimeParamsInput['trust']['contentConfidenceLevel'];
  hasPricingCheckedProof: boolean;
  pricingCheckedLabel: string | null;
  pricingSourceUrl: string | null;
  specsVerifiedLabel: string | null;
  officialDocsSourceUrl: string | null;
  communityVerifiedLabel: string | null;
  officialPricingSourceUrl: string | null;
}

export function buildToolPageRuntimeTrustInputFromRoute(
  input: BuildToolPageRuntimeTrustInputFromRouteInput
): BuildToolPageRuntimeParamsInput['trust'] {
  return {
    baseEvidenceGrade: input.baseEvidenceGrade,
    avoidIfBullet: input.avoidIfBullet,
    tradeoffCons: input.tradeoffCons,
    decisionProofPoints: input.decisionProofPoints,
    hasCollectedSources: input.hasCollectedSources,
    contentConfidenceLevel: input.contentConfidenceLevel,
    hasPricingCheckedProof: input.hasPricingCheckedProof,
    pricingCheckedLabel: input.pricingCheckedLabel,
    pricingSourceUrl: input.pricingSourceUrl,
    specsVerifiedLabel: input.specsVerifiedLabel,
    officialDocsSourceUrl: input.officialDocsSourceUrl,
    communityVerifiedLabel: input.communityVerifiedLabel,
    officialPricingSourceUrl: input.officialPricingSourceUrl,
  };
}
