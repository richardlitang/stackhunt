import { describe, expect, it, vi } from 'vitest';

const {
  buildDataPrepMock,
  buildDecisionEvidenceMock,
  buildDisplayStateMock,
  buildRuntimeMidStateMock,
} = vi.hoisted(() => ({
  buildDataPrepMock: vi.fn(() => ({
    tool: { slug: 'acme', specs: {}, category: null },
    primaryOffer: null,
    knowledgeCard: null,
    userReportedPros: [],
    userReportedCons: [],
    decisionSectionState: {},
    reviewArtifactsState: {},
    evidenceSignalsState: {},
    prepState: {},
  })),
  buildDecisionEvidenceMock: vi.fn(() => ({
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
  buildDisplayStateMock: vi.fn(() => ({
    canonicalHardLimits: [],
    showProceduralVerdict: true,
    showProceduralSpecs: false,
    evaluationDepth: null,
    hasStrengths: true,
    renderVerdictSafe: false,
  })),
  buildRuntimeMidStateMock: vi.fn(() => ({
    runtimeViewBundle: { meta: { title: 'Acme Review' } },
    ctaMediaState: { videoState: { hasVideo: false } },
  })),
}));

vi.mock('@/lib/tool-page/data-prep-route-state', () => ({
  buildToolPageDataPrepRouteState: buildDataPrepMock,
}));

vi.mock('@/lib/tool-page/decision-evidence-route-state', () => ({
  buildToolPageDecisionEvidenceRouteState: buildDecisionEvidenceMock,
}));

vi.mock('@/lib/tool-page/display-route-state', () => ({
  buildToolPageDisplayRouteState: buildDisplayStateMock,
}));

vi.mock('@/lib/tool-page/runtime-mid-route-state', () => ({
  buildToolPageRuntimeMidRouteStateFromRouteContext: buildRuntimeMidStateMock,
}));

import { buildToolPageRouteDataPipelineStateFromPageContext } from '@/lib/tool-page/route-data-pipeline-state';

describe('tool page route data pipeline state', () => {
  it('composes data prep, decision-evidence, display, and runtime-mid state builders', () => {
    const result = buildToolPageRouteDataPipelineStateFromPageContext({
      toolPageData: {} as any,
      isEligibleEvidenceUrl: () => true,
      activeReviewLens: 'startup',
      pathname: '/tool/acme',
      searchParams: new URLSearchParams(),
    });

    expect(buildDataPrepMock).toHaveBeenCalledTimes(1);
    expect(buildDecisionEvidenceMock).toHaveBeenCalledTimes(1);
    expect(buildDisplayStateMock).toHaveBeenCalledTimes(1);
    expect(buildRuntimeMidStateMock).toHaveBeenCalledTimes(1);
    expect(result.runtimeViewBundle.meta.title).toBe('Acme Review');
  });
});
