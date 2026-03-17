import { describe, expect, it, vi } from 'vitest';

const {
  deriveToolPageReviewContextSignalsMock,
  buildToolPagePrepStateInputFromRouteMock,
  buildToolPagePrepStateMock,
  buildToolPageDecisionSectionStateInputFromRouteMock,
  buildToolPageDecisionSectionStateMock,
  buildToolPageReviewArtifactsStateMock,
  toToolPageOptionalRecordMock,
  toToolPageReviewSourcesMock,
  buildToolPageEvidenceSignalsStateInputFromRouteMock,
  buildToolPageEvidenceSignalsStateMock,
} = vi.hoisted(() => ({
  deriveToolPageReviewContextSignalsMock: vi.fn(() => ({
    delighters: ['Fast setup'],
    frustrations: ['Seat caps'],
  })),
  buildToolPagePrepStateInputFromRouteMock: vi.fn(() => ({})),
  buildToolPagePrepStateMock: vi.fn(() => ({
    comparableAlternatives: [],
    hasEligibleNegativeEvidence: false,
    eligibleSignalEvidenceCount: 0,
  })),
  buildToolPageDecisionSectionStateInputFromRouteMock: vi.fn(() => ({})),
  buildToolPageDecisionSectionStateMock: vi.fn(() => ({
    decisionRuntime: { hasPricing: false, decisionSnapshotWatchOuts: [] },
    qualityState: { sectionStatus: { pricing: 'hide' } },
    faqState: { faqItems: [] },
  })),
  buildToolPageReviewArtifactsStateMock: vi.fn(() => ({
    evidenceBasis: [],
    officialEvidenceLinks: [],
    evidenceLinksAll: [],
    evidenceLinks: [],
  })),
  toToolPageOptionalRecordMock: vi.fn(() => ({})),
  toToolPageReviewSourcesMock: vi.fn(() => []),
  buildToolPageEvidenceSignalsStateInputFromRouteMock: vi.fn(() => ({})),
  buildToolPageEvidenceSignalsStateMock: vi.fn(() => ({
    reviewSignalsView: {},
    evidenceRuntime: {},
  })),
}));

vi.mock('@/lib/tool-page/review-context', () => ({
  deriveToolPageReviewContextSignals: deriveToolPageReviewContextSignalsMock,
}));

vi.mock('@/lib/tool-page/prep-input', () => ({
  buildToolPagePrepStateInputFromRoute: buildToolPagePrepStateInputFromRouteMock,
}));

vi.mock('@/lib/tool-page/prep-state', () => ({
  buildToolPagePrepState: buildToolPagePrepStateMock,
}));

vi.mock('@/lib/tool-page/decision-section-route-input', () => ({
  buildToolPageDecisionSectionStateInputFromRoute:
    buildToolPageDecisionSectionStateInputFromRouteMock,
}));

vi.mock('@/lib/tool-page/decision-section-state', () => ({
  buildToolPageDecisionSectionState: buildToolPageDecisionSectionStateMock,
}));

vi.mock('@/lib/tool-page/review-artifacts-state', () => ({
  buildToolPageReviewArtifactsState: buildToolPageReviewArtifactsStateMock,
}));

vi.mock('@/lib/tool-page/route-normalizers', () => ({
  toToolPageOptionalRecord: toToolPageOptionalRecordMock,
  toToolPageReviewSources: toToolPageReviewSourcesMock,
}));

vi.mock('@/lib/tool-page/evidence-signals-route-input', () => ({
  buildToolPageEvidenceSignalsStateInputFromRoute:
    buildToolPageEvidenceSignalsStateInputFromRouteMock,
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
    expect(buildToolPagePrepStateInputFromRouteMock).toHaveBeenCalledTimes(1);
    expect(buildToolPagePrepStateMock).toHaveBeenCalledTimes(1);
    expect(buildToolPageDecisionSectionStateInputFromRouteMock).toHaveBeenCalledTimes(1);
    expect(buildToolPageDecisionSectionStateMock).toHaveBeenCalledTimes(1);
    expect(toToolPageOptionalRecordMock).toHaveBeenCalledTimes(1);
    expect(toToolPageReviewSourcesMock).toHaveBeenCalledTimes(1);
    expect(buildToolPageReviewArtifactsStateMock).toHaveBeenCalledTimes(1);
    expect(buildToolPageEvidenceSignalsStateInputFromRouteMock).toHaveBeenCalledTimes(1);
    expect(buildToolPageEvidenceSignalsStateMock).toHaveBeenCalledTimes(1);
  });
});
