import { describe, expect, it } from 'vitest';
import { buildToolPageSectionRuntime } from '@/lib/tool-page/runtime/section-runtime';

describe('tool page section runtime', () => {
  it('derives section signals and section state in one pass', () => {
    const result = buildToolPageSectionRuntime({
      sectionSignalsInput: {
        faqCount: 2,
        faqPublishable: true,
        featureCoreCount: 2,
        featureUniqueCount: 1,
        hasCategorySpecificData: false,
        hasVipSpecifics: false,
        specsSectionStatus: 'show',
        hasPlatforms: true,
        hasIntegrations: true,
        alternativesCount: 2,
        communitySectionStatus: 'show',
        eligibleSignalEvidenceCount: 3,
        idealFor: ['Startups'],
        avoidIf: ['Heavy compliance'],
        delighters: [],
        frustrations: [],
        powerTip: null,
        humanVerdict: 'Good fit',
      },
      sectionStateBaseInput: {
        contentConfidenceLevel: 'medium',
        firstReviewUpdatedAt: '2026-03-01T00:00:00.000Z',
        firstReviewCreatedAt: '2026-03-01T00:00:00.000Z',
        toolLastVerifiedAt: '2026-03-01T00:00:00.000Z',
        toolPricingVerifiedAt: '2026-03-01T00:00:00.000Z',
        toolUpdatedAt: '2026-03-01T00:00:00.000Z',
        sectionStatus: {
          specs: 'show',
          community: 'show',
        },
        sectionPublishability: {
          faq: true,
        },
        hasGettingStartedData: true,
        hasSecurityData: true,
        hasPortabilityData: true,
        hasKnowledgeCard: true,
        hasParentTool: false,
        hasSupportData: true,
        now: new Date('2026-03-05T00:00:00.000Z'),
      },
    });

    expect(result.hasAlternatives).toBe(true);
    expect(result.hasFeatures).toBe(true);
    expect(result.sectionState.hasFAQ).toBe(true);
    expect(result.sectionState.hasSpecs).toBe(result.sectionSignals.hasSpecsRaw);
  });
});
