import { describe, expect, it } from 'vitest';
import { buildToolPageAlternativesState } from '@/lib/tool-page/alternatives-state';

describe('tool page alternatives state', () => {
  it('computes comparable alternatives and per-slug compare flags', () => {
    const mainTool = {
      slug: 'notion',
      category: { id: 'cat-productivity' },
      metadata: {},
    };
    const alternatives = [
      { slug: 'clickup', category: { id: 'cat-productivity' }, metadata: {} },
      { slug: 'spotify', category: { id: 'cat-music' }, metadata: {} },
    ];

    const result = buildToolPageAlternativesState(mainTool, alternatives);

    expect(result.hasComparableAlternatives).toBe(true);
    expect(result.comparableAlternatives.map((item) => item.slug)).toContain('clickup');
    expect(result.canCompareBySlug.clickup).toBe(true);
    expect(result.canCompareBySlug.spotify).toBe(false);
  });
});
