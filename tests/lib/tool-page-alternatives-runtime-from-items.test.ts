import { describe, expect, it } from 'vitest';
import { buildToolPageAlternativesRuntimeFromItems } from '@/lib/tool-page/alternatives-runtime';

describe('tool page alternatives runtime from items', () => {
  it('builds alternatives runtime directly from item-like records', () => {
    const result = buildToolPageAlternativesRuntimeFromItems(
      {
        slug: 'acme-pay',
        item_category_links: [{ category: { id: 'payments' } }],
        metadata: { deployment: ['cloud'] },
      },
      [
        {
          slug: 'stripe',
          item_category_links: [{ category: { id: 'payments' } }],
          metadata: { deployment: ['cloud'] },
        },
        {
          slug: 'asana',
          item_category_links: [{ category: { id: 'project-management' } }],
          metadata: { deployment: ['cloud'] },
        },
      ]
    );

    expect(result.canCompareBySlug.stripe).toBe(true);
    expect(result.canCompareBySlug.asana).toBe(false);
    expect(result.comparableAlternatives.map((item) => item.slug)).toEqual(['stripe']);
  });
});
