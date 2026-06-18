import { describe, expect, it } from 'vitest';
import { buildToolPagePlatformSectionState } from '@/lib/tool-page/presentation/platform-section';

describe('tool page platform section state', () => {
  it('shows section when integrations are present', () => {
    const result = buildToolPagePlatformSectionState({
      platforms: [],
      integrations: { has_api: true },
    });

    expect(result.shouldShow).toBe(true);
  });

  it('normalizes platforms to an array', () => {
    const result = buildToolPagePlatformSectionState({
      platforms: null,
      integrations: null,
    });

    expect(result.shouldShow).toBe(false);
    expect(result.platforms).toEqual([]);
  });
});
