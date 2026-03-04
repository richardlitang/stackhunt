import { describe, expect, it } from 'vitest';
import { buildToolPageFaqItemsView } from '@/lib/tool-page/faq-items-view';

describe('tool page faq items view', () => {
  it('adds source-link visibility flag per faq item', () => {
    const result = buildToolPageFaqItemsView([
      { question: 'Q1', answer: 'A1', answer_source_url: 'https://a.example' },
      { question: 'Q2', answer: 'A2', answer_source_url: null },
    ]);

    expect(result[0].hasSourceLink).toBe(true);
    expect(result[1].hasSourceLink).toBe(false);
  });
});
