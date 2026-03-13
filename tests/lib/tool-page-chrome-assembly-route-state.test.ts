import { describe, expect, it, vi } from 'vitest';

const { buildToolPageChromeRouteStateFromDecisionContextMock } = vi.hoisted(() => ({
  buildToolPageChromeRouteStateFromDecisionContextMock: vi.fn(() => ({
    lensHrefs: [],
    focusSwitchOptions: [],
  })),
}));

vi.mock('@/lib/tool-page/chrome-route-state', () => ({
  buildToolPageChromeRouteStateFromDecisionContext:
    buildToolPageChromeRouteStateFromDecisionContextMock,
}));

import { buildToolPageChromeAssemblyRouteState } from '@/lib/tool-page/chrome-assembly-route-state';

describe('tool page chrome assembly route state', () => {
  it('delegates to chrome route builder with assembled route inputs', () => {
    const result = buildToolPageChromeAssemblyRouteState({
      activeReviewLens: 'startup',
      alternativesLabel: 'Alternatives',
      toolCategoryRef: { slug: 'project-management', name: 'Project Management' },
      orderedAlternatives: [],
      comparableAlternatives: [],
      canCompareByAlternativeSlug: new Set<string>(),
      tool: { name: 'Acme' } as Parameters<typeof buildToolPageChromeAssemblyRouteState>[0]['tool'],
      knowledgeCard: null,
      parentTool: null,
      setupTracks: [],
      displayCategorySpecificData: {},
      vipSpecifics: null,
      userReportedPros: [],
      userReportedCons: [],
      laneOutputs: null,
      decisionRuntime: {} as Parameters<
        typeof buildToolPageChromeAssemblyRouteState
      >[0]['decisionRuntime'],
      sectionFlags: {} as Parameters<
        typeof buildToolPageChromeAssemblyRouteState
      >[0]['sectionFlags'],
      evidenceRuntime: {} as Parameters<
        typeof buildToolPageChromeAssemblyRouteState
      >[0]['evidenceRuntime'],
      reviewArtifactsState: {} as Parameters<
        typeof buildToolPageChromeAssemblyRouteState
      >[0]['reviewArtifactsState'],
      reviewSignalsView: {} as Parameters<
        typeof buildToolPageChromeAssemblyRouteState
      >[0]['reviewSignalsView'],
      reviewContextSignals: {} as Parameters<
        typeof buildToolPageChromeAssemblyRouteState
      >[0]['reviewContextSignals'],
      qualityState: {} as Parameters<
        typeof buildToolPageChromeAssemblyRouteState
      >[0]['qualityState'],
      lensRuntime: {} as Parameters<typeof buildToolPageChromeAssemblyRouteState>[0]['lensRuntime'],
      websiteHostLabel: 'acme.com',
      runtimeViewBundle: {} as Parameters<
        typeof buildToolPageChromeAssemblyRouteState
      >[0]['runtimeViewBundle'],
      evaluationDepth: null,
    });

    expect(buildToolPageChromeRouteStateFromDecisionContextMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      lensHrefs: [],
      focusSwitchOptions: [],
    });
  });
});
