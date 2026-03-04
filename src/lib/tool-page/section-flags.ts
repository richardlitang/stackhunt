import type { ToolPageSectionRuntime } from '@/lib/tool-page/section-runtime';

export function buildToolPageSectionFlags(sectionRuntime: ToolPageSectionRuntime): {
  hasFAQRaw: boolean;
  hasFeatures: boolean;
  hasSpecsRaw: boolean;
  hasPlatformRaw: boolean;
  hasAlternatives: boolean;
  hasCommunityRaw: boolean;
  hasFAQ: boolean;
  hasGettingStarted: boolean;
  hasSpecs: boolean;
  hasCommunity: boolean;
  hasPlatform: boolean;
  hasSecurity: boolean;
  hasPortability: boolean;
  hasOperationalDetails: boolean;
} {
  return {
    hasFAQRaw: sectionRuntime.sectionSignals.hasFAQRaw,
    hasFeatures: sectionRuntime.hasFeatures,
    hasSpecsRaw: sectionRuntime.sectionSignals.hasSpecsRaw,
    hasPlatformRaw: sectionRuntime.sectionSignals.hasPlatformRaw,
    hasAlternatives: sectionRuntime.hasAlternatives,
    hasCommunityRaw: sectionRuntime.sectionSignals.hasCommunityRaw,
    hasFAQ: sectionRuntime.sectionState.hasFAQ,
    hasGettingStarted: sectionRuntime.sectionState.hasGettingStarted,
    hasSpecs: sectionRuntime.sectionState.hasSpecs,
    hasCommunity: sectionRuntime.sectionState.hasCommunity,
    hasPlatform: sectionRuntime.sectionState.hasPlatform,
    hasSecurity: sectionRuntime.sectionState.hasSecurity,
    hasPortability: sectionRuntime.sectionState.hasPortability,
    hasOperationalDetails: sectionRuntime.sectionState.hasOperationalDetails,
  };
}
