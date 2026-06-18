import { describe, expect, it, vi } from 'vitest';

const { buildRouteDataPipelineMock, buildPageAssemblyMock } = vi.hoisted(() => ({
  buildRouteDataPipelineMock: vi.fn(() => ({
    runtimeViewBundle: { meta: { title: 'Acme Review' }, lensRuntime: {} },
    firstReview: null,
    tool: { slug: 'acme', name: 'Acme', category: null, pricing_type: null },
    toolCategoryRef: null,
    websiteHostLabel: '',
    evidenceRuntime: {},
    reviewSignalsView: {},
    evaluationDepth: null,
    qualityState: { contentConfidenceLevel: 'low' },
    alternativesLabel: 'Alternatives',
    orderedAlternatives: [],
    comparableAlternatives: [],
    canCompareByAlternativeSlug: {},
    knowledgeCard: null,
    parentTool: null,
    setupTracks: [],
    displayCategorySpecificData: null,
    vipSpecifics: null,
    userReportedPros: [],
    userReportedCons: [],
    laneOutputs: null,
    decisionRuntime: {},
    sectionFlags: {},
    reviewArtifactsState: {},
    reviewContextSignals: {},
    resolvedSubject: null,
    tags: { audiences: [] },
    topLensHardLimit: null,
    pricingEvidenceLinks: [],
    officialPricingSource: null,
    navigationState: {},
    ctaMediaState: {},
  })),
  buildPageAssemblyMock: vi.fn(() => ({
    meta: { title: 'Acme Review' },
  })),
}));

vi.mock('@/lib/tool-page/route-state/route-data-pipeline-state', () => ({
  buildToolPageRouteDataPipelineStateFromPageContext: buildRouteDataPipelineMock,
}));

vi.mock('@/lib/tool-page/route-state/page-assembly-route-state', () => ({
  buildToolPagePageAssemblyRouteStateFromRouteData: buildPageAssemblyMock,
}));

import { buildToolPagePageCompilerRouteStateFromPageContext } from '@/lib/tool-page/route-state/page-compiler-route-state';

describe('tool page page compiler route state', () => {
  it('composes route-data pipeline and page-assembly route-state through one entrypoint', () => {
    const result = buildToolPagePageCompilerRouteStateFromPageContext({
      toolPageData: {} as any,
      isEligibleEvidenceUrl: () => true,
      activeReviewLens: 'startup',
      pathname: '/tool/acme',
      searchParams: new URLSearchParams(),
    });

    expect(buildRouteDataPipelineMock).toHaveBeenCalledTimes(1);
    expect(buildPageAssemblyMock).toHaveBeenCalledTimes(1);
    expect(buildPageAssemblyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        runtime: expect.objectContaining({
          tool: expect.objectContaining({ slug: 'acme' }),
        }),
        decision: expect.objectContaining({
          activeReviewLens: 'startup',
        }),
        navigation: expect.any(Object),
        chrome: expect.any(Object),
        ctaMediaState: expect.any(Object),
      })
    );
    expect(result.routeDataState.runtimeViewBundle.meta.title).toBe('Acme Review');
    expect(result.pageAssemblyState.meta.title).toBe('Acme Review');
  });
});
