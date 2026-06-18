import { describe, expect, it } from 'vitest';
import { buildToolPageFixedSectionLinks } from '@/lib/tool-page/navigation/section-order';

describe('tool page section order', () => {
  it('returns visible links in canonical fixed order', () => {
    const links = buildToolPageFixedSectionLinks(
      new Set(['disclosures', 'pricing', 'verdict', 'sources', 'workflow_fit'])
    );

    expect(links.map((link) => link.href)).toEqual([
      '#verdict',
      '#before-you-buy-tests',
      '#pricing-plans',
      '#sources',
      '/disclosure',
    ]);
  });
});
