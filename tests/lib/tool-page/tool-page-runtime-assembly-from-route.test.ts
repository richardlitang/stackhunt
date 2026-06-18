import { describe, expect, it } from 'vitest';
import { buildToolPageRuntimeAssembly } from '@/lib/tool-page/runtime/runtime-assembly';
import { buildToolPageRuntimeAssemblyInputBundleFromRoute } from '@/lib/tool-page/route-state/runtime-assembly-route-input';

describe('tool page runtime assembly from route', () => {
  it('builds runtime view bundle from route-level assembly input', () => {
    const result = buildToolPageRuntimeAssembly(
      buildToolPageRuntimeAssemblyInputBundleFromRoute({
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
      })
    );

    expect(result.runtimeViewBundle.meta.title).toBe('Acme Review');
    expect(result.runtimeViewBundle.toolReviewHeading).toContain('Acme');
    expect(result.runtimeViewBundle.trustConfidenceLabel).toBeTruthy();
  });
});
