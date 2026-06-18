import { describe, expect, it } from 'vitest';
import { buildToolPageRuntimeInput } from '@/lib/tool-page/runtime/runtime-input';

describe('tool page runtime input builder', () => {
  it('assembles runtime input in the expected shape', () => {
    const result = buildToolPageRuntimeInput({
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
        baseEvidenceGrade: 'medium',
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

    expect(result.lensInput.pathname).toBe('/tool/acme');
    expect(result.lensInput.activeReviewLens).toBe('general');
    expect(result.metaInput.indexInput.gateShouldIndex).toBe(true);
    expect(result.schemasInput.reviewCount).toBe(1);
  });
});
