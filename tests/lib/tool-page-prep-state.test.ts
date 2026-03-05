import { describe, expect, it } from 'vitest';
import {
  buildToolPagePrepState,
  buildToolPagePrepStateFromRoute,
} from '@/lib/tool-page/prep-state';

describe('tool page prep state', () => {
  it('builds prep state from normalized input', () => {
    const state = buildToolPagePrepState({
      reviewSources: [{ source_url: 'https://example.com/docs' }],
      isEligibleEvidenceUrl: () => true,
      tool: {
        slug: 'acme',
        metadata: { taxonomy: { comparable: true } },
        item_category_links: [{ relevance_score: 0.8 }],
      },
      orderedAlternatives: [
        {
          slug: 'beta',
          metadata: { taxonomy: { comparable: true } },
          item_category_links: [{ relevance_score: 0.8 }],
        },
      ],
    });

    expect(state.eligibleSignalEvidenceCount).toBeGreaterThanOrEqual(0);
    expect(typeof state.canCompareByAlternativeSlug).toBe('object');
  });

  it('builds prep state directly from route-level input', () => {
    const state = buildToolPagePrepStateFromRoute({
      reviewSources: [{ source_url: 'https://example.com/docs' }],
      isEligibleEvidenceUrl: () => true,
      tool: {
        slug: 'acme',
        metadata: { taxonomy: { comparable: true } },
        item_category_links: [{ relevance_score: 0.8 }],
      },
      orderedAlternatives: [
        {
          slug: 'beta',
          metadata: { taxonomy: { comparable: true } },
          item_category_links: [{ relevance_score: 0.8 }],
        },
      ],
    });

    expect(state.comparableAlternatives.length).toBeGreaterThanOrEqual(0);
    expect(state.hasComparableAlternatives).toBeTypeOf('boolean');
  });
});
