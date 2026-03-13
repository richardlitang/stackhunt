import { describe, expect, it, vi } from 'vitest';

const {
  generateToolMetaMock,
  buildToolPageLensHardLimitRouteStateMock,
  buildToolPageSpecsCategoryRouteStateMock,
  buildToolPageRuntimeNavigationRouteStateMock,
} = vi.hoisted(() => ({
  generateToolMetaMock: vi.fn(() => ({ title: 'Acme Review' })),
  buildToolPageLensHardLimitRouteStateMock: vi.fn(() => ({
    lensRankedHardLimits: [{ text: 'No SSO on starter' }],
    topLensHardLimit: { text: 'No SSO on starter' },
  })),
  buildToolPageSpecsCategoryRouteStateMock: vi.fn(() => ({
    userSignalSummary: null,
    topUserReportedClaims: [],
    communityProsCount: 0,
    communityConsCount: 0,
    activeLensPricingPlanCount: 1,
    activeLensConstraintCount: 2,
    activeLensIntegrationCount: 3,
    toolCategoryRef: { slug: 'project-management', name: 'Project Management' },
  })),
  buildToolPageRuntimeNavigationRouteStateMock: vi.fn(() => ({
    runtimeViewBundle: { meta: { title: 'Acme Review' } },
    navigationState: { quickJumpLinks: [] },
    ctaMediaState: { compareButtonProps: { toolName: 'Acme' } },
  })),
}));

vi.mock('@/lib/seo', () => ({
  generateToolMeta: generateToolMetaMock,
}));

vi.mock('@/lib/tool-page/lens-hard-limit-route-state', () => ({
  buildToolPageLensHardLimitRouteState: buildToolPageLensHardLimitRouteStateMock,
}));

vi.mock('@/lib/tool-page/specs-category-route-state', () => ({
  buildToolPageSpecsCategoryRouteState: buildToolPageSpecsCategoryRouteStateMock,
}));

vi.mock('@/lib/tool-page/runtime-navigation-route-state', () => ({
  buildToolPageRuntimeNavigationRouteState: buildToolPageRuntimeNavigationRouteStateMock,
}));

import {
  buildToolPageRuntimeMidRouteState,
  buildToolPageRuntimeMidRouteStateFromRouteContext,
} from '@/lib/tool-page/runtime-mid-route-state';

describe('tool page runtime mid route state', () => {
  it('combines lens, specs, and runtime navigation route slices', () => {
    const result = buildToolPageRuntimeMidRouteState({
      activeReviewLens: 'startup',
      canonicalHardLimits: [],
      specs: {},
      userReportedPros: [],
      userReportedCons: [],
      category: { slug: 'project-management', name: 'Project Management' },
      runtimeNavigation: {
        pathname: '/tool/acme',
        searchParams: new URLSearchParams(),
        tool: { name: 'Acme', review_count: 12 } as any,
        primaryOffer: null,
        faqSchema: null,
        decisionRuntime: {} as any,
        sectionFlags: {} as any,
        evidenceRuntime: {} as any,
        qualityState: {} as any,
        reviewSignalsView: {} as any,
        presentationGates: { showProceduralVerdict: false, showProceduralSpecs: false },
        evaluationDepth: null,
        hasStrengths: true,
        faqItems: [],
        reviewArtifactsState: { evidenceBasis: [], lowConfidenceEvidenceLinks: [] },
        knowledgeCard: null,
        renderVerdictSafe: null,
      },
    });

    expect(generateToolMetaMock).toHaveBeenCalledTimes(1);
    expect(buildToolPageRuntimeNavigationRouteStateMock).toHaveBeenCalledTimes(1);
    expect(result.toolCategoryRef.slug).toBe('project-management');
    expect(result.runtimeViewBundle.meta.title).toBe('Acme Review');
  });

  it('supports flattened route-context inputs for runtime navigation assembly', () => {
    const result = buildToolPageRuntimeMidRouteStateFromRouteContext({
      activeReviewLens: 'startup',
      canonicalHardLimits: [],
      specs: {},
      userReportedPros: [],
      userReportedCons: [],
      category: { slug: 'project-management', name: 'Project Management' },
      pathname: '/tool/acme',
      searchParams: new URLSearchParams(),
      tool: { name: 'Acme', review_count: 12 } as any,
      primaryOffer: null,
      faqSchema: null,
      decisionRuntime: {} as any,
      sectionFlags: {} as any,
      evidenceRuntime: {} as any,
      qualityState: {} as any,
      reviewSignalsView: {} as any,
      presentationGates: { showProceduralVerdict: false, showProceduralSpecs: false },
      evaluationDepth: null,
      hasStrengths: true,
      faqItems: [],
      reviewArtifactsState: { evidenceBasis: [], lowConfidenceEvidenceLinks: [] },
      knowledgeCard: null,
      renderVerdictSafe: null,
    });

    expect(buildToolPageRuntimeNavigationRouteStateMock).toHaveBeenCalledTimes(2);
    expect(result.toolCategoryRef.slug).toBe('project-management');
  });
});
