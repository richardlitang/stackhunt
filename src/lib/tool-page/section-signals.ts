export interface ToolPageSectionSignalsInput {
  faqCount: number;
  faqPublishable: boolean;
  featureCoreCount: number;
  featureUniqueCount: number;
  hasCategorySpecificData: boolean;
  hasVipSpecifics: boolean;
  specsSectionStatus: 'show' | 'hide' | 'procedural';
  hasPlatforms: boolean;
  hasIntegrations: boolean;
  alternativesCount: number;
  communitySectionStatus: 'show' | 'hide' | 'procedural';
  eligibleSignalEvidenceCount: number;
  idealFor: string[];
  avoidIf: string[];
  delighters: string[];
  frustrations: string[];
  powerTip: string | null;
  humanVerdict: string | null;
}

export interface ToolPageSectionSignals {
  hasFAQRaw: boolean;
  hasFeatures: boolean;
  hasSpecsRaw: boolean;
  hasPlatformRaw: boolean;
  hasAlternatives: boolean;
  hasCommunityNarrativeSignal: boolean;
  hasCommunityRaw: boolean;
}

function hasAnyMinLength(items: string[], minimumLength: number): boolean {
  return items.some((item) => typeof item === 'string' && item.trim().length >= minimumLength);
}

export function deriveToolPageSectionSignals(
  input: ToolPageSectionSignalsInput
): ToolPageSectionSignals {
  const hasFAQRaw = input.faqCount > 0 && input.faqPublishable;
  const hasFeatures = input.featureCoreCount > 0 || input.featureUniqueCount > 0;
  const hasSpecsRaw =
    (input.hasCategorySpecificData || input.hasVipSpecifics) && input.specsSectionStatus === 'show';
  const hasPlatformRaw = input.hasPlatforms || input.hasIntegrations;
  const hasAlternatives = input.alternativesCount > 0;
  const hasCommunityNarrativeSignal = Boolean(
    hasAnyMinLength(input.idealFor, 16) ||
      hasAnyMinLength(input.avoidIf, 16) ||
      hasAnyMinLength(input.delighters, 20) ||
      hasAnyMinLength(input.frustrations, 20) ||
      (typeof input.powerTip === 'string' && input.powerTip.trim().length >= 24) ||
      (typeof input.humanVerdict === 'string' && input.humanVerdict.trim().length >= 80)
  );
  const hasCommunityRaw = Boolean(
    input.communitySectionStatus === 'show' &&
      input.eligibleSignalEvidenceCount >= 4 &&
      hasCommunityNarrativeSignal
  );

  return {
    hasFAQRaw,
    hasFeatures,
    hasSpecsRaw,
    hasPlatformRaw,
    hasAlternatives,
    hasCommunityNarrativeSignal,
    hasCommunityRaw,
  };
}
