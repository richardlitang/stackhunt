import { describe, expect, it, vi } from 'vitest';

const {
  deriveToolPageReviewContextSignalsMock,
  buildToolPagePrepDecisionStateFromDecisionContextMock,
  buildToolPageReviewEvidenceStateFromDecisionContextMock,
} = vi.hoisted(() => ({
  deriveToolPageReviewContextSignalsMock: vi.fn(() => ({
    delighters: ['Fast setup'],
    frustrations: ['Seat caps'],
  })),
  buildToolPagePrepDecisionStateFromDecisionContextMock: vi.fn(() => ({
    prepState: { comparableAlternatives: [] },
    decisionSectionState: {
      decisionRuntime: { hasPricing: false },
      qualityState: {},
      faqState: { faqItems: [] },
    },
  })),
  buildToolPageReviewEvidenceStateFromDecisionContextMock: vi.fn(() => ({
    reviewArtifactsState: { evidenceBasis: [] },
    evidenceSignalsState: { reviewSignalsView: {}, evidenceRuntime: {} },
  })),
}));

vi.mock('@/lib/tool-page/review-context', () => ({
  deriveToolPageReviewContextSignals: deriveToolPageReviewContextSignalsMock,
}));

vi.mock('@/lib/tool-page/prep-decision-decision-context', () => ({
  buildToolPagePrepDecisionStateFromDecisionContext:
    buildToolPagePrepDecisionStateFromDecisionContextMock,
}));

vi.mock('@/lib/tool-page/review-evidence-decision-context', () => ({
  buildToolPageReviewEvidenceStateFromDecisionContext:
    buildToolPageReviewEvidenceStateFromDecisionContextMock,
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
    expect(buildToolPagePrepDecisionStateFromDecisionContextMock).toHaveBeenCalledTimes(1);
    expect(buildToolPageReviewEvidenceStateFromDecisionContextMock).toHaveBeenCalledTimes(1);
  });
});
