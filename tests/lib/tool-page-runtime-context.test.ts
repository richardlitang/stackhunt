import { describe, expect, it } from 'vitest';
import { buildToolPageRuntimeContext } from '@/lib/tool-page/runtime-context';

describe('tool page runtime context', () => {
  it('builds runtime from runtime input params', () => {
    const result = buildToolPageRuntimeContext({
      runtimeInputParams: {
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
      },
    });

    expect(result.runtime.metaRuntime.meta.canonical).toBe('https://stackhunt.ai/tool/acme');
    expect(result.runtime.trustRuntime.pendingVerificationCount).toBe(0);
  });

  it('builds runtime from compact runtime params context', () => {
    const result = buildToolPageRuntimeContext({
      runtimeParamsInput: {
        request: {
          pathname: '/tool/acme',
          searchParams: new URLSearchParams('lens=general'),
          activeReviewLens: 'general',
        },
        lens: {
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
          contentInput: {
            toolName: 'Acme',
            hasCollectedSources: true,
            hasGettingStarted: true,
            showPricingSection: true,
            hasSecurity: true,
            decisionSnapshotBestWhen: ['Best for startups'],
            decisionSnapshotWatchOuts: ['Watch seat limits'],
            decisionSnapshotDifferentiators: ['Fast setup'],
            decisionTradeoffSummary: 'Best with admin ownership',
          },
          canonicalHardLimits: [{ text: 'Seat cap: 10 users' }],
        },
        trust: {
          baseEvidenceGrade: 'B',
          avoidIfBullet: null,
          tradeoffCons: [],
          decisionProofPoints: [],
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
        meta: {
          toolName: 'Acme',
          toolVerdict: 'Strong fit',
          toolMeta: {
            description: 'Default description',
            canonical: 'https://stackhunt.ai/tool/acme',
          },
          gateShouldIndex: true,
          isDraftPage: false,
          showReviewInProgressBanner: false,
          safeDraftDescription: 'Draft',
          decisionSnapshotSummary: 'Decision summary',
          renderVerdictSafe: 'Verdict',
          evaluationDepth: 'Docs-only',
          showPricingSection: true,
          hasPricingCheckedProof: true,
          hasFAQ: true,
          faqSchema: { '@type': 'FAQPage' },
          decisionSnapshotBestWhen: ['Best when'],
          decisionSnapshotWatchOuts: ['Watch out'],
          decisionTradeoffSummary: 'Tradeoff',
          introLooksSpecSheet: false,
          hasSourceBackedMainRiskSignal: true,
          hasSourceBackedUpgradeTriggerSignal: true,
          hasSourceBackedImplementationFrictionSignal: true,
          hasSourceBackedFitMatrixSignal: true,
          hasSourceBackedTestBeforeBuySignal: true,
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
      },
    });

    expect(result.runtime.metaRuntime.meta.canonical).toBe('https://stackhunt.ai/tool/acme');
  });
});
