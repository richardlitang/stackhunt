import { describe, expect, it, vi } from 'vitest';

const {
  buildToolPageRuntimeRouteStateMock,
  buildToolPageChromeRouteStateFromDecisionContextMock,
  buildToolPageDecisionAssemblyRouteStateMock,
  buildToolPageDecisionNavigationRouteStateMock,
  buildToolPageBlueprintRuntimeFromRouteDataMock,
} = vi.hoisted(() => ({
  buildToolPageRuntimeRouteStateMock: vi.fn(() => ({
    pageSchemas: [{ '@type': 'BreadcrumbList' }],
    updateHistoryLabels: {
      checkedLabel: 'Checked',
      specsLabel: 'Specs',
      communityLabel: 'Community',
    },
    meta: { title: 'Acme review', description: 'Desc', canonical: 'https://example.com/tool/acme' },
    indexPolicy: { shouldIndex: true, robotsTag: 'index,follow' },
    updateHistoryEntries: [{ label: 'Published', value: 'Mar 1, 2026' }],
    toolReviewHeading: 'Acme Review',
    lensLabelMap: { solo: 'Solo', startup: 'Startup', enterprise: 'Enterprise' },
    sourceAriaLabel: 'View source',
    lensRuntime: {
      activeReviewLens: 'startup',
      reviewLensHref: '/tool/acme?lens=startup',
      lensHrefs: [],
    },
  })),
  buildToolPageChromeRouteStateFromDecisionContextMock: vi.fn(() => ({
    trustBarProps: { confidence: 'High', pendingCount: 2 },
    prosConsView: { userSignalPros: [{ text: 'Fast' }], userSignalCons: [] },
    workflowFitCards: [{ title: 'Ops fit' }],
    workflowFitHighlights: ['Fast setup'],
  })),
  buildToolPageDecisionAssemblyRouteStateMock: vi.fn(() => ({
    decisionUtilityState: {
      hasEvidenceAnchoredUtility: true,
      testChecklistItems: ['Pilot'],
      commonSetups: [],
      practicalOutcomes: ['Lower toil'],
    },
    decisionHardLimitEvidence: null,
    pricingScenarioState: { hasPricingScenarios: false },
    showEarlySnapshotToneBanner: false,
  })),
  buildToolPageDecisionNavigationRouteStateMock: vi.fn(() => ({
    sourcesSectionState: { hasSources: true },
    lowConfidenceSourcesState: { show: false, title: 'Low-confidence secondary sources (0)' },
    faqItemsView: [],
    updateHistoryState: { hasUpdates: true },
    showWorkflowFitSection: true,
    shouldShowDecisionUtilitySection: true,
    shouldShowPracticalOutcomes: true,
    hasUserSignalProsCons: true,
    quickJumpLinksView: [{ href: '#verdict', label: 'Verdict', key: 'verdict' }],
    quickJumpLinks: [{ href: '#verdict', label: 'Verdict', key: 'verdict' }],
  })),
  buildToolPageBlueprintRuntimeFromRouteDataMock: vi.fn(() => ({
    buyerDecisionLayer: {
      heroDecisionCard: {
        bestFor: null,
        notFor: null,
        mainRisk: null,
        upgradeTrigger: null,
        implementationFriction: { level: 'unknown', summary: null, drivers: [] },
        evidence: {
          evidenceType: 'unknown',
          confidence: 'low',
          lastChecked: null,
          sourceUrl: null,
        },
      },
      fitMatrix: { solo: null, startup: null, midMarket: null, enterprise: null },
      pricingReality: {
        freeWorksIf: null,
        paidNeededWhen: null,
        hiddenCostTriggers: [],
        mainCostDrivers: [],
        evidence: {
          evidenceType: 'unknown',
          confidence: 'low',
          lastChecked: null,
          sourceUrl: null,
        },
      },
      beforeYouBuyTests: [],
      alternativesRebuttals: [],
      compactTrustStrip: {
        status: 'Needs confirmation',
        confidence: 'Low',
        lastChecked: null,
        pendingCount: 0,
      },
      toolbar: {
        activeLens: 'startup',
        lensHrefs: {
          general: '/tool/acme',
          personal: '/tool/acme?lens=personal',
          startup: '/tool/acme?lens=startup',
          enterprise: '/tool/acme?lens=enterprise',
        },
        jumpLinks: [],
      },
    },
  })),
}));

vi.mock('@/lib/tool-page/runtime-route-state', () => ({
  buildToolPageRuntimeRouteState: buildToolPageRuntimeRouteStateMock,
}));

vi.mock('@/lib/tool-page/chrome-route-state', () => ({
  buildToolPageChromeRouteStateFromDecisionContext:
    buildToolPageChromeRouteStateFromDecisionContextMock,
}));

vi.mock('@/lib/tool-page/decision-route-state', () => ({
  buildToolPageDecisionRouteState: buildToolPageDecisionAssemblyRouteStateMock,
}));

vi.mock('@/lib/tool-page/decision-navigation-route-state', () => ({
  buildToolPageDecisionNavigationRouteState: buildToolPageDecisionNavigationRouteStateMock,
}));

vi.mock('@/lib/tool-page/blueprint-runtime', () => ({
  buildToolPageBlueprintRuntimeFromRouteData: buildToolPageBlueprintRuntimeFromRouteDataMock,
}));

import { buildToolPagePageAssemblyRouteStateFromRouteData } from '@/lib/tool-page/page-assembly-route-state';

describe('tool page page assembly route state', () => {
  it('assembles runtime, chrome, decision, navigation, and cta route slices', () => {
    const result = buildToolPagePageAssemblyRouteStateFromRouteData({
      runtime: {
        runtimeViewBundle: {} as never,
        firstReview: null,
        tool: { name: 'Acme' } as never,
        categoryName: null,
      },
      chrome: {
        chromeLens: {
          lensRuntime: {} as never,
          activeReviewLens: 'startup',
          toolCategory: null,
          tool: { name: 'Acme' } as never,
          websiteHostLabel: 'acme.com',
          runtimeViewBundle: {} as never,
          evidenceRuntime: {} as never,
          reviewSignalsView: {} as never,
          evaluationDepth: null,
          qualityState: {} as never,
        },
        contentAlternatives: {
          activeReviewLens: 'startup',
          alternativesLabel: 'Alternatives',
          toolCategoryRef: null,
          orderedAlternatives: [],
          comparableAlternatives: [],
          canCompareByAlternativeSlug: () => false,
          tool: { name: 'Acme' } as never,
          knowledgeCard: null,
          parentTool: null,
          setupTracks: [],
          displayCategorySpecificData: null,
          vipSpecifics: null,
          userReportedPros: [],
          userReportedCons: [],
          laneOutputs: null,
          decisionRuntime: {} as never,
          sectionFlags: {} as never,
          evidenceRuntime: {} as never,
          reviewArtifactsState: {} as never,
          reviewSignalsView: {} as never,
          reviewContextSignals: { hasUserSignals: false, hasCommunitySignals: false },
          qualityState: {} as never,
        },
      },
      decision: {
        tool: { name: 'Acme', categorySlug: null, pricingType: null },
        resolvedSubject: { subjectType: null, entityScope: null },
        activeReviewLens: 'startup',
        hasApi: true,
        hasParentTool: false,
        audiences: [],
        topLensHardLimit: null,
        pricingEvidenceLinks: [],
        officialPricingSourceUrl: null,
        contentConfidenceLabel: 'High confidence',
      },
      navigation: {
        navigationState: {
          sourcesSectionState: { hasSources: true },
          lowConfidenceSourcesState: { show: false, title: 'Low-confidence secondary sources (0)' },
          faqItemsView: [],
          updateHistoryState: { hasUpdates: true },
          quickJumpLinks: [],
        },
        categorySlug: null,
      },
      ctaMediaState: {
        compareButtonProps: { toolName: 'Acme' },
        addToStackProps: { toolId: 1 },
        priceVerificationProps: { toolId: 1 },
        videoState: { hasVideo: false },
        videoProps: null,
        verdictContent: null,
      },
      activeReviewLens: 'startup',
      laneOutputs: null,
    });

    expect(buildToolPageDecisionAssemblyRouteStateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        audienceSlugs: [],
        pricingEvidenceSourceUrl: null,
        pricingEvidenceSummary: null,
        trustBar: { confidence: 'High', pendingCount: 2 },
      })
    );
    expect(buildToolPageDecisionNavigationRouteStateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        decisionUtilityState: expect.any(Object),
        prosConsView: expect.any(Object),
      })
    );
    expect(result.meta.title).toBe('Acme review');
    expect(result.compareButtonProps.toolName).toBe('Acme');
  });
});
