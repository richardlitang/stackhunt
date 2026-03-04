import { deriveToolPageSectionSignals } from '@/lib/tool-page/section-signals';
import { buildToolPageSectionState } from '@/lib/tool-page/section-state';
import type { ToolPageSectionMode } from '@/lib/tool-page/standard';

export interface BuildToolPageSectionRuntimeInput {
  sectionSignalsInput: Parameters<typeof deriveToolPageSectionSignals>[0];
  sectionStateBaseInput: {
    contentConfidenceLevel: Parameters<typeof buildToolPageSectionState>[0]['contentConfidenceLevel'];
    firstReviewUpdatedAt: string | null;
    firstReviewCreatedAt: string | null;
    toolLastVerifiedAt: string | null;
    toolPricingVerifiedAt: string | null;
    toolUpdatedAt: string | null;
    sectionStatus: {
      specs: ToolPageSectionMode;
      community: ToolPageSectionMode;
    };
    sectionPublishability: {
      faq: boolean;
    };
    hasGettingStartedData: boolean;
    hasSecurityData: boolean;
    hasPortabilityData: boolean;
    hasKnowledgeCard: boolean;
    hasParentTool: boolean;
    hasSupportData: boolean;
    now: Date;
  };
}

export interface ToolPageSectionRuntime {
  sectionSignals: ReturnType<typeof deriveToolPageSectionSignals>;
  sectionState: ReturnType<typeof buildToolPageSectionState>;
  hasFAQ: boolean;
  hasGettingStarted: boolean;
  hasFeatures: boolean;
  hasSpecs: boolean;
  hasCommunity: boolean;
  hasPlatform: boolean;
  hasSecurity: boolean;
  hasPortability: boolean;
  hasOperationalDetails: boolean;
  hasAlternatives: boolean;
}

export function buildToolPageSectionRuntime(
  input: BuildToolPageSectionRuntimeInput
): ToolPageSectionRuntime {
  const sectionSignals = deriveToolPageSectionSignals(input.sectionSignalsInput);
  const sectionState = buildToolPageSectionState({
    ...input.sectionStateBaseInput,
    hasAlternatives: sectionSignals.hasAlternatives,
    hasFaqData: sectionSignals.hasFAQRaw,
    hasSpecsData: sectionSignals.hasSpecsRaw,
    hasCommunityData: sectionSignals.hasCommunityRaw,
    hasPlatformData: sectionSignals.hasPlatformRaw,
  });

  return {
    sectionSignals,
    sectionState,
    hasFAQ: sectionState.hasFAQ,
    hasGettingStarted: sectionState.hasGettingStarted,
    hasFeatures: sectionSignals.hasFeatures,
    hasSpecs: sectionState.hasSpecs,
    hasCommunity: sectionState.hasCommunity,
    hasPlatform: sectionState.hasPlatform,
    hasSecurity: sectionState.hasSecurity,
    hasPortability: sectionState.hasPortability,
    hasOperationalDetails: sectionState.hasOperationalDetails,
    hasAlternatives: sectionSignals.hasAlternatives,
  };
}
