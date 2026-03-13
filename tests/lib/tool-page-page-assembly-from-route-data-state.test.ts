import { describe, expect, it, vi } from 'vitest';

const { buildToolPagePageAssemblyRouteStateFromPageContextMock } = vi.hoisted(() => ({
  buildToolPagePageAssemblyRouteStateFromPageContextMock: vi.fn(() => ({
    meta: { title: 'Acme review' },
  })),
}));

vi.mock('@/lib/tool-page/page-assembly-route-context', () => ({
  buildToolPagePageAssemblyRouteStateFromPageContext:
    buildToolPagePageAssemblyRouteStateFromPageContextMock,
}));

import { buildToolPagePageAssemblyStateFromRouteDataContext } from '@/lib/tool-page/page-assembly-from-route-data-state';

describe('tool page page assembly from route data state', () => {
  it('maps route-data pipeline state into page-assembly page context', () => {
    const result = buildToolPagePageAssemblyStateFromRouteDataContext({
      activeReviewLens: 'startup',
      routeDataState: {
        runtimeViewBundle: {},
        firstReview: null,
        tool: { name: 'Acme' },
        alternativesLabel: 'Alternatives',
        toolCategoryRef: null,
        orderedAlternatives: [],
        comparableAlternatives: [],
        canCompareByAlternativeSlug: () => false,
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
        evidenceRuntime: {},
        reviewArtifactsState: {},
        reviewSignalsView: {},
        reviewContextSignals: { hasUserSignals: false, hasCommunitySignals: false },
        qualityState: {},
        websiteHostLabel: 'acme.com',
        evaluationDepth: null,
        resolvedSubject: { subjectType: 'product', entityScope: 'single' },
        tags: { audiences: [{ slug: 'startups' }] },
        topLensHardLimit: null,
        pricingEvidenceLinks: [],
        officialPricingSource: null,
        navigationState: {},
        ctaMediaState: {},
      } as any,
    });

    expect(buildToolPagePageAssemblyRouteStateFromPageContextMock).toHaveBeenCalledTimes(1);
    expect(result.meta.title).toBe('Acme review');
  });
});
