import { describe, expect, it } from 'vitest';
import { buildToolPageRuntimeAssembly } from '@/lib/tool-page/runtime-assembly';
import { buildToolPageRuntimeContext } from '@/lib/tool-page/runtime-context';
import { buildToolPageRuntimeParamsContext } from '@/lib/tool-page/runtime-params-context';
import { buildToolPageRuntimeViewBundle } from '@/lib/tool-page/runtime-view-bundle';

describe('tool page runtime assembly', () => {
  it('matches the previous params -> runtime -> bundle chain', () => {
    const input = {
      pathname: '/tool/acme',
      searchParams: new URLSearchParams('lens=general'),
      activeReviewLens: 'general' as const,
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
        decisionTradeoffSummary: 'Great for lean teams with clear owners',
      },
      canonicalHardLimits: [{ text: 'No on-prem option' }],
      trust: {
        baseEvidenceGrade: 'B' as const,
        avoidIfBullet: null,
        tradeoffCons: [],
        decisionProofPoints: [],
        hasCollectedSources: true,
        contentConfidenceLevel: 'medium' as const,
        hasPricingCheckedProof: true,
        pricingCheckedLabel: '2026-03-04',
        pricingSourceUrl: 'https://example.com/pricing',
        specsVerifiedLabel: '2026-03-03',
        officialDocsSourceUrl: 'https://example.com/docs',
        communityVerifiedLabel: '2026-03-02',
        officialPricingSourceUrl: 'https://example.com/pricing',
      },
      meta: {
        toolName: 'Acme',
        toolVerdict: 'Shortlist',
        toolMeta: {
          title: 'Acme Review | StackHunt',
          description: 'Acme review',
          canonical: 'https://stackhunt.ai/tool/acme',
        },
        gateShouldIndex: true,
        isDraftPage: false,
        showReviewInProgressBanner: false,
        safeDraftDescription: 'Draft copy',
        decisionSnapshotSummary: 'Acme is strong for small teams',
        renderVerdictSafe: 'Strong shortlist candidate',
        evaluationDepth: 'Light hands-on',
        showPricingSection: true,
        hasPricingCheckedProof: true,
        hasFAQ: true,
        faqSchema: null,
        decisionSnapshotBestWhen: ['Best when speed matters'],
        decisionSnapshotWatchOuts: ['Watch migration costs'],
        decisionTradeoffSummary: 'Great for lean teams with clear owners',
        introLooksSpecSheet: false,
      },
      schemas: {
        tool: { name: 'Acme', slug: 'acme' },
        primaryOffer: null,
        reviewCount: 1,
        faqSchema: null,
      },
      updateHistory: {
        communityVerifiedLabel: '2026-03-02',
        specsVerifiedLabel: '2026-03-03',
        pricingCheckedLabel: '2026-03-04',
      },
      runtimeView: {
        toolName: 'Acme',
        toolMeta: {
          title: 'Acme Review | StackHunt',
          description: 'Acme review',
          canonical: 'https://stackhunt.ai/tool/acme',
        },
      },
    };

    const assembled = buildToolPageRuntimeAssembly(input).runtimeViewBundle;
    const runtimeParams = buildToolPageRuntimeParamsContext({
      pathname: input.pathname,
      searchParams: input.searchParams,
      activeReviewLens: input.activeReviewLens,
      viewModelInput: input.viewModelInput,
      lensContentInput: input.lensContentInput,
      canonicalHardLimits: input.canonicalHardLimits,
      trust: input.trust,
      meta: input.meta,
      schemas: input.schemas,
      updateHistory: input.updateHistory,
    });
    const previous = buildToolPageRuntimeViewBundle({
      runtime: buildToolPageRuntimeContext({ runtimeParamsInput: runtimeParams }).runtime,
      toolName: input.runtimeView.toolName,
      toolMeta: input.runtimeView.toolMeta,
    });

    expect(assembled.toolReviewHeading).toEqual(previous.toolReviewHeading);
    expect(assembled.pendingVerificationCount).toEqual(previous.pendingVerificationCount);
    expect(assembled.indexPolicy).toEqual(previous.indexPolicy);
    expect(assembled.updateHistoryLabels).toEqual(previous.updateHistoryLabels);
    expect(assembled.trustStatus).toEqual(previous.trustStatus);
    expect(assembled.trustConfidenceLabel).toEqual(previous.trustConfidenceLabel);
    expect(assembled.sourceAriaLabel('official_docs')).toEqual(previous.sourceAriaLabel('official_docs'));
    expect(assembled.lensRuntime).toEqual(previous.lensRuntime);
  });
});
