import { describe, expect, it, vi } from 'vitest';

const {
  buildToolPageDecisionEvidenceRouteStateMock,
  buildToolPageDisplayRouteStateMock,
  buildToolPageRuntimeMidRouteStateFromRouteContextMock,
} = vi.hoisted(() => ({
  buildToolPageDecisionEvidenceRouteStateMock: vi.fn(() => ({
    qualityState: { showReviewInProgressBanner: true },
    faqItems: [],
    pricingTypeLabel: 'Tiered',
    decisionRuntime: { renderVerdictSafe: false },
    sectionFlags: {},
    presentationGates: { showProceduralVerdict: true, showProceduralSpecs: false },
    faqSchema: null,
    reviewArtifactsState: {},
    reviewSignalsView: {},
    evidenceRuntime: {},
  })),
  buildToolPageDisplayRouteStateMock: vi.fn(() => ({
    comparableAlternatives: [],
    hasComparableAlternatives: false,
    canCompareByAlternativeSlug: () => false,
    showReviewInProgressBanner: true,
    hasAbout: true,
    comparativeFeaturePeerCount: 1,
    hasPricing: true,
    renderVerdictSafe: false,
    hasVerdict: true,
    decisionSnapshotSummary: 'Summary',
    hasFeatures: true,
    hasAlternatives: true,
    hasFAQ: true,
    hasGettingStarted: true,
    hasSpecs: true,
    hasCommunity: true,
    hasOperationalDetails: true,
    showProceduralVerdict: true,
    showProceduralSpecs: false,
    handsOnTestEnvironment: null,
    handsOnTestSteps: [],
    handsOnTestFindings: [],
    handsOnTestedAtLabel: null,
    evaluationDepth: null,
    testedItems: [],
    notTestedItems: [],
    showWeTestedIt: false,
    communityVerifiedLabel: null,
    hasStrengths: true,
    canonicalHardLimits: [],
    officialPricingSource: null,
    pricingEvidenceLinks: [],
    showPricingSection: true,
    pricingNarrativeLead: 'Lead',
    pricingNarrativeLabel: 'Pricing',
    hasCollectedSources: true,
  })),
  buildToolPageRuntimeMidRouteStateFromRouteContextMock: vi.fn(() => ({
    lensRankedHardLimits: [],
    topLensHardLimit: null,
    userSignalSummary: null,
    topUserReportedClaims: [],
    communityProsCount: 0,
    communityConsCount: 0,
    activeLensPricingPlanCount: 0,
    activeLensConstraintCount: 0,
    activeLensIntegrationCount: 0,
    toolCategoryRef: null,
    runtimeViewBundle: { meta: { title: 'Acme Review' } },
    navigationState: { quickJumpLinks: [] },
    ctaMediaState: {
      compareButtonProps: null,
      addToStackProps: null,
      priceVerificationProps: null,
      videoState: { hasVideo: false },
      videoProps: null,
      verdictContent: null,
    },
  })),
}));

vi.mock('@/lib/tool-page/decision-evidence-route-state', () => ({
  buildToolPageDecisionEvidenceRouteState: buildToolPageDecisionEvidenceRouteStateMock,
}));

vi.mock('@/lib/tool-page/display-route-state', () => ({
  buildToolPageDisplayRouteState: buildToolPageDisplayRouteStateMock,
}));

vi.mock('@/lib/tool-page/runtime-mid-route-state', () => ({
  buildToolPageRuntimeMidRouteStateFromRouteContext:
    buildToolPageRuntimeMidRouteStateFromRouteContextMock,
}));

import { buildToolPageRoutePipelineStateFromDataPrepContext } from '@/lib/tool-page/route-pipeline-state';

describe('tool page route pipeline state', () => {
  it('composes decision evidence, display projection, and runtime-mid state', () => {
    const result = buildToolPageRoutePipelineStateFromDataPrepContext({
      decisionSectionState: {} as any,
      decisionReviewArtifactsState: {} as any,
      evidenceSignalsState: {} as any,
      prepState: {} as any,
      activeReviewLens: 'startup',
      tool: { specs: {}, category: null } as any,
      primaryOffer: null,
      knowledgeCard: null,
      userReportedPros: [],
      userReportedCons: [],
      pathname: '/tool/acme',
      searchParams: new URLSearchParams(),
    });

    expect(buildToolPageDecisionEvidenceRouteStateMock).toHaveBeenCalledTimes(1);
    expect(buildToolPageDisplayRouteStateMock).toHaveBeenCalledTimes(1);
    expect(buildToolPageRuntimeMidRouteStateFromRouteContextMock).toHaveBeenCalledTimes(1);
    expect(result.runtimeViewBundle.meta.title).toBe('Acme Review');
  });
});
