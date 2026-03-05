import { describe, expect, it } from 'vitest';
import { buildToolPageRuntimeAssemblyInputFromRoute } from '@/lib/tool-page/runtime-assembly-input';

describe('tool page runtime assembly input', () => {
  it('builds runtime assembly input with meta and runtime view wiring', () => {
    const result = buildToolPageRuntimeAssemblyInputFromRoute({
      pathname: '/tool/acme',
      searchParams: new URLSearchParams('lens=general'),
      activeReviewLens: 'general',
      toolName: 'Acme',
      toolVerdict: 'Shortlist',
      toolMeta: {
        title: 'Acme Review',
        description: 'Acme tool review',
        canonical: 'https://stackhunt.ai/tool/acme',
      },
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
        decisionSnapshotBestWhen: ['Best when speed matters'],
        decisionSnapshotWatchOuts: ['Watch migration costs'],
        decisionSnapshotDifferentiators: ['Fast onboarding'],
        decisionTradeoffSummary: 'Great for lean teams',
      },
      canonicalHardLimits: [{ text: 'No on-prem option' }],
      trust: {
        baseEvidenceGrade: 'B',
        avoidIfBullet: null,
        tradeoffCons: [],
        decisionProofPoints: [],
        hasCollectedSources: true,
        contentConfidenceLevel: 'medium',
        hasPricingCheckedProof: true,
        pricingCheckedLabel: '2026-03-05',
        pricingSourceUrl: 'https://example.com/pricing',
        specsVerifiedLabel: '2026-03-04',
        officialDocsSourceUrl: 'https://example.com/docs',
        communityVerifiedLabel: '2026-03-03',
        officialPricingSourceUrl: 'https://example.com/pricing',
      },
      metaSignals: {
        gateShouldIndex: true,
        isDraftPage: false,
        showReviewInProgressBanner: false,
        safeDraftDescription: 'Draft content',
        decisionSnapshotSummary: 'Acme is strong for small teams.',
        renderVerdictSafe: 'Strong shortlist candidate',
        evaluationDepth: 'Light hands-on',
        showPricingSection: true,
        hasPricingCheckedProof: true,
        hasFAQ: true,
        faqSchema: null,
        decisionSnapshotBestWhen: ['Best when speed matters'],
        decisionSnapshotWatchOuts: ['Watch migration costs'],
        decisionTradeoffSummary: 'Great for lean teams',
        introLooksSpecSheet: false,
      },
      schemasInput: {
        tool: { slug: 'acme', name: 'Acme' },
        primaryOffer: null,
        reviewCount: 2,
        faqSchema: null,
      },
      updateHistoryInput: {
        communityVerifiedLabel: '2026-03-03',
        specsVerifiedLabel: '2026-03-04',
        pricingCheckedLabel: '2026-03-05',
      },
    });

    expect(result.pathname).toBe('/tool/acme');
    expect(result.activeReviewLens).toBe('general');
    expect(result.meta.toolName).toBe('Acme');
    expect(result.meta.toolVerdict).toBe('Shortlist');
    expect(result.runtimeView).toEqual({
      toolName: 'Acme',
      toolMeta: {
        title: 'Acme Review',
        description: 'Acme tool review',
        canonical: 'https://stackhunt.ai/tool/acme',
      },
    });
    expect(result.schemas.reviewCount).toBe(2);
    expect(result.updateHistory.pricingCheckedLabel).toBe('2026-03-05');
  });
});
