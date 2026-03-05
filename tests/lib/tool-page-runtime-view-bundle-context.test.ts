import { describe, expect, it } from 'vitest';
import { buildToolPageRuntimeAssembly } from '@/lib/tool-page/runtime-assembly';
import { buildToolPageRuntimeAssemblyInputBundleFromPageContext } from '@/lib/tool-page/runtime-assembly-route-input';
import { buildToolPageRuntimeAssemblySignalsInputFromRouteContext } from '@/lib/tool-page/runtime-assembly-signals-input';
import { buildToolPageRuntimeViewBundleFromPageContext } from '@/lib/tool-page/runtime-view-bundle-context';

describe('tool page runtime view bundle context', () => {
  it('matches the prior runtime signal+assembly chain', () => {
    const input = {
      pathname: '/tool/acme',
      searchParams: new URLSearchParams('lens=general'),
      activeReviewLens: 'general' as const,
      tool: {
        id: 'tool_1',
        slug: 'acme',
        name: 'Acme',
        verdict: 'Shortlist',
        review_count: 2,
      } as unknown as Parameters<typeof buildToolPageRuntimeViewBundleFromPageContext>[0]['tool'],
      primaryOffer: null,
      faqSchema: null,
      toolMeta: {
        title: 'Acme Review',
        description: 'Acme tool review',
        canonical: 'https://stackhunt.ai/tool/acme',
      },
      canonicalHardLimits: [{ text: 'No on-prem option' }],
      signals: {
        hasVerdict: true,
        showProceduralVerdict: false,
        showPricingSection: true,
        hasGettingStarted: true,
        hasFeatures: true,
        hasSpecs: true,
        showProceduralSpecs: false,
        hasPlatform: true,
        hasAlternatives: true,
        hasCollectedSources: true,
        hasSecurity: true,
        decisionSnapshotBestWhen: ['Best when speed matters'],
        decisionSnapshotWatchOuts: ['Watch migration costs'],
        decisionSnapshotDifferentiators: ['Fast onboarding'],
        decisionTradeoffSummary: 'Great for lean teams',
        baseEvidenceGrade: 'B' as const,
        avoidIfBullet: 'Avoid for strict on-prem mandates',
        tradeoffCons: [],
        decisionProofPoints: [],
        contentConfidenceLevel: 'medium' as const,
        hasPricingCheckedProof: true,
        pricingCheckedLabel: '2026-03-05',
        pricingSourceUrl: 'https://example.com/pricing',
        specsVerifiedLabel: '2026-03-04',
        officialDocsSourceUrl: 'https://example.com/docs',
        communityVerifiedLabel: '2026-03-03',
        officialPricingSourceUrl: 'https://example.com/pricing',
        gateShouldIndex: true,
        isDraftPage: false,
        showReviewInProgressBanner: false,
        safeDraftDescription: 'Draft content',
        decisionSnapshotSummary: 'Acme is strong for small teams.',
        renderVerdictSafe: 'Strong shortlist candidate',
        evaluationDepth: 'Light hands-on',
        hasFAQ: true,
        faqSchema: null,
        introLooksSpecSheet: false,
      },
    };

    const result = buildToolPageRuntimeViewBundleFromPageContext(input);

    const runtimeAssemblySignals = buildToolPageRuntimeAssemblySignalsInputFromRouteContext(
      input.signals
    );
    const expected = buildToolPageRuntimeAssembly(
      buildToolPageRuntimeAssemblyInputBundleFromPageContext({
        pathname: input.pathname,
        searchParams: input.searchParams,
        activeReviewLens: input.activeReviewLens,
        tool: input.tool,
        primaryOffer: input.primaryOffer,
        faqSchema: input.faqSchema,
        toolMeta: input.toolMeta,
        canonicalHardLimits: input.canonicalHardLimits,
        ...runtimeAssemblySignals,
      })
    );

    expect(result.runtimeViewBundle.meta).toEqual(expected.runtimeViewBundle.meta);
    expect(result.runtimeViewBundle.indexPolicy).toEqual(expected.runtimeViewBundle.indexPolicy);
    expect(result.runtimeViewBundle.pendingVerificationCount).toBe(
      expected.runtimeViewBundle.pendingVerificationCount
    );
    expect(result.runtimeViewBundle.trustStatus).toBe(expected.runtimeViewBundle.trustStatus);
    expect(result.runtimeViewBundle.trustConfidenceLabel).toBe(
      expected.runtimeViewBundle.trustConfidenceLabel
    );
    expect(result.runtimeViewBundle.toolReviewHeading).toBe(
      expected.runtimeViewBundle.toolReviewHeading
    );
    expect(result.runtimeViewBundle.lensLabelMap).toEqual(expected.runtimeViewBundle.lensLabelMap);
    expect(result.runtimeViewBundle.schemas).toEqual(expected.runtimeViewBundle.schemas);
    expect(result.runtimeViewBundle.updateHistoryLabels).toEqual(
      expected.runtimeViewBundle.updateHistoryLabels
    );
  });
});
