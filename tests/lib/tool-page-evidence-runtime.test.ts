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

  it('prioritizes and dedupes pros/cons with user-signal claims', () => {
    const result = buildToolPageEvidenceRuntime({
      reviewPros: [
        {
          text: 'Supports core workflows for CRM teams.',
          sourceUrl: 'https://docs.example.com/workflows',
          source_type: 'official',
        },
        {
          text: 'Supports core workflows for CRM teams',
          sourceUrl: 'https://help.example.com/workflows',
          source_type: 'official',
        },
        {
          text: 'Users report cleaner deal handoff in daily use',
          sourceUrl: 'https://www.reddit.com/r/crm/comments/x',
          source_type: 'community',
        },
      ],
      reviewCons: [
        {
          text: 'Free plan has seat cap',
          sourceUrl: 'https://example.com/pricing',
          source_type: 'official',
        },
      ],
      globalPros: [],
      globalCons: [],
      toEvidenceBullet: (claim) => {
        if (!claim || typeof claim !== 'object') return null;
        const item = claim as { text?: unknown; sourceUrl?: unknown; source_type?: unknown };
        if (typeof item.text !== 'string' || typeof item.sourceUrl !== 'string') return null;
        return {
          text: item.text,
          sourceUrl: item.sourceUrl,
          sourceType:
            item.source_type === 'community' || item.source_type === 'editorial'
              ? item.source_type
              : 'official',
        };
      },
      isDisallowedConClaim: () => false,
      hiddenCostBullets: [],
      hardLimitFromConstraints: [],
      cleanNarrativeText: (value) => (typeof value === 'string' ? value.trim() : null),
      decisionSnapshotWatchOuts: [],
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
      evidenceLinksAll: [],
      evidenceLinks: [
        {
          url: 'https://docs.example.com/workflows',
          title: 'Docs',
          domain: 'docs.example.com',
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

    expect(result.effectiveEvidencePros).toHaveLength(2);
    expect(result.effectiveEvidencePros[0]?.sourceType).toBe('community');
  });
});
