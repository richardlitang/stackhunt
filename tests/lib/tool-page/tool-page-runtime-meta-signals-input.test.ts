import { describe, expect, it } from 'vitest';
import { buildToolPageRuntimeMetaSignalsInputFromRoute } from '@/lib/tool-page/route-state/runtime-meta-signals-input';

describe('tool page runtime meta signals input', () => {
  it('maps route meta signal fields', () => {
    const result = buildToolPageRuntimeMetaSignalsInputFromRoute({
      gateShouldIndex: true,
      isDraftPage: false,
      showReviewInProgressBanner: false,
      safeDraftDescription: 'Draft',
      decisionSnapshotSummary: 'Summary',
      renderVerdictSafe: 'Verdict',
      evaluationDepth: 'Light hands-on',
      showPricingSection: true,
      hasPricingCheckedProof: true,
      hasFAQ: true,
      faqSchema: null,
      decisionSnapshotBestWhen: ['Best for teams'],
      decisionSnapshotWatchOuts: ['Watch onboarding'],
      decisionTradeoffSummary: 'Tradeoff',
      introLooksSpecSheet: false,
    });

    expect(result.gateShouldIndex).toBe(true);
    expect(result.safeDraftDescription).toBe('Draft');
    expect(result.hasFAQ).toBe(true);
    expect(result.decisionSnapshotBestWhen).toEqual(['Best for teams']);
  });
});
