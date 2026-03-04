import { describe, expect, it } from 'vitest';
import { buildToolPageAlternativeCardsView } from '@/lib/tool-page/alternatives-cards';

describe('tool page alternatives cards view', () => {
  it('derives compare visibility per alternative slug', () => {
    const result = buildToolPageAlternativeCardsView({
      alternatives: [{ slug: 'a' }, { slug: 'b' }],
      canCompareByAlternativeSlug: { a: true },
    });

    expect(result).toEqual([
      { alt: { slug: 'a' }, showCompareLink: true },
      { alt: { slug: 'b' }, showCompareLink: false },
    ]);
  });
});
