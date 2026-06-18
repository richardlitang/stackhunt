import { describe, expect, it } from 'vitest';
import { buildToolPageQuickJumpLinks } from '@/lib/tool-page/navigation/quick-jump-links';

describe('tool page quick jump links', () => {
  it('includes required defaults only', () => {
    const result = buildToolPageQuickJumpLinks({
      showVerdict: false,
      hasGettingStarted: false,
      showPricingSection: false,
      hasStrengths: false,
      hasFeatures: false,
      showSpecs: false,
      hasPlatform: false,
      hasFaq: false,
      hasAlternatives: false,
      hasSources: false,
      hasUpdates: false,
    });

    expect(result.map((item) => item.label)).toEqual(['Tests', 'How we evaluated']);
  });

  it('adds conditional links when enabled', () => {
    const result = buildToolPageQuickJumpLinks({
      showVerdict: true,
      hasGettingStarted: true,
      showPricingSection: true,
      hasStrengths: true,
      hasFeatures: true,
      showSpecs: true,
      hasPlatform: true,
      hasFaq: true,
      hasAlternatives: true,
      hasSources: true,
      hasUpdates: true,
    });

    expect(result.some((item) => item.href === '#update-history')).toBe(true);
    expect(result.some((item) => item.href === '#strengths')).toBe(true);
    expect(result[0].href).toBe('#verdict');
    expect(result.some((item) => item.href === '/disclosure')).toBe(false);
  });

  it('keeps canonical jump-link order for rendered sections', () => {
    const result = buildToolPageQuickJumpLinks({
      showVerdict: false,
      hasGettingStarted: false,
      showPricingSection: true,
      hasStrengths: false,
      hasFeatures: false,
      showSpecs: false,
      hasPlatform: false,
      hasFaq: false,
      hasAlternatives: false,
      hasSources: true,
      hasUpdates: false,
    });

    expect(result.map((item) => item.href)).toEqual([
      '#before-you-buy-tests',
      '#how-we-evaluate',
      '#pricing-plans',
      '#sources',
    ]);
  });
});
