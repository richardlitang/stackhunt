import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getToolPageItemBySlugMock,
  getToolTagsMock,
  deriveToolPageCoreStateMock,
  deriveToolPageReviewContentListsMock,
  getAlternativesMock,
  computeMicroDiffsMock,
  fetchToolPageCuratedVerdictEntriesMock,
  orderToolPageAlternativesByIdsMock,
} = vi.hoisted(() => ({
  getToolPageItemBySlugMock: vi.fn(),
  getToolTagsMock: vi.fn(() => ({ audiences: [] })),
  deriveToolPageCoreStateMock: vi.fn(() => ({
    knowledgeCard: null,
    globalPros: [],
    globalCons: [],
    constraints: [],
    canonicalFacts: null,
    setupTracks: null,
    categorySpecificData: null,
    displayCategorySpecificData: null,
    websiteHostLabel: 'example.com',
    vipSpecifics: null,
    reviewContext: null,
    userReportedPros: [],
    userReportedCons: [],
  })),
  deriveToolPageReviewContentListsMock: vi.fn(() => ({
    sources: [],
    pros: [],
    cons: [],
  })),
  getAlternativesMock: vi.fn(() => ({
    type: 'alternatives',
    items: [],
  })),
  computeMicroDiffsMock: vi.fn(() => new Map()),
  fetchToolPageCuratedVerdictEntriesMock: vi.fn(async () => new Map()),
  orderToolPageAlternativesByIdsMock: vi.fn(() => []),
}));

vi.mock('@/lib/supabase', () => ({
  getToolPageItemBySlug: getToolPageItemBySlugMock,
  getToolTags: getToolTagsMock,
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('@/lib/tool-page/runtime/core-state', () => ({
  deriveToolPageCoreState: deriveToolPageCoreStateMock,
}));

vi.mock('@/lib/tool-page/presentation/review-content', () => ({
  deriveToolPageReviewContentLists: deriveToolPageReviewContentListsMock,
}));

vi.mock('@/lib/analysis/alternatives', () => ({
  getAlternatives: getAlternativesMock,
}));

vi.mock('@/lib/analysis/micro-diff', () => ({
  computeMicroDiffs: computeMicroDiffsMock,
}));

vi.mock('@/lib/tool-page/decision/curated-verdicts', () => ({
  fetchToolPageCuratedVerdictEntries: fetchToolPageCuratedVerdictEntriesMock,
}));

vi.mock('@/lib/tool-page/alternatives/alternatives-order', () => ({
  orderToolPageAlternativesByIds: orderToolPageAlternativesByIdsMock,
}));

import { getToolPageData } from '@/lib/tool-page/data/data';

function baseTool(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'tool_1',
    name: 'Acme',
    slug: 'acme',
    type: 'tool',
    parent_id: null,
    affiliate_offers: [],
    pricing_type: 'freemium',
    learning_curve: 'low',
    base_score: 70,
    specs: {
      canonical: {},
    },
    reviews: [],
    ...overrides,
  };
}

describe('getToolPageData subject-resolution selection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps published review visible when persisted product subject omits entity scope', async () => {
    getToolPageItemBySlugMock.mockResolvedValue(
      baseTool({
        reviews: [
          {
            status: 'published',
            updated_at: '2026-03-10T00:00:00.000Z',
            sources: [],
          },
        ],
        specs: {
          canonical: {
            entity_first_lane_outputs: {
              subject_profile: {
                subject_type: 'product',
                subject_key: 'acme:core',
                display_name: 'Acme',
                entity_scope: null,
                confidence: 'high',
              },
              fact_sheet: {
                official_facts: [],
                official_pricing_facts: [],
                official_limit_facts: [],
              },
              user_signal_sheet: {
                user_signal_pros: [],
                user_signal_cons: [],
              },
              editorial_decision: {
                summary: null,
                best_for: null,
                not_for: null,
                main_tradeoff: null,
                human_verdict: null,
              },
            },
          },
        },
      })
    );

    const result = await getToolPageData('acme');
    expect(getToolPageItemBySlugMock).toHaveBeenCalledWith('acme');
    expect(result).not.toBeNull();
    expect(result?.resolvedSubject.entityScope).toBe('core');
    expect(result?.subjectSelectionSuppressed).toBe(false);
    expect(result?.firstReview).not.toBeNull();
  });

  it('corrects mismatched persisted subject type from canonical scope before selection', async () => {
    getToolPageItemBySlugMock.mockResolvedValue(
      baseTool({
        reviews: [
          {
            status: 'published',
            updated_at: '2026-03-10T00:00:00.000Z',
            sources: [{ entity_scope: 'copilot' }],
          },
        ],
        specs: {
          canonical: {
            entity_first_lane_outputs: {
              subject_profile: {
                subject_type: 'product',
                subject_key: 'acme:copilot',
                display_name: 'Acme Copilot',
                entity_scope: 'copilot',
                confidence: 'high',
              },
              fact_sheet: {
                official_facts: [],
                official_pricing_facts: [],
                official_limit_facts: [],
              },
              user_signal_sheet: {
                user_signal_pros: [],
                user_signal_cons: [],
              },
              editorial_decision: {
                summary: null,
                best_for: null,
                not_for: null,
                main_tradeoff: null,
                human_verdict: null,
              },
            },
          },
        },
      })
    );

    const result = await getToolPageData('acme');
    expect(result).not.toBeNull();
    expect(result?.resolvedSubject.subjectType).toBe('product_surface');
    expect(result?.resolvedSubject.entityScope).toBe('copilot');
    expect(result?.subjectSelectionSuppressed).toBe(false);
    expect(result?.firstReview).not.toBeNull();
  });

  it('suppresses published review when persisted surface subject is missing canonical scope', async () => {
    getToolPageItemBySlugMock.mockResolvedValue(
      baseTool({
        reviews: [
          {
            status: 'published',
            updated_at: '2026-03-10T00:00:00.000Z',
            entity_scope: 'copilot',
            sources: [],
          },
        ],
        specs: {
          canonical: {
            entity_first_lane_outputs: {
              subject_profile: {
                subject_type: 'product_surface',
                subject_key: 'acme:copilot',
                display_name: 'Acme Copilot',
                entity_scope: null,
                confidence: 'high',
              },
              fact_sheet: {
                official_facts: [],
                official_pricing_facts: [],
                official_limit_facts: [],
              },
              user_signal_sheet: {
                user_signal_pros: [],
                user_signal_cons: [],
              },
              editorial_decision: {
                summary: null,
                best_for: null,
                not_for: null,
                main_tradeoff: null,
                human_verdict: null,
              },
            },
          },
        },
      })
    );

    const result = await getToolPageData('acme');
    expect(result).not.toBeNull();
    expect(result?.resolvedSubject.confidence).toBe('low');
    expect(result?.subjectSelectionSuppressed).toBe(true);
    expect(result?.subjectSelectionReason).toContain('missing canonical entity scope');
    expect(result?.firstReview).toBeNull();
  });

  it('falls back to heuristic subject when persisted lane subject is low confidence', async () => {
    getToolPageItemBySlugMock.mockResolvedValue(
      baseTool({
        name: 'GitHub Copilot',
        slug: 'github-copilot',
        reviews: [
          {
            status: 'published',
            updated_at: '2026-03-10T00:00:00.000Z',
            sources: [{ entity_scope: 'copilot' }],
          },
        ],
        specs: {
          canonical: {
            entity_first_lane_outputs: {
              subject_profile: {
                subject_type: 'plan_family',
                subject_key: 'github-copilot:enterprise',
                display_name: 'GitHub Enterprise',
                entity_scope: null,
                confidence: 'low',
              },
              fact_sheet: {
                official_facts: [],
                official_pricing_facts: [],
                official_limit_facts: [],
              },
              user_signal_sheet: {
                user_signal_pros: [],
                user_signal_cons: [],
              },
              editorial_decision: {
                summary: null,
                best_for: null,
                not_for: null,
                main_tradeoff: null,
                human_verdict: null,
              },
            },
          },
        },
      })
    );

    const result = await getToolPageData('github-copilot');
    expect(result).not.toBeNull();
    expect(result?.resolvedSubject.subjectType).toBe('product_surface');
    expect(result?.resolvedSubject.entityScope).toBe('copilot');
    expect(result?.resolvedSubject.confidence).toBe('high');
    expect(result?.subjectSelectionSuppressed).toBe(false);
    expect(result?.firstReview).not.toBeNull();
  });
});
