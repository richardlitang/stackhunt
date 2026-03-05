import { describe, expect, it } from 'vitest';
import {
  buildToolPageRuntimeAssemblyInputBundleFromPageContext,
  buildToolPageRuntimeAssemblyInputBundleFromRoute,
  buildToolPageRuntimeAssemblyInputBundleFromRouteContext,
} from '@/lib/tool-page/runtime-assembly-route-input';

describe('tool page runtime assembly route input', () => {
  it('builds runtime assembly input using route-level state groups', () => {
    const result = buildToolPageRuntimeAssemblyInputBundleFromRoute({
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
      canonicalHardLimits: [{ text: 'No on-prem option' }],
      viewModel: {
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
      lensContent: {
        hasCollectedSources: true,
        hasGettingStarted: true,
        showPricingSection: true,
        hasSecurity: true,
        decisionSnapshotBestWhen: ['Best when speed matters'],
        decisionSnapshotWatchOuts: ['Watch migration costs'],
        decisionSnapshotDifferentiators: ['Fast onboarding'],
        decisionTradeoffSummary: 'Great for lean teams',
      },
      trust: {
        baseEvidenceGrade: 'B',
        avoidIfBullet: 'Avoid for strict on-prem mandates',
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
      schemas: {
        tool: { slug: 'acme', name: 'Acme' },
        primaryOffer: null,
        reviewCount: 2,
        faqSchema: null,
      },
      updateHistory: {
        communityVerifiedLabel: '2026-03-03',
        specsVerifiedLabel: '2026-03-04',
        pricingCheckedLabel: '2026-03-05',
      },
    });

    expect(result.pathname).toBe('/tool/acme');
    expect(result.meta.toolName).toBe('Acme');
    expect(result.lensContentInput.toolName).toBe('Acme');
    expect(result.trust.pricingCheckedLabel).toBe('2026-03-05');
    expect(result.schemas.reviewCount).toBe(2);
  });

  it('builds runtime assembly input from flattened route context', () => {
    const result = buildToolPageRuntimeAssemblyInputBundleFromRouteContext({
      pathname: '/tool/acme',
      searchParams: new URLSearchParams('lens=general'),
      activeReviewLens: 'general',
      tool: {
        name: 'Acme',
        verdict: 'Shortlist',
      },
      toolMeta: {
        title: 'Acme Review',
        description: 'Acme tool review',
        canonical: 'https://stackhunt.ai/tool/acme',
      },
      canonicalHardLimits: [{ text: 'No on-prem option' }],
      viewModel: {
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
      lensContent: {
        hasCollectedSources: true,
        hasGettingStarted: true,
        showPricingSection: true,
        hasSecurity: true,
        decisionSnapshotBestWhen: ['Best when speed matters'],
        decisionSnapshotWatchOuts: ['Watch migration costs'],
        decisionSnapshotDifferentiators: ['Fast onboarding'],
        decisionTradeoffSummary: 'Great for lean teams',
      },
      trust: {
        baseEvidenceGrade: 'B',
        avoidIfBullet: 'Avoid for strict on-prem mandates',
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
      schemas: {
        tool: { slug: 'acme', name: 'Acme' },
        primaryOffer: null,
        reviewCount: 2,
        faqSchema: null,
      },
      updateHistory: {
        communityVerifiedLabel: '2026-03-03',
        specsVerifiedLabel: '2026-03-04',
        pricingCheckedLabel: '2026-03-05',
      },
    });

    expect(result.meta.toolName).toBe('Acme');
    expect(result.meta.toolVerdict).toBe('Shortlist');
    expect(result.viewModelInput.showPricingSection).toBe(true);
  });

  it('builds runtime assembly input from page context', () => {
    const result = buildToolPageRuntimeAssemblyInputBundleFromPageContext({
      pathname: '/tool/acme',
      searchParams: new URLSearchParams('lens=general'),
      activeReviewLens: 'general',
      tool: {
        id: 'tool_1',
        slug: 'acme',
        name: 'Acme',
        verdict: 'Shortlist',
        review_count: 2,
      } as unknown as Parameters<
        typeof buildToolPageRuntimeAssemblyInputBundleFromPageContext
      >[0]['tool'],
      primaryOffer: null,
      faqSchema: null,
      toolMeta: {
        title: 'Acme Review',
        description: 'Acme tool review',
        canonical: 'https://stackhunt.ai/tool/acme',
      },
      canonicalHardLimits: [{ text: 'No on-prem option' }],
      viewModel: {
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
      lensContent: {
        hasCollectedSources: true,
        hasGettingStarted: true,
        showPricingSection: true,
        hasSecurity: true,
        decisionSnapshotBestWhen: ['Best when speed matters'],
        decisionSnapshotWatchOuts: ['Watch migration costs'],
        decisionSnapshotDifferentiators: ['Fast onboarding'],
        decisionTradeoffSummary: 'Great for lean teams',
      },
      trust: {
        baseEvidenceGrade: 'B',
        avoidIfBullet: 'Avoid for strict on-prem mandates',
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
      updateHistory: {
        communityVerifiedLabel: '2026-03-03',
        specsVerifiedLabel: '2026-03-04',
        pricingCheckedLabel: '2026-03-05',
      },
    });

    expect(result.schemas.tool.slug).toBe('acme');
    expect(result.schemas.reviewCount).toBe(2);
    expect(result.meta.toolName).toBe('Acme');
  });

  it('normalizes non-string page-context verdict to null', () => {
    const result = buildToolPageRuntimeAssemblyInputBundleFromPageContext({
      pathname: '/tool/acme',
      searchParams: new URLSearchParams('lens=general'),
      activeReviewLens: 'general',
      tool: {
        id: 'tool_2',
        slug: 'acme',
        name: 'Acme',
        verdict: 42,
        review_count: 2,
      } as unknown as Parameters<
        typeof buildToolPageRuntimeAssemblyInputBundleFromPageContext
      >[0]['tool'],
      primaryOffer: null,
      faqSchema: null,
      toolMeta: {
        title: 'Acme Review',
        description: 'Acme tool review',
        canonical: 'https://stackhunt.ai/tool/acme',
      },
      canonicalHardLimits: [{ text: 'No on-prem option' }],
      viewModel: {
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
      lensContent: {
        hasCollectedSources: true,
        hasGettingStarted: true,
        showPricingSection: true,
        hasSecurity: true,
        decisionSnapshotBestWhen: ['Best when speed matters'],
        decisionSnapshotWatchOuts: ['Watch migration costs'],
        decisionSnapshotDifferentiators: ['Fast onboarding'],
        decisionTradeoffSummary: 'Great for lean teams',
      },
      trust: {
        baseEvidenceGrade: 'B',
        avoidIfBullet: 'Avoid for strict on-prem mandates',
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
      updateHistory: {
        communityVerifiedLabel: '2026-03-03',
        specsVerifiedLabel: '2026-03-04',
        pricingCheckedLabel: '2026-03-05',
      },
    });

    expect(result.meta.toolVerdict).toBeNull();
  });
});
