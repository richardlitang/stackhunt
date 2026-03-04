import { describe, expect, it } from 'vitest';
import { buildToolPageReviewArtifacts } from '@/lib/tool-page/review-artifacts';

describe('tool page review artifacts', () => {
  it('builds evaluation and evidence-links view models from shared inputs', () => {
    const result = buildToolPageReviewArtifacts({
      canonicalFacts: {
        quality: {
          summary: {
            evaluation_depth: 'docs_only',
            tested_items: ['API docs'],
            not_tested_items: ['Enterprise SSO'],
          },
        },
      },
      reviewSources: [
        {
          url: 'https://example.com/docs',
          title: 'Docs',
          source_type: 'official',
        },
      ],
      toolName: 'Acme',
    });

    expect(result.evaluationViewModel.evaluationDepth).toBe('Docs-only');
    expect(result.evidenceLinksViewModel.evidenceLinksAll.length).toBeGreaterThan(0);
  });
});
