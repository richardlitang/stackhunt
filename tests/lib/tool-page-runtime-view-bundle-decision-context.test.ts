import { describe, expect, it } from 'vitest';
import { buildToolPageRuntimeViewBundleFromDecisionContext } from '@/lib/tool-page/runtime-view-bundle-decision-context';
import { buildToolPageRuntimeViewBundleFromPageContext } from '@/lib/tool-page/runtime-view-bundle-context';

describe('tool page runtime view bundle decision context', () => {
  it('matches explicit signal wiring for runtime view bundle', () => {
    const baseInput = {
      pathname: '/tool/acme',
      searchParams: new URLSearchParams('lens=general'),
      activeReviewLens: 'general' as const,
      tool: {
        id: 'tool_1',
        slug: 'acme',
        name: 'Acme',
        verdict: 'Shortlist',
        review_count: 2,
      } as unknown as Parameters<
        typeof buildToolPageRuntimeViewBundleFromDecisionContext
      >[0]['tool'],
      primaryOffer: null,
      faqSchema: null,
      toolMeta: {
        title: 'Acme Review',
        description: 'Acme tool review',
        canonical: 'https://stackhunt.ai/tool/acme',
      },
      canonicalHardLimits: [{ text: 'No on-prem option' }],
    };
    const decisionRuntime = {
      hasVerdict: true,
      decisionSnapshotBestWhen: ['Best when speed matters'],
      decisionSnapshotWatchOuts: ['Watch migration costs'],
      decisionSnapshotDifferentiators: ['Fast onboarding'],
      decisionSnapshotSummary: 'Acme is strong for small teams.',
      renderVerdictSafe: 'Strong shortlist candidate',
      introLooksSpecSheet: false,
    } as unknown as Parameters<
      typeof buildToolPageRuntimeViewBundleFromDecisionContext
    >[0]['decisionRuntime'];
    const sectionFlags = {
      hasGettingStarted: true,
      hasFeatures: true,
      hasSpecs: true,
      hasPlatform: true,
      hasAlternatives: true,
      hasSecurity: true,
      hasFAQ: true,
    } as unknown as Parameters<
      typeof buildToolPageRuntimeViewBundleFromDecisionContext
    >[0]['sectionFlags'];
    const evidenceRuntime = {
      showPricingSection: true,
      hasCollectedSources: true,
      decisionTradeoffSummary: 'Great for lean teams',
      baseEvidenceGrade: 'B',
      avoidIfBullet: null,
      tradeoffCons: [],
      decisionProofPoints: [],
      hasPricingCheckedProof: true,
      pricingCheckedLabel: '2026-03-05',
      pricingSourceUrl: 'https://example.com/pricing',
      officialDocsSource: { url: 'https://example.com/docs' },
      officialPricingSource: { url: 'https://example.com/pricing' },
    } as unknown as Parameters<
      typeof buildToolPageRuntimeViewBundleFromDecisionContext
    >[0]['evidenceRuntime'];
    const qualityState = {
      contentConfidenceLevel: 'medium',
      gateShouldIndex: true,
      isDraftPage: false,
      showReviewInProgressBanner: false,
      safeDraftDescription: 'Draft content',
    } as unknown as Parameters<
      typeof buildToolPageRuntimeViewBundleFromDecisionContext
    >[0]['qualityState'];
    const reviewSignalsView = {
      specsVerifiedLabel: '2026-03-04',
      communityVerifiedLabel: '2026-03-03',
    } as unknown as Parameters<
      typeof buildToolPageRuntimeViewBundleFromDecisionContext
    >[0]['reviewSignalsView'];
    const presentationGates = {
      showProceduralVerdict: false,
      showProceduralSpecs: false,
    };
    const evaluationDepth = 'Light hands-on';

    const result = buildToolPageRuntimeViewBundleFromDecisionContext({
      ...baseInput,
      decisionRuntime,
      sectionFlags,
      evidenceRuntime,
      qualityState,
      reviewSignalsView,
      presentationGates,
      evaluationDepth,
    });

    const expected = buildToolPageRuntimeViewBundleFromPageContext({
      ...baseInput,
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
        baseEvidenceGrade: 'B',
        avoidIfBullet: null,
        tradeoffCons: [],
        decisionProofPoints: [],
        contentConfidenceLevel: 'medium',
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
    });

    expect(result.runtimeViewBundle.meta).toEqual(expected.runtimeViewBundle.meta);
    expect(result.runtimeViewBundle.indexPolicy).toEqual(expected.runtimeViewBundle.indexPolicy);
    expect(result.runtimeViewBundle.pendingVerificationCount).toBe(
      expected.runtimeViewBundle.pendingVerificationCount
    );
    expect(result.runtimeViewBundle.trustStatus).toBe(expected.runtimeViewBundle.trustStatus);
    expect(result.runtimeViewBundle.trustConfidenceLabel).toBe(
      expected.runtimeViewBundle.trustConfidenceLabel
    );
    expect(result.runtimeViewBundle.schemas).toEqual(expected.runtimeViewBundle.schemas);
  });
});
