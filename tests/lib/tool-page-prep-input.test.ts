import { describe, expect, it } from 'vitest';
import {
  buildToolPagePrepStateInputFromRoute,
  buildToolPagePrepStateInputFromRouteContext,
} from '@/lib/tool-page/prep-input';

describe('tool page prep input', () => {
  it('maps route fields into prep state input and defaults alternatives', () => {
    const input = buildToolPagePrepStateInputFromRoute({
      reviewSources: [{ url: 'https://example.com' }],
      isEligibleEvidenceUrl: (value) => typeof value === 'string',
      tool: { slug: 'acme', metadata: { type: 'tool' } },
      orderedAlternatives: null,
    });

    expect(input.reviewSources).toEqual([{ url: 'https://example.com' }]);
    expect(input.tool.slug).toBe('acme');
    expect(input.orderedAlternatives).toEqual([]);
    expect(input.isEligibleEvidenceUrl('https://example.com')).toBe(true);
  });

  it('maps flattened route context into prep state input', () => {
    const input = buildToolPagePrepStateInputFromRouteContext({
      reviewSources: [{ url: 'https://example.com' }],
      isEligibleEvidenceUrl: (value) => typeof value === 'string',
      tool: { slug: 'acme', metadata: { type: 'tool' } },
      orderedAlternatives: [{ slug: 'beta' }],
    });

    expect(input.reviewSources).toEqual([{ url: 'https://example.com' }]);
    expect(input.tool.slug).toBe('acme');
    expect(input.orderedAlternatives).toEqual([{ slug: 'beta' }]);
    expect(input.isEligibleEvidenceUrl('https://example.com')).toBe(true);
  });
});
