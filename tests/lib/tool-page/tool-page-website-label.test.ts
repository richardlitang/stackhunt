import { describe, expect, it } from 'vitest';
import { buildToolPageWebsiteLabel } from '@/lib/tool-page/presentation/website-label';

describe('tool page website label', () => {
  it('uses host label when present', () => {
    expect(buildToolPageWebsiteLabel({ websiteHostLabel: 'example.com' })).toBe('example.com');
  });

  it('falls back to default label', () => {
    expect(buildToolPageWebsiteLabel({ websiteHostLabel: null })).toBe('Official site');
  });
});
