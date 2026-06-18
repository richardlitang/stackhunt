import { describe, expect, it } from 'vitest';
import { buildToolPageAlternativesRuntime } from '@/lib/tool-page/alternatives/alternatives-runtime';

describe('tool page alternatives runtime', () => {
  it('builds comparable alternatives and per-slug compare flags from raw route data', () => {
    const result = buildToolPageAlternativesRuntime({
      tool: {
        slug: 'acme-pay',
        item_category_links: [{ category: { id: 'payments' } }],
        metadata: { deployment: ['cloud'] },
      },
      orderedAlternatives: [
        {
          slug: 'stripe',
          item_category_links: [{ category: { id: 'payments' } }],
          metadata: { deployment: ['cloud'] },
        },
        {
          slug: 'jira',
          item_category_links: [{ category: { id: 'project-management' } }],
          metadata: { deployment: ['cloud'] },
        },
      ],
    });

    expect(result.canCompareBySlug.stripe).toBe(true);
    expect(result.canCompareBySlug.jira).toBe(false);
    expect(result.hasComparableAlternatives).toBe(true);
    expect(result.comparableAlternatives.map((item) => item.slug)).toEqual(['stripe']);
  });
});
