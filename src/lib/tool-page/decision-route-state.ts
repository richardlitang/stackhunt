import { buildToolPageDecisionUtilityState } from '@/lib/tool-page/decision-utility';
import { buildToolPagePricingScenarioState } from '@/lib/tool-page/pricing-scenarios';
import type { ReviewLens } from '@/lib/tool-page/view-model';
import type { ToolPageEvidenceBullet } from '@/lib/tool-page/evidence-bullets';
import type { BuildToolPageDecisionUtilityInput } from '@/lib/tool-page/decision-utility';

interface BuildToolPageDecisionRouteStateInput {
  tool: {
    name: string;
    categorySlug: string | null;
    pricingType: string | null;
  };
  resolvedSubject: {
    subjectType: BuildToolPageDecisionUtilityInput['resolvedSubjectType'];
    entityScope: BuildToolPageDecisionUtilityInput['resolvedEntityScope'];
  };
  activeReviewLens: ReviewLens;
  hasApi: boolean;
  hasParentTool: boolean;
  audienceSlugs: string[];
  lensBestFitLine: string;
  lensWeakFitLine: string;
  lensTradeoffLine: string;
  topLensHardLimit: ToolPageEvidenceBullet | null;
  pricingEvidenceSourceUrl: string | null;
  pricingEvidenceSummary: string | null;
  contentConfidenceLabel: string;
  trustBar: {
    confidence: string;
    pendingCount: number;
  };
}

export function buildToolPageDecisionRouteState(input: BuildToolPageDecisionRouteStateInput): {
  decisionUtilityState: ReturnType<typeof buildToolPageDecisionUtilityState>;
  decisionHardLimitEvidence: ToolPageEvidenceBullet | null;
  pricingScenarioState: ReturnType<typeof buildToolPagePricingScenarioState>;
  showEarlySnapshotToneBanner: boolean;
} {
  const decisionUtilityState = buildToolPageDecisionUtilityState({
    toolName: input.tool.name,
    categorySlug: input.tool.categorySlug,
    resolvedSubjectType: input.resolvedSubject.subjectType,
    resolvedEntityScope: input.resolvedSubject.entityScope,
    activeReviewLens: input.activeReviewLens,
    hasApi: input.hasApi,
    hasParentTool: input.hasParentTool,
    hasEnterpriseSignals:
      (input.tool.pricingType || '').toLowerCase().includes('enterprise') ||
      input.audienceSlugs.some((slug) => slug.toLowerCase().includes('enterprise')),
    lensBestFitLine: input.lensBestFitLine,
    lensWeakFitLine: input.lensWeakFitLine,
    lensTradeoffLine: input.lensTradeoffLine,
    hardLimitText: input.topLensHardLimit?.text || null,
    pricingEvidenceSourceUrl: input.pricingEvidenceSourceUrl,
    pricingEvidenceSummary: input.pricingEvidenceSummary,
    lowConfidenceMode: input.contentConfidenceLabel === 'Low',
  });
  const decisionHardLimitEvidence = input.topLensHardLimit || null;
  const pricingScenarioState = buildToolPagePricingScenarioState({
    toolName: input.tool.name,
    hardLimitText: input.topLensHardLimit?.text || null,
    activeReviewLens: input.activeReviewLens,
  });
  const showEarlySnapshotToneBanner =
    input.trustBar.confidence === 'Low' || input.trustBar.pendingCount > 0;

  return {
    decisionUtilityState,
    decisionHardLimitEvidence,
    pricingScenarioState,
    showEarlySnapshotToneBanner,
  };
}
