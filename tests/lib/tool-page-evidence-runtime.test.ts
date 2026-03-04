import { describe, expect, it } from 'vitest';
import { buildToolPageEvidenceRuntime } from '@/lib/tool-page/evidence-runtime';

describe('tool page evidence runtime', () => {
  it('derives evidence, pricing, and tradeoff runtime state', () => {
    const result = buildToolPageEvidenceRuntime({
      reviewPros: [{ text: 'Fast setup', sourceUrl: 'https://example.com/docs/setup' }],
      reviewCons: [{ text: 'Seat cap on starter', sourceUrl: 'https://example.com/pricing' }],
      globalPros: [],
      globalCons: [],
      toEvidenceBullet: (claim) => {
        if (!claim || typeof claim !== 'object') return null;
        const item = claim as { text?: unknown; sourceUrl?: unknown };
        if (typeof item.text !== 'string') return null;
        return {
          text: item.text,
          sourceUrl: typeof item.sourceUrl === 'string' ? item.sourceUrl : 'https://example.com/docs',
        };
      },
      isDisallowedConClaim: () => false,
      hiddenCostBullets: [],
      hardLimitFromConstraints: [{ text: 'Seat cap: 10 users', sourceUrl: 'https://example.com/pricing' }],
      cleanNarrativeText: (value) => (typeof value === 'string' ? value.trim() : null),
      decisionSnapshotWatchOuts: ['Seat cap on starter'],
      decisionTradeoffSummaryInitial: '',
      officialEvidenceLinks: [
        {
          url: 'https://example.com/pricing',
          title: 'Pricing',
          domain: 'example.com',
          basis: 'Official pricing pages',
          quality: 'high',
          inclusionReason: 'Official product documentation or pricing page',
          sourceType: 'official',
        },
      ],
      evidenceLinksAll: [
        {
          url: 'https://example.com/docs/setup',
        },
      ],
      evidenceLinks: [
        {
          url: 'https://example.com/docs/setup',
          title: 'Setup docs',
          domain: 'example.com',
          basis: 'Official docs/help center',
          quality: 'high',
          inclusionReason: 'Official product documentation or pricing page',
          sourceType: 'official',
        },
      ],
      hasPricing: true,
      pricingVerifiedLabel: '2026-03-01',
      directPricingPageSource: 'https://example.com/pricing',
      sectionPricingStatus: 'show',
      budgetCostDrivers: [],
      budgetOneTimeFees: [],
      budgetCommitmentTerms: null,
      budgetRoiThreshold: null,
      faqItems: [],
      specsVerifiedLabel: '2026-03-01',
      communityVerifiedLabel: '2026-03-01',
      buildEvidenceBulletV2: ({ text, kind, sourceUrl, sourceLabel, retrievedAt, requiredSourcing }) => ({
        text,
        kind,
        sourceUrl,
        sourceLabel,
        retrievedAt,
        requiredSourcing,
      }),
    });

    expect(result.effectiveEvidencePros.length).toBeGreaterThan(0);
    expect(result.effectiveEvidenceCons.length).toBeGreaterThan(0);
    expect(result.canonicalHardLimits.length).toBeGreaterThan(0);
    expect(result.showPricingSection).toBe(true);
    expect(result.hasCollectedSources).toBe(true);
    expect(result.tradeoffCons.length).toBeGreaterThan(0);
  });
});
