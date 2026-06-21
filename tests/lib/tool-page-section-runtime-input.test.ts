import { describe, expect, it } from 'vitest';
import { buildToolPageSectionRuntimeInput } from '@/lib/tool-page/section-runtime-input';

describe('tool page section runtime input', () => {
  it('normalizes section signals and state input from raw page context', () => {
    const result = buildToolPageSectionRuntimeInput({
      faqItems: [{ question: 'Q1' }, { question: 'Q2' }],
      sectionPublishabilityFaq: true,
      knowledgeCard: {
        features: { core: ['Core 1'], unique: ['Unique 1', 'Unique 2'] },
        platforms: ['web'],
        integrations: { count: 1 },
        security: { soc2_certified: true },
        smp_portability: { has_api_export: true },
      },
      categorySpecificData: { billing: true },
      vipSpecifics: { tier: 'vip' },
      sectionStatus: {
        specs: 'show',
        community: 'show',
      },
      orderedAlternativesCount: 3,
      eligibleSignalEvidenceCount: 2,
      idealFor: ['Startups', 42],
      avoidIf: ['Enterprises', null],
      delighters: ['Fast setup', false],
      frustrations: ['Needs training', {}],
      powerTip: 'Roll out by team',
      humanVerdict: 'Strong for small teams',
      contentConfidenceLevel: 'high',
      firstReviewUpdatedAt: '2026-03-01',
      firstReviewCreatedAt: '2026-02-28',
      toolLastVerifiedAt: '2026-03-01',
      toolPricingVerifiedAt: '2026-03-01',
      toolUpdatedAt: '2026-03-01',
      hasGettingStartedData: true,
      hasParentTool: false,
      hasSupportData: true,
      now: new Date('2026-03-05T00:00:00.000Z'),
    });

    expect(result.sectionSignalsInput.faqCount).toBe(2);
    expect(result.sectionSignalsInput.featureCoreCount).toBe(1);
    expect(result.sectionSignalsInput.featureUniqueCount).toBe(2);
    expect(result.sectionSignalsInput.alternativesCount).toBe(3);
    expect(result.sectionSignalsInput.idealFor).toEqual(['Startups']);
    expect(result.sectionSignalsInput.avoidIf).toEqual(['Enterprises']);
    expect(result.sectionSignalsInput.delighters).toEqual(['Fast setup']);
    expect(result.sectionSignalsInput.frustrations).toEqual(['Needs training']);
    expect(result.sectionStateBaseInput.hasSecurityData).toBe(true);
    expect(result.sectionStateBaseInput.hasPortabilityData).toBe(true);
    expect(result.sectionStateBaseInput.sectionPublishability.faq).toBe(true);
  });
});
