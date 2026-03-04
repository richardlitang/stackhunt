import { describe, expect, it } from 'vitest';
import { buildToolPageCompareButtonProps } from '@/lib/tool-page/compare-button-props';

describe('tool page compare button props', () => {
  it('returns compare button prop bag', () => {
    const result = buildToolPageCompareButtonProps({
      toolSlug: 'notion',
      toolName: 'Notion',
      toolLogo: 'https://logo.example',
      categorySlug: 'docs',
      categoryName: 'Docs',
    });

    expect(result.toolSlug).toBe('notion');
    expect(result.categorySlug).toBe('docs');
  });
});
