import { buildToolPageDecisionRouteState } from '@/lib/tool-page/decision-route-state';
import type { ReviewLens } from '@/lib/tool-page/view-model';

interface BuildToolPageDecisionAssemblyRouteStateInput {
  tool: Parameters<typeof buildToolPageDecisionRouteState>[0]['tool'];
  resolvedSubject: Parameters<typeof buildToolPageDecisionRouteState>[0]['resolvedSubject'];
  activeReviewLens: ReviewLens;
  hasApi: boolean;
  hasParentTool: boolean;
  audienceSlugs: string[];
  lensBestFitLine: Parameters<typeof buildToolPageDecisionRouteState>[0]['lensBestFitLine'];
  lensWeakFitLine: Parameters<typeof buildToolPageDecisionRouteState>[0]['lensWeakFitLine'];
  lensTradeoffLine: Parameters<typeof buildToolPageDecisionRouteState>[0]['lensTradeoffLine'];
  topLensHardLimit: Parameters<typeof buildToolPageDecisionRouteState>[0]['topLensHardLimit'];
  pricingEvidenceSourceUrl: Parameters<
    typeof buildToolPageDecisionRouteState
  >[0]['pricingEvidenceSourceUrl'];
  pricingEvidenceSummary: Parameters<
    typeof buildToolPageDecisionRouteState
  >[0]['pricingEvidenceSummary'];
  contentConfidenceLabel: Parameters<
    typeof buildToolPageDecisionRouteState
  >[0]['contentConfidenceLabel'];
  trustBar: {
    confidence: 'Low' | 'Medium' | 'High';
    pendingCount: number;
  };
}

export function buildToolPageDecisionAssemblyRouteState(
  input: BuildToolPageDecisionAssemblyRouteStateInput
): ReturnType<typeof buildToolPageDecisionRouteState> {
  return buildToolPageDecisionRouteState({
    tool: input.tool,
    resolvedSubject: input.resolvedSubject,
    activeReviewLens: input.activeReviewLens,
    hasApi: input.hasApi,
    hasParentTool: input.hasParentTool,
    audienceSlugs: input.audienceSlugs,
    lensBestFitLine: input.lensBestFitLine,
    lensWeakFitLine: input.lensWeakFitLine,
    lensTradeoffLine: input.lensTradeoffLine,
    topLensHardLimit: input.topLensHardLimit,
    pricingEvidenceSourceUrl: input.pricingEvidenceSourceUrl,
    pricingEvidenceSummary: input.pricingEvidenceSummary,
    contentConfidenceLabel: input.contentConfidenceLabel,
    trustBar: input.trustBar,
  });
}
