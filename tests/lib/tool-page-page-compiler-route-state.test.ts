import { describe, expect, it, vi } from 'vitest';

const { buildRouteDataPipelineMock, buildPageAssemblyMock } = vi.hoisted(() => ({
  buildRouteDataPipelineMock: vi.fn(() => ({
    runtimeViewBundle: { meta: { title: 'Acme Review' } },
    tool: { slug: 'acme' },
  })),
  buildPageAssemblyMock: vi.fn(() => ({
    meta: { title: 'Acme Review' },
  })),
}));

vi.mock('@/lib/tool-page/route-data-pipeline-state', () => ({
  buildToolPageRouteDataPipelineStateFromPageContext: buildRouteDataPipelineMock,
}));

vi.mock('@/lib/tool-page/page-assembly-from-route-data-state', () => ({
  buildToolPagePageAssemblyStateFromRouteDataContext: buildPageAssemblyMock,
}));

import { buildToolPagePageCompilerRouteStateFromPageContext } from '@/lib/tool-page/page-compiler-route-state';

describe('tool page page compiler route state', () => {
  it('composes route-data pipeline and page assembly through one entrypoint', () => {
    const result = buildToolPagePageCompilerRouteStateFromPageContext({
      toolPageData: {} as any,
      isEligibleEvidenceUrl: () => true,
      activeReviewLens: 'startup',
      pathname: '/tool/acme',
      searchParams: new URLSearchParams(),
    });

    expect(buildRouteDataPipelineMock).toHaveBeenCalledTimes(1);
    expect(buildPageAssemblyMock).toHaveBeenCalledTimes(1);
    expect(buildPageAssemblyMock).toHaveBeenCalledWith({
      routeDataState: expect.objectContaining({
        tool: expect.objectContaining({ slug: 'acme' }),
      }),
      activeReviewLens: 'startup',
    });
    expect(result.routeDataState.runtimeViewBundle.meta.title).toBe('Acme Review');
    expect(result.pageAssemblyState.meta.title).toBe('Acme Review');
  });
});
