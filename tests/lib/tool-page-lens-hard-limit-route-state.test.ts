import { describe, expect, it } from 'vitest';
import { buildToolPageLensHardLimitRouteState } from '@/lib/tool-page/lens-hard-limit-route-state';

describe('tool page lens hard-limit route state', () => {
  it('ranks limits by lens and exposes the top hard limit', () => {
    const result = buildToolPageLensHardLimitRouteState({
      canonicalHardLimits: [
        { text: 'No SSO on lower tiers', sourceUrl: 'https://example.com/pricing' },
        { text: 'No offline mode', sourceUrl: 'https://example.com/docs' },
      ],
      activeReviewLens: 'enterprise',
    });

    expect(result.lensRankedHardLimits.length).toBe(2);
    expect(result.topLensHardLimit?.text).toBeTruthy();
  });
});
