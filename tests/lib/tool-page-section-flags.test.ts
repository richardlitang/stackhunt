import { describe, expect, it } from 'vitest';
import { buildToolPageSectionFlags } from '@/lib/tool-page/section-flags';

describe('tool page section flags', () => {
  it('projects raw and gated section flags from section runtime', () => {
    const result = buildToolPageSectionFlags({
      sectionSignals: {
        hasFAQRaw: true,
        hasFeatures: true,
        hasSpecsRaw: true,
        hasPlatformRaw: false,
        hasAlternatives: true,
        hasCommunityRaw: false,
      },
      sectionState: {
        hasFAQ: true,
        hasGettingStarted: true,
        hasSpecs: true,
        hasCommunity: false,
        hasPlatform: false,
        hasSecurity: true,
        hasPortability: false,
        hasOperationalDetails: true,
      },
      hasFAQ: true,
      hasGettingStarted: true,
      hasFeatures: true,
      hasSpecs: true,
      hasCommunity: false,
      hasPlatform: false,
      hasSecurity: true,
      hasPortability: false,
      hasOperationalDetails: true,
      hasAlternatives: true,
    });

    expect(result.hasFAQRaw).toBe(true);
    expect(result.hasAlternatives).toBe(true);
    expect(result.hasCommunityRaw).toBe(false);
    expect(result.hasSecurity).toBe(true);
  });
});
