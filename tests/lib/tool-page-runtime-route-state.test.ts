import { describe, expect, it } from 'vitest';
import { buildToolPageRuntimeRouteState } from '@/lib/tool-page/runtime-route-state';

describe('tool page runtime route state', () => {
  it('maps runtime bundle fields and appends review schema when review exists', () => {
    const result = buildToolPageRuntimeRouteState({
      runtimeViewBundle: {
        schemas: [{ '@type': 'BreadcrumbList' }],
        updateHistoryLabels: {
          checkedLabel: 'Checked Mar 2026',
          specsLabel: 'Specs verified',
          communityLabel: 'Community verified',
        },
        meta: {
          title: 'Acme review',
          description: 'Acme decision guide',
          canonical: 'https://example.com/tool/acme',
        },
        indexPolicy: {
          shouldIndex: true,
          robotsTag: 'index,follow',
        },
        updateHistoryEntries: [{ label: 'Published', value: 'Mar 1, 2026' }],
        toolReviewHeading: 'Acme Review',
        lensLabelMap: {
          solo: 'Solo',
          startup: 'Startup',
          enterprise: 'Enterprise',
        },
        sourceAriaLabel: 'View source',
        lensRuntime: {
          activeReviewLens: 'startup',
          reviewLensHref: '/tool/acme?lens=startup',
          lensHrefs: [],
        },
      },
      firstReview: {
        id: 99,
        title: 'Acme review',
        verdict: 'Strong fit for startup workflows.',
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
    expect(result.meta.title).toBe('Acme review');
    expect(result.toolReviewHeading).toBe('Acme Review');
    expect(result.indexPolicy.robotsTag).toBe('index,follow');
  });
});
