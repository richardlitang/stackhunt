import { describe, expect, it } from 'vitest';
import { buildToolPagePricingLinkText } from '@/lib/tool-page/pricing/pricing-link-text';

describe('tool page pricing link text', () => {
  it('truncates long text to 120 characters with ellipsis', () => {
    const input = 'x'.repeat(130);
    const result = buildToolPagePricingLinkText({ text: input });

    expect(result).toHaveLength(120);
    expect(result.endsWith('...')).toBe(true);
  });

  it('keeps short text unchanged', () => {
    const result = buildToolPagePricingLinkText({ text: 'Official pricing note' });
    expect(result).toBe('Official pricing note');
  });
});
