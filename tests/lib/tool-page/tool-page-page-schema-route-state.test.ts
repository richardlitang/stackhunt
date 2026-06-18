import { describe, expect, it } from 'vitest';
import { buildToolPagePageSchemaRouteState } from '@/lib/tool-page/route-state/page-schema-route-state';

describe('tool page page schema route state', () => {
  it('keeps base schemas when no review is present', () => {
    const result = buildToolPagePageSchemaRouteState({
      schemas: [{ '@type': 'BreadcrumbList' }],
      firstReview: null,
      tool: {
        name: 'Acme',
        slug: 'acme',
        category: null,
      },
      categoryName: null,
    });

    expect(result.pageSchemas).toEqual([{ '@type': 'BreadcrumbList' }]);
  });

  it('appends review schema when review is present', () => {
    const result = buildToolPagePageSchemaRouteState({
      schemas: [{ '@type': 'BreadcrumbList' }],
      firstReview: {
        id: 7,
        title: 'Acme review',
        verdict: 'Strong for startup sales teams.',
        verdict_confidence: 'high',
      },
      tool: {
        name: 'Acme',
        slug: 'acme',
        category: null,
      },
      categoryName: null,
    });

    expect(result.pageSchemas).toHaveLength(2);
    expect(result.pageSchemas[1]).toMatchObject({
      '@type': 'Review',
      itemReviewed: {
        name: 'Acme',
      },
    });
  });
});
