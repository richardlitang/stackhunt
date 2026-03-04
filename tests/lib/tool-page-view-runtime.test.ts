import { describe, expect, it } from 'vitest';
import { buildToolPageViewRuntime } from '@/lib/tool-page/view-runtime';

describe('tool page view runtime', () => {
  it('builds heading, labels, meta merge, and source aria label helper', () => {
    const result = buildToolPageViewRuntime({
      toolName: 'Acme',
      toolMeta: {
        title: 'Acme Review | StackHunt',
        description: 'Default description',
        canonical: 'https://stackhunt.io/tool/acme',
      },
      metaRuntimeMeta: {
        description: 'Runtime description',
        canonical: 'https://stackhunt.io/tools',
        noindex: true,
      },
    });

    expect(result.toolReviewHeading).toBe('Acme Review');
    expect(result.lensLabelMap.enterprise).toBe('Enterprise');
    expect(result.meta.description).toBe('Runtime description');
    expect(result.meta.noindex).toBe(true);
    expect(result.sourceAriaLabel('  Example\u200B source  ')).toContain(
      'Open source evidence for Example source'
    );
  });
});
