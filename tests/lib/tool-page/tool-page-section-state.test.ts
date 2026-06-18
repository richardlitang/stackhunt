import { describe, expect, it } from 'vitest';
import { buildToolPageSectionState } from '@/lib/tool-page/runtime/section-state';

describe('tool page section state', () => {
  it('computes allowed sections and operational details from evidence contract inputs', () => {
    const result = buildToolPageSectionState({
      contentConfidenceLevel: 'high',
      hasAlternatives: true,
      firstReviewUpdatedAt: '2026-03-01T00:00:00.000Z',
      firstReviewCreatedAt: null,
      toolLastVerifiedAt: '2026-03-01T00:00:00.000Z',
      toolPricingVerifiedAt: '2026-03-01T00:00:00.000Z',
      toolUpdatedAt: '2026-03-01T00:00:00.000Z',
      sectionStatus: { specs: 'show', community: 'show' },
      sectionPublishability: { faq: true },
      hasFaqData: true,
      hasGettingStartedData: true,
      hasSpecsData: true,
      hasCommunityData: true,
      hasPlatformData: true,
      hasSecurityData: true,
      hasPortabilityData: true,
      hasKnowledgeCard: true,
      hasParentTool: false,
      hasSupportData: false,
      now: new Date('2026-03-02T00:00:00.000Z'),
    });

    expect(result.hasFAQ).toBe(true);
    expect(result.hasGettingStarted).toBe(true);
    expect(result.hasSpecs).toBe(true);
    expect(result.hasCommunity).toBe(true);
    expect(result.hasPlatform).toBe(true);
    expect(result.hasSecurity).toBe(true);
    expect(result.hasPortability).toBe(true);
    expect(result.hasOperationalDetails).toBe(true);
  });

  it('downgrades stale pricing confidence via freshness policy', () => {
    const result = buildToolPageSectionState({
      contentConfidenceLevel: 'high',
      hasAlternatives: false,
      firstReviewUpdatedAt: '2026-03-01T00:00:00.000Z',
      firstReviewCreatedAt: null,
      toolLastVerifiedAt: '2026-01-01T00:00:00.000Z',
      toolPricingVerifiedAt: '2026-01-01T00:00:00.000Z',
      toolUpdatedAt: '2026-01-01T00:00:00.000Z',
      sectionStatus: { specs: 'show', community: 'show' },
      sectionPublishability: { faq: true },
      hasFaqData: true,
      hasGettingStartedData: true,
      hasSpecsData: true,
      hasCommunityData: true,
      hasPlatformData: true,
      hasSecurityData: false,
      hasPortabilityData: false,
      hasKnowledgeCard: false,
      hasParentTool: false,
      hasSupportData: false,
      now: new Date('2026-03-04T00:00:00.000Z'),
    });

    expect(result.freshnessPolicy.staleFields).toContain('pricing');
  });
});
