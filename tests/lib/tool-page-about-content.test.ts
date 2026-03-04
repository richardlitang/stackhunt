import { describe, expect, it } from 'vitest';
import { buildToolPageAboutContent } from '@/lib/tool-page/about-content';

describe('tool page about content', () => {
  it('falls back to empty string when long description is missing', () => {
    expect(buildToolPageAboutContent({ longDescription: null }).body).toBe('');
  });

  it('uses provided long description', () => {
    expect(buildToolPageAboutContent({ longDescription: 'Details' }).body).toBe('Details');
  });
});
