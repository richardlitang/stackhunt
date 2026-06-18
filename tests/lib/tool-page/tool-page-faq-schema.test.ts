import { describe, expect, it } from 'vitest';
import { buildToolPageFaqSchema } from '@/lib/tool-page/presentation/faq-schema';

describe('tool page faq schema', () => {
  it('returns null when FAQ section is hidden', () => {
    const result = buildToolPageFaqSchema({
      hasFAQ: false,
      tool: { name: 'Acme', slug: 'acme' },
      knowledgeCardForSeo: { faq: [] },
    });

    expect(result).toBeNull();
  });

  it('returns FAQ schema when FAQ section is visible', () => {
    const result = buildToolPageFaqSchema({
      hasFAQ: true,
      tool: { name: 'Acme', slug: 'acme' },
      knowledgeCardForSeo: {
        faqs: [{ question: 'What is Acme?', answer: 'A tool.' }],
      },
    });

    expect(result).toBeTruthy();
  });
});
