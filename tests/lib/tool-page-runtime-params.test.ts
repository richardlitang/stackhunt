import { describe, expect, it } from 'vitest';
import { buildToolPageRuntimeInputParams } from '@/lib/tool-page/runtime-params';

describe('tool page runtime params builder', () => {
  it('builds runtime input params from compact context', () => {
    const result = buildToolPageRuntimeInputParams({
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
    });

    expect(result.lensContentInput.hardLimitCount).toBe(1);
    expect(result.indexInput.fallbackCanonicalUrl).toContain('/tools');
    expect(result.qaInput.evaluationDepth).toBe('docs_only');
    expect(result.qaInput.requiresSourceBackedDecisionLayer).toBe(true);
    expect(result.qaInput.hasSourceBackedMainRiskSignal).toBe(true);
    expect(result.qaInput.hasSourceBackedTestBeforeBuySignal).toBe(true);
  });
});
