import { describe, expect, it } from 'vitest';
import { deriveToolPageSectionSignals } from '@/lib/tool-page/evidence/section-signals';

describe('tool page section signals', () => {
  it('derives raw section visibility signals from content and policy inputs', () => {
    const result = deriveToolPageSectionSignals({
      faqCount: 2,
      faqPublishable: true,
      featureCoreCount: 1,
      featureUniqueCount: 0,
      hasCategorySpecificData: true,
      hasVipSpecifics: false,
      specsSectionStatus: 'show',
      hasPlatforms: true,
      hasIntegrations: false,
      alternativesCount: 3,
      communitySectionStatus: 'show',
      eligibleSignalEvidenceCount: 4,
      idealFor: ['Long enough ideal for narrative item'],
      avoidIf: [],
      delighters: [],
      frustrations: [],
      powerTip: null,
      humanVerdict: null,
    });

    expect(result.hasFAQRaw).toBe(true);
    expect(result.hasFeatures).toBe(true);
    expect(result.hasSpecsRaw).toBe(true);
    expect(result.hasPlatformRaw).toBe(true);
    expect(result.hasAlternatives).toBe(true);
    expect(result.hasCommunityNarrativeSignal).toBe(true);
    expect(result.hasCommunityRaw).toBe(true);
  });

  it('gates community section when evidence and narrative are weak', () => {
    const result = deriveToolPageSectionSignals({
      faqCount: 0,
      faqPublishable: true,
      featureCoreCount: 0,
      featureUniqueCount: 0,
      hasCategorySpecificData: false,
      hasVipSpecifics: false,
      specsSectionStatus: 'show',
      hasPlatforms: false,
      hasIntegrations: false,
      alternativesCount: 0,
      communitySectionStatus: 'show',
      eligibleSignalEvidenceCount: 2,
      idealFor: ['short'],
      avoidIf: ['tiny'],
      delighters: [],
      frustrations: [],
      powerTip: 'too short',
      humanVerdict: null,
    });

    expect(result.hasCommunityNarrativeSignal).toBe(false);
    expect(result.hasCommunityRaw).toBe(false);
  });
});
