import { describe, expect, it } from 'vitest';
import { buildToolPageRuntimeAssemblySignalsInputFromRoute } from '@/lib/tool-page/route-state/runtime-assembly-signals-input';

describe('tool page runtime assembly signals input', () => {
  it('groups runtime assembly route signals into nested runtime sections', () => {
    const result = buildToolPageRuntimeAssemblySignalsInputFromRoute({
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
      decisionSnapshotBestWhen: ['Best for fast-moving teams'],
      decisionSnapshotWatchOuts: ['Watch migration costs'],
      decisionSnapshotDifferentiators: ['Great UX'],
      decisionTradeoffSummary: 'Great fit for lean teams',
      baseEvidenceGrade: 'B',
      avoidIfBullet: 'Avoid for strict on-prem requirements',
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
      safeDraftDescription: 'Draft',
      decisionSnapshotSummary: 'Strong shortlist',
      renderVerdictSafe: 'Strong shortlist',
      evaluationDepth: 'Light hands-on',
      hasFAQ: true,
      faqSchema: null,
      introLooksSpecSheet: false,
    });

    expect(result.viewModel.showPricingSection).toBe(true);
    expect(result.lensContent.decisionSnapshotBestWhen).toEqual(['Best for fast-moving teams']);
    expect(result.trust.pricingCheckedLabel).toBe('2026-03-05');
    expect(result.metaSignals.hasFAQ).toBe(true);
    expect(result.updateHistory.pricingCheckedLabel).toBe('2026-03-05');
  });
});
