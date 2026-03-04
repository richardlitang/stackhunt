import { describe, expect, it } from 'vitest';
import { buildToolPageEvidenceRuntimeInput } from '@/lib/tool-page/evidence-runtime-input';

describe('tool page evidence runtime input', () => {
  it('injects clean narrative helper and filters direct pricing source by eligibility', () => {
    const result = buildToolPageEvidenceRuntimeInput({
      reviewPros: ['pro'],
      reviewCons: ['con'],
      globalPros: [],
      globalCons: [],
      toEvidenceBullet: () => null,
      isDisallowedConClaim: () => false,
      hiddenCostBullets: [],
      hardLimitFromConstraints: [],
      decisionSnapshotWatchOuts: ['Watch out'],
      decisionTradeoffSummaryInitial: '',
      officialEvidenceLinks: [],
      evidenceLinksAll: [],
      evidenceLinks: [],
      hasPricing: true,
      pricingVerifiedLabel: '2026-03-01',
      knowledgeCard: {
        smp_pricing: {
          pricing_page_url: 'http://localhost/pricing',
        },
      },
      sectionPricingStatus: 'show',
      budgetCostDrivers: [],
      budgetOneTimeFees: [],
      budgetCommitmentTerms: null,
      budgetRoiThreshold: null,
      faqItems: [],
      specsVerifiedLabel: '2026-03-01',
      communityVerifiedLabel: '2026-03-01',
      buildEvidenceBulletV2: () => null,
      isEligibleEvidenceUrl: (value) =>
        typeof value === 'string' && value.startsWith('https://'),
    });

    expect(result.directPricingPageSource).toBeNull();
    expect(result.cleanNarrativeText('  hello  ')).toBe('Hello');
  });
});
