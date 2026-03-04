import { describe, expect, it } from 'vitest';
import { buildToolPageRuntimeParamsContext } from '@/lib/tool-page/runtime-params-context';

describe('tool page runtime params context', () => {
  it('builds the nested runtime params shape from flattened route inputs', () => {
    const searchParams = new URLSearchParams('lens=general');
    const result = buildToolPageRuntimeParamsContext({
      pathname: '/tool/acme',
      searchParams,
      activeReviewLens: 'general',
      viewModelInput: {
        hasVerdict: true,
        showProceduralVerdict: false,
        showPricingSection: true,
        hasGettingStarted: true,
        hasFeatures: true,
        hasSpecs: true,
        showProceduralSpecs: false,
        hasPlatform: true,
        hasAlternatives: true,
      },
      lensContentInput: {
        toolName: 'Acme',
        hasCollectedSources: true,
        hasGettingStarted: true,
        showPricingSection: true,
        hasSecurity: true,
        decisionSnapshotBestWhen: ['Best for startups'],
        decisionSnapshotWatchOuts: ['Watch seat caps'],
        decisionSnapshotDifferentiators: ['Fast setup'],
        decisionTradeoffSummary: 'Tradeoff summary',
      },
      canonicalHardLimits: [{ text: 'Seat cap: 10' }],
      trust: {
        baseEvidenceGrade: 'B',
        avoidIfBullet: null,
        tradeoffCons: [],
        decisionProofPoints: [],
        hasCollectedSources: true,
        contentConfidenceLevel: 'high',
        hasPricingCheckedProof: true,
        pricingCheckedLabel: '2026-03-01',
        pricingSourceUrl: 'https://example.com/pricing',
        specsVerifiedLabel: '2026-03-01',
        officialDocsSourceUrl: 'https://example.com/docs',
        communityVerifiedLabel: '2026-03-01',
        officialPricingSourceUrl: 'https://example.com/pricing',
      },
      meta: {
        toolName: 'Acme',
        toolVerdict: 'Good fit',
        toolMeta: {
          description: 'Default description',
          canonical: 'https://stackhunt.ai/tool/acme',
        },
        gateShouldIndex: true,
        isDraftPage: false,
        showReviewInProgressBanner: false,
        safeDraftDescription: 'Draft description',
        decisionSnapshotSummary: 'Summary',
        renderVerdictSafe: 'Verdict',
        evaluationDepth: 'Docs-only',
        showPricingSection: true,
        hasPricingCheckedProof: true,
        hasFAQ: true,
        faqSchema: { '@type': 'FAQPage' },
        decisionSnapshotBestWhen: ['Best when'],
        decisionSnapshotWatchOuts: ['Watch out'],
        decisionTradeoffSummary: 'Tradeoff summary',
        introLooksSpecSheet: false,
      },
      schemas: {
        tool: { name: 'Acme', slug: 'acme' },
        primaryOffer: null,
        reviewCount: 1,
        faqSchema: null,
      },
      updateHistory: {
        communityVerifiedLabel: '2026-03-01',
        specsVerifiedLabel: '2026-03-01',
        pricingCheckedLabel: '2026-03-01',
      },
    });

    expect(result.request.pathname).toBe('/tool/acme');
    expect(result.request.searchParams).toBe(searchParams);
    expect(result.lens.viewModelInput.hasVerdict).toBe(true);
    expect(result.trust.baseEvidenceGrade).toBe('B');
    expect(result.meta.toolMeta.canonical).toContain('/tool/acme');
    expect(result.schemas.reviewCount).toBe(1);
  });
});
