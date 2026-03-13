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

interface BuildToolPageDecisionAssemblyRouteStateFromRouteContextInput {
  tool: BuildToolPageDecisionAssemblyRouteStateInput['tool'];
  resolvedSubject: BuildToolPageDecisionAssemblyRouteStateInput['resolvedSubject'];
  activeReviewLens: BuildToolPageDecisionAssemblyRouteStateInput['activeReviewLens'];
  hasApi: boolean;
  hasParentTool: boolean;
  audiences: Array<{ slug?: string | null; name?: string | null }>;
  lensBestFitLine: BuildToolPageDecisionAssemblyRouteStateInput['lensBestFitLine'];
  lensWeakFitLine: BuildToolPageDecisionAssemblyRouteStateInput['lensWeakFitLine'];
  lensTradeoffLine: BuildToolPageDecisionAssemblyRouteStateInput['lensTradeoffLine'];
  topLensHardLimit: BuildToolPageDecisionAssemblyRouteStateInput['topLensHardLimit'];
  pricingEvidenceLinks: Array<{ sourceUrl?: string | null; text?: string | null }>;
  officialPricingSourceUrl: string | null;
  contentConfidenceLabel: BuildToolPageDecisionAssemblyRouteStateInput['contentConfidenceLabel'];
  trustBar: BuildToolPageDecisionAssemblyRouteStateInput['trustBar'];
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

export function buildToolPageDecisionAssemblyRouteStateFromRouteContext(
  input: BuildToolPageDecisionAssemblyRouteStateFromRouteContextInput
): ReturnType<typeof buildToolPageDecisionAssemblyRouteState> {
  const firstPricingEvidenceLink = input.pricingEvidenceLinks[0];
  return buildToolPageDecisionAssemblyRouteState({
    tool: input.tool,
    resolvedSubject: input.resolvedSubject,
    activeReviewLens: input.activeReviewLens,
    hasApi: input.hasApi,
    hasParentTool: input.hasParentTool,
    audienceSlugs: input.audiences.map((audience) => audience.slug || audience.name || ''),
    lensBestFitLine: input.lensBestFitLine,
    lensWeakFitLine: input.lensWeakFitLine,
    lensTradeoffLine: input.lensTradeoffLine,
    topLensHardLimit: input.topLensHardLimit,
    pricingEvidenceSourceUrl: firstPricingEvidenceLink?.sourceUrl || input.officialPricingSourceUrl,
    pricingEvidenceSummary: firstPricingEvidenceLink?.text || null,
    contentConfidenceLabel: input.contentConfidenceLabel,
    trustBar: input.trustBar,
  });
}
