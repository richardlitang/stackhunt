import { describe, expect, it } from 'vitest';
import { buildToolPageWebsiteState } from '@/lib/tool-page/website';

describe('tool page website state', () => {
  it('marks website as present when url exists', () => {
    expect(buildToolPageWebsiteState({ website: 'https://example.com' }).hasWebsite).toBe(true);
  });

  it('marks website as missing for null', () => {
    expect(buildToolPageWebsiteState({ website: null }).hasWebsite).toBe(false);
  });
});
