import { describe, expect, it } from 'vitest';
import { buildToolPageQuickJumpLinks } from '@/lib/tool-page/quick-jump-links';

describe('tool page quick jump links', () => {
  it('includes required defaults and disclosure', () => {
    const result = buildToolPageQuickJumpLinks({
      showVerdict: false,
      hasGettingStarted: false,
      showPricingSection: false,
      hasFeatures: false,
      showSpecs: false,
      hasPlatform: false,
      hasFaq: false,
      hasAlternatives: false,
      hasSources: false,
      hasUpdates: false,
    });

    expect(result.map((item) => item.label)).toEqual([
      'Workflow fit',
      'How we evaluated',
      'Disclosures',
    ]);
  });

  it('adds conditional links when enabled', () => {
    const result = buildToolPageQuickJumpLinks({
      showVerdict: true,
      hasGettingStarted: true,
      showPricingSection: true,
      hasFeatures: true,
      showSpecs: true,
      hasPlatform: true,
      hasFaq: true,
      hasAlternatives: true,
      hasSources: true,
      hasUpdates: true,
    });

    expect(result.some((item) => item.href === '#update-history')).toBe(true);
    expect(result[0].href).toBe('#verdict');
  });
});
