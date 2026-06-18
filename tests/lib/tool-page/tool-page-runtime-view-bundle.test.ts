import { describe, expect, it } from 'vitest';
import { buildToolPageRuntimeInput } from '@/lib/tool-page/runtime/runtime-input';
import { buildToolPageRuntime } from '@/lib/tool-page/runtime/runtime';
import { buildToolPageRuntimeViewBundle } from '@/lib/tool-page/runtime/runtime-view-bundle';

describe('tool page runtime view bundle', () => {
  it('combines runtime and view-level fields for route rendering', () => {
    const runtimeInput = buildToolPageRuntimeInput({
      pathname: '/tool/acme',
      searchParams: new URLSearchParams('lens=general'),
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
        decisionSnapshotWatchOuts: ['Watch seat limits'],
        decisionSnapshotDifferentiators: ['Fast setup'],
        decisionTradeoffSummary: 'Best with admin ownership',
        enterpriseTradeoffOverride: null,
        hardLimitCount: 1,
      },
      trustInput: {
        baseEvidenceGrade: 'B',
        verificationItems: [],
        hasCollectedSources: true,
        contentConfidenceLevel: 'medium',
        hasPricingCheckedProof: true,
        pricingCheckedLabel: '2026-03-01',
        pricingSourceUrl: 'https://example.com/pricing',
        specsVerifiedLabel: '2026-03-01',
        officialDocsSourceUrl: 'https://example.com/docs',
        communityVerifiedLabel: '2026-03-01',
        officialPricingSourceUrl: 'https://example.com/pricing',
      },
      qaInput: {
        title: 'Acme Review | StackHunt',
        h1: 'Acme Review',
        intro: 'Intro',
        verdict: 'Verdict',
        evaluationDepth: 'docs_only',
        pricingSectionVisible: true,
        hasPricingCheckedProof: true,
        schemaMatchesVisibleContent: true,
        hasBestForSignal: true,
        hasNotForSignal: true,
        hasTradeoffSignal: true,
        hasDecisionSummaryBlock: true,
        introLooksSpecSheet: false,
      },
      indexInput: {
        gateShouldIndex: true,
        isDraftPage: false,
        showReviewInProgressBanner: false,
        toolCanonicalUrl: 'https://stackhunt.ai/tool/acme',
        fallbackCanonicalUrl: 'https://stackhunt.ai/tools',
        defaultDescription: 'Default',
        draftDescription: 'Draft',
      },
      baseMeta: {
        description: 'Default',
        canonical: 'https://stackhunt.ai/tool/acme',
      },
      schemasInput: {
        tool: {
          name: 'Acme',
          slug: 'acme',
        },
        primaryOffer: null,
        reviewCount: 1,
        faqSchema: null,
      },
      updateHistoryLabelsInput: {
        communityVerifiedLabel: '2026-03-01',
        specsVerifiedLabel: '2026-03-01',
        pricingCheckedLabel: '2026-03-01',
      },
    });

    const runtime = buildToolPageRuntime(runtimeInput);
    const bundle = buildToolPageRuntimeViewBundle({
      runtime,
      toolName: 'Acme',
      toolMeta: {
        title: 'Acme Review | StackHunt',
        description: 'Default',
        canonical: 'https://stackhunt.ai/tool/acme',
      },
    });

    expect(bundle.toolReviewHeading).toBe('Acme Review');
    expect(bundle.pendingVerificationCount).toBe(0);
    expect(bundle.indexPolicy.robotsTag).toBe('index,follow');
    expect(bundle.lensRuntime.verdictLabelRationale).toBeTruthy();
  });
});
