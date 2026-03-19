import { describe, expect, it } from 'vitest';
import { buildToolPageFaqState, filterToolPageFaqItems } from '@/lib/tool-page/faq';

describe('tool page faq filtering', () => {
  it('keeps stable source-backed FAQ items', () => {
    const result = filterToolPageFaqItems([
      {
        question: 'How does migration work from another CRM?',
        answer: 'Import records first, then validate ownership mappings and required fields.',
        answer_source_url: 'https://example.com/docs/setup',
        answer_source_type: 'official',
      },
    ]);
    expect(result).toHaveLength(1);
  });

  it('drops volatile terms when source type is not official', () => {
    const result = filterToolPageFaqItems([
      {
        question: 'Which models are supported?',
        answer: 'It supports GPT and Claude variants.',
        answer_source_url: 'https://example.com/blog',
        answer_source_type: 'community',
      },
    ]);
    expect(result).toHaveLength(0);
  });

  it('drops pricing-focused FAQ items even when source-backed', () => {
    const result = filterToolPageFaqItems([
      {
        question: 'What pricing tier includes SSO?',
        answer: 'Enterprise plan includes SSO.',
        answer_source_url: 'https://example.com/pricing',
        answer_source_type: 'official',
      },
    ]);
    expect(result).toHaveLength(0);
  });

  it('builds faq state with seo-safe knowledge card copy', () => {
    const knowledgeCard = {
      faqs: [
        {
          question: 'How does migration work from another CRM?',
          answer: 'Import records first, then validate ownership mappings and required fields.',
          answer_source_url: 'https://example.com/docs/setup',
          answer_source_type: 'official',
        },
        {
          question: 'What pricing tier includes SSO?',
          answer: 'Enterprise plan includes SSO.',
          answer_source_url: 'https://example.com/pricing',
          answer_source_type: 'official',
        },
      ],
    };
    const result = buildToolPageFaqState(knowledgeCard);
    expect(result.faqItems).toHaveLength(1);
    expect(Array.isArray(result.knowledgeCardForSeo?.faqs)).toBe(true);
    expect((result.knowledgeCardForSeo?.faqs as unknown[]).length).toBe(1);
  });

  it('drops low-value generic faq prompts', () => {
    const result = filterToolPageFaqItems([
      {
        question: 'What is this tool?',
        answer: 'It is a project management tool.',
        answer_source_url: 'https://example.com/docs/overview',
        answer_source_type: 'official',
      },
    ]);
    expect(result).toHaveLength(0);
  });
});
