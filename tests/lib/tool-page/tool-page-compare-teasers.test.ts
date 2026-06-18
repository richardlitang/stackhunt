import { describe, expect, it } from 'vitest';
import { buildToolPageCompareTeaserLinks } from '@/lib/tool-page/alternatives/compare-teasers';

describe('tool page compare teasers', () => {
  it('builds at most three compare links', () => {
    const result = buildToolPageCompareTeaserLinks({
      toolSlug: 'notion',
      alternatives: [
        { slug: 'clickup', name: 'ClickUp' },
        { slug: 'asana', name: 'Asana' },
        { slug: 'trello', name: 'Trello' },
        { slug: 'linear', name: 'Linear' },
      ],
    });

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ href: '/compare/notion-vs-clickup', label: 'Compare ClickUp' });
  });
});
