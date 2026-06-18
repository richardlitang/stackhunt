import { describe, expect, it } from 'vitest';
import { buildToolPageFaqItemsView } from '@/lib/tool-page/presentation/faq-items-view';

describe('tool page faq items view', () => {
  it('keeps only decision-supportive faq items and deduplicates question text', () => {
    const result = buildToolPageFaqItemsView([
      {
        question: 'What integrations are available?',
        answer: 'It supports Slack and HubSpot integrations.',
        answer_source_url: 'https://example.com/integrations',
      },
      {
        question: 'What integrations are available?',
        answer: 'Duplicate entry should be removed.',
        answer_source_url: 'https://example.com/integrations-2',
      },
      {
        question: 'What is Tool X?',
        answer: 'Generic overview copy should not render.',
        answer_source_url: 'https://example.com/overview',
      },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]?.question).toContain('integrations');
    expect(result[0]?.hasSourceLink).toBe(true);
  });
});
