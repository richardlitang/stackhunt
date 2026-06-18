import { describe, expect, it } from 'vitest';
import { buildToolPageRuntimeAssemblyBaseInputFromRoute } from '@/lib/tool-page/route-state/runtime-assembly-base-input';

describe('tool page runtime assembly base input', () => {
  it('maps base route/runtime fields for runtime assembly', () => {
    const result = buildToolPageRuntimeAssemblyBaseInputFromRoute({
      pathname: '/tool/acme',
      searchParams: new URLSearchParams('lens=general'),
      activeReviewLens: 'general',
      toolName: 'Acme',
      toolVerdict: 'Shortlist',
      toolMeta: {
        title: 'Acme Review',
        description: 'Acme tool review',
        canonical: 'https://stackhunt.ai/tool/acme',
      },
      canonicalHardLimits: [{ text: 'No on-prem option' }],
    });

    expect(result.pathname).toBe('/tool/acme');
    expect(result.activeReviewLens).toBe('general');
    expect(result.toolName).toBe('Acme');
    expect(result.toolVerdict).toBe('Shortlist');
    expect(result.canonicalHardLimits).toEqual([{ text: 'No on-prem option' }]);
  });
});
