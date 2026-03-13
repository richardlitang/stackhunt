import { describe, expect, it, vi } from 'vitest';

const {
  deriveToolPageReviewContextSignalsMock,
  buildToolPagePrepDecisionStateFromRouteContextMock,
  buildToolPageReviewArtifactsStateFromRouteContextMock,
  buildToolPageEvidenceSignalsStateInputFromRouteContextMock,
  buildToolPageEvidenceSignalsStateMock,
} = vi.hoisted(() => ({
  deriveToolPageReviewContextSignalsMock: vi.fn(() => ({
    delighters: ['Fast setup'],
    frustrations: ['Seat caps'],
  })),
  buildToolPagePrepDecisionStateFromRouteContextMock: vi.fn(() => ({
    prepState: { comparableAlternatives: [] },
    decisionSectionState: {
      decisionRuntime: { hasPricing: false },
      qualityState: { sectionStatus: { pricing: 'hide' } },
      faqState: { faqItems: [] },
    },
  })),
  buildToolPageReviewArtifactsStateFromRouteContextMock: vi.fn(() => ({
    evidenceBasis: [],
    officialEvidenceLinks: [],
    evidenceLinksAll: [],
    evidenceLinks: [],
  })),
  buildToolPageEvidenceSignalsStateInputFromRouteContextMock: vi.fn(() => ({})),
  buildToolPageEvidenceSignalsStateMock: vi.fn(() => ({
    reviewSignalsView: {},
    evidenceRuntime: {},
  })),
}));

vi.mock('@/lib/tool-page/review-context', () => ({
  deriveToolPageReviewContextSignals: deriveToolPageReviewContextSignalsMock,
}));

vi.mock('@/lib/tool-page/prep-decision-state', () => ({
  buildToolPagePrepDecisionStateFromRouteContext:
    buildToolPagePrepDecisionStateFromRouteContextMock,
}));

vi.mock('@/lib/tool-page/review-artifacts-state', () => ({
  buildToolPageReviewArtifactsStateFromRouteContext:
    buildToolPageReviewArtifactsStateFromRouteContextMock,
}));

vi.mock('@/lib/tool-page/evidence-signals-route-input', () => ({
  buildToolPageEvidenceSignalsStateInputFromRouteContext:
    buildToolPageEvidenceSignalsStateInputFromRouteContextMock,
}));

vi.mock('@/lib/tool-page/evidence-signals-state', () => ({
  buildToolPageEvidenceSignalsState: buildToolPageEvidenceSignalsStateMock,
}));

import { buildToolPageDataPrepRouteState } from '@/lib/tool-page/data-prep-route-state';

describe('tool page data prep route state', () => {
  it('flattens tool page data and builds prep/evidence state', () => {
    const toolPageData = {
      tool: { name: 'Acme', last_verified_at: null, pricing_verified_at: null },
      parentTool: null,
      resolvedSubject: { subjectType: 'product_surface', entityScope: 'core' },
      laneOutputs: null,
      subjectSelectionSuppressed: false,
      subjectSelectionReason: null,
      tags: { audiences: [{ slug: 'startup' }] },
      primaryOffer: null,
      reviewSelection: {},
      firstReview: null,
      reviewContentLists: { sources: [], pros: [], cons: [] },
      coreState: {
        knowledgeCard: null,
        globalPros: [],
        globalCons: [],
        constraints: [],
        canonicalFacts: [],
        setupTracks: [],
        categorySpecificData: {},
        displayCategorySpecificData: {},
        websiteHostLabel: 'acme.com',
        vipSpecifics: null,
        reviewContext: { userAdvocate: {} },
        userReportedPros: [],
        userReportedCons: [],
      },
      orderedAlternatives: [],
      alternativesLabel: 'Alternatives',
      microDiffs: new Map(),
      curatedVerdictEntries: new Map(),
    } as any;

    const result = buildToolPageDataPrepRouteState({
      toolPageData,
      isEligibleEvidenceUrl: () => true,
      now: new Date('2026-03-13T00:00:00.000Z'),
    });

    expect(result.tool.name).toBe('Acme');
    expect(result.websiteHostLabel).toBe('acme.com');
    expect(result.reviewContextSignals.delighters).toEqual(['Fast setup']);
    expect(buildToolPagePrepDecisionStateFromRouteContextMock).toHaveBeenCalledTimes(1);
    expect(buildToolPageReviewArtifactsStateFromRouteContextMock).toHaveBeenCalledTimes(1);
    expect(buildToolPageEvidenceSignalsStateInputFromRouteContextMock).toHaveBeenCalledTimes(1);
    expect(buildToolPageEvidenceSignalsStateMock).toHaveBeenCalledTimes(1);
  });
});
