import { describe, expect, it } from 'vitest';
import { buildToolPageQualityStateInput } from '@/lib/tool-page/quality-state-input';

describe('tool page quality state input', () => {
  it('extracts persisted quality payload from canonical facts', () => {
    const result = buildToolPageQualityStateInput({
      tool: { id: 't1', name: 'Acme', slug: 'acme' } as any,
      firstReview: null,
      reviewSelection: {
        hasPublishedReview: true,
        hasDraftReview: false,
      },
      canonicalFacts: {
        quality: {
          should_index: false,
          noindex_reasons: ['missing_required_sections'],
          section_publishability: { faq: false },
          section_status: { verdict: 'procedural' },
          evidence_counts: { community_domains: 2 },
        },
      },
    });

    expect(result.persistedQuality?.should_index).toBe(false);
    expect(result.persistedQuality?.section_publishability?.faq).toBe(false);
    expect(result.persistedQuality?.section_status?.verdict).toBe('procedural');
    expect(result.persistedQuality?.evidence_counts?.community_domains).toBe(2);
  });
});
