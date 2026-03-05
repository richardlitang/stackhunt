import { describe, expect, it } from 'vitest';
import { buildToolPageChromeLensStateFromDecisionContext } from '@/lib/tool-page/chrome-lens-decision-context';
import { buildToolPageChromeLensStateFromRouteContext } from '@/lib/tool-page/chrome-lens-state';

describe('tool page chrome/lens decision context', () => {
  it('matches explicit route-context wiring', () => {
    const lensRuntime = {
      lensHrefs: [],
      focusSwitchOptions: [],
      lensDefaultFocus: 'general',
      showFocusSwitch: false,
      lensPriorityLinks: [],
      verdictLabelRationale: null,
      reviewDek: null,
      readerFocusNote: null,
      lensBestFitLine: null,
      lensWeakFitLine: null,
      lensTradeoffLine: null,
      scoreDrivers: [],
      workflowFitHighlights: [],
      workflowFitCards: [],
    };
    const activeReviewLens = 'general' as const;
    const toolCategory = { slug: 'project-management', name: 'Project Management' };
    const tool = { website: 'https://acme.com' };
    const websiteHostLabel = 'acme.com';
    const runtimeViewBundle = {
      trustConfidenceLabel: 'High',
      pendingVerificationCount: 1,
      trustStatus: 'Source-backed',
      lensLabelMap: {
        general: 'General',
        personal: 'Solo / Freelancer',
        startup: 'Startup',
        enterprise: 'Enterprise',
      },
    };
    const evidenceRuntime = {
      hasCollectedSources: true,
      collectedSourcesTotal: 12,
      pricingCheckedLabel: '2026-03-05',
    };
    const reviewSignalsView = {
      communityVerifiedLabel: '2026-03-04',
      specsVerifiedLabel: '2026-03-03',
      pricingVerifiedLabel: '2026-03-02',
    };
    const evaluationDepth = 'Light hands-on' as const;

    const result = buildToolPageChromeLensStateFromDecisionContext({
      lensRuntime: lensRuntime as never,
      activeReviewLens,
      toolCategory,
      tool,
      websiteHostLabel,
      runtimeViewBundle: runtimeViewBundle as never,
      evidenceRuntime: evidenceRuntime as never,
      reviewSignalsView: reviewSignalsView as never,
      evaluationDepth,
    });

    const expected = buildToolPageChromeLensStateFromRouteContext({
      lensRuntime: lensRuntime as never,
      chrome: {
        toolCategory,
        hasCollectedSources: true,
        evaluationDepth: 'Light hands-on',
        collectedSourcesTotal: 12,
        trustConfidenceLabel: 'High',
        pendingVerificationCount: 1,
        communityVerifiedLabel: '2026-03-04',
        specsVerifiedLabel: '2026-03-03',
        pricingCheckedLabel: '2026-03-05',
        pricingVerifiedLabel: '2026-03-02',
        trustStatus: 'Source-backed',
        activeReviewLens,
        lensLabelMap: runtimeViewBundle.lensLabelMap,
        tool,
        websiteHostLabel,
      },
    });

    expect(result.lensViewFields).toEqual(expected.lensViewFields);
    expect(result.toolChromeState).toEqual(expected.toolChromeState);
  });
});
