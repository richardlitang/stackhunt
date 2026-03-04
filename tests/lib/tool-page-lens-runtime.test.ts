import { describe, expect, it } from 'vitest';
import { buildToolPageLensRuntime } from '@/lib/tool-page-lens-runtime';

describe('tool page lens runtime', () => {
  it('assembles lens hrefs, focus options, and lens content in one object', () => {
    const runtime = buildToolPageLensRuntime({
      pathname: '/tool/acme',
      searchParams: new URLSearchParams('foo=bar'),
      activeReviewLens: 'startup',
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
        decisionSnapshotBestWhen: ['Good for teams'],
        decisionSnapshotWatchOuts: ['Watch limits'],
        decisionSnapshotDifferentiators: ['Fast setup'],
        decisionTradeoffSummary: 'Tradeoff summary',
        enterpriseTradeoffOverride: null,
        hardLimitCount: 1,
      },
    });

    expect(runtime.lensHrefs.general).toContain('/tool/acme?foo=bar');
    expect(runtime.lensHrefs.startup).toContain('lens=startup');
    expect(runtime.showFocusSwitch).toBe(true);
    expect(runtime.lensPriorityLinks.length).toBeGreaterThan(0);
    expect(runtime.reviewDek.length).toBeGreaterThan(0);
    expect(runtime.workflowFitCards.length).toBe(3);
  });
});
