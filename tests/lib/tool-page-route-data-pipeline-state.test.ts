import { describe, expect, it, vi } from 'vitest';

const { buildDataPrepMock, buildPipelineMock } = vi.hoisted(() => ({
  buildDataPrepMock: vi.fn(() => ({
    tool: { slug: 'acme' },
    primaryOffer: null,
    knowledgeCard: null,
    userReportedPros: [],
    userReportedCons: [],
    decisionSectionState: {},
    reviewArtifactsState: {},
    evidenceSignalsState: {},
    prepState: {},
  })),
  buildPipelineMock: vi.fn(() => ({
    runtimeViewBundle: { meta: { title: 'Acme Review' } },
    ctaMediaState: { videoState: { hasVideo: false } },
  })),
}));

vi.mock('@/lib/tool-page/data-prep-route-state', () => ({
  buildToolPageDataPrepRouteState: buildDataPrepMock,
}));

vi.mock('@/lib/tool-page/route-pipeline-state', () => ({
  buildToolPageRoutePipelineStateFromDataPrepContext: buildPipelineMock,
}));

import { buildToolPageRouteDataPipelineStateFromPageContext } from '@/lib/tool-page/route-data-pipeline-state';

describe('tool page route data pipeline state', () => {
  it('composes data prep and route pipeline state builders', () => {
    const result = buildToolPageRouteDataPipelineStateFromPageContext({
      toolPageData: {} as any,
      isEligibleEvidenceUrl: () => true,
      activeReviewLens: 'startup',
      pathname: '/tool/acme',
      searchParams: new URLSearchParams(),
    });

    expect(buildDataPrepMock).toHaveBeenCalledTimes(1);
    expect(buildPipelineMock).toHaveBeenCalledTimes(1);
    expect(result.runtimeViewBundle.meta.title).toBe('Acme Review');
  });
});
