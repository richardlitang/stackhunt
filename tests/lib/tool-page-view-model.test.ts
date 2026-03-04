import { describe, expect, it } from 'vitest';
import { buildToolPageViewModel, type ToolPageViewModelInput } from '@/lib/tool-page/view-model';

const baseInput: ToolPageViewModelInput = {
  activeReviewLens: 'general',
  hasVerdict: false,
  showProceduralVerdict: false,
  showPricingSection: false,
  hasGettingStarted: false,
  hasFeatures: false,
  hasSpecs: false,
  showProceduralSpecs: false,
  hasPlatform: false,
  hasAlternatives: false,
};

describe('tool page view model', () => {
  it('returns expected general priority links order', () => {
    const result = buildToolPageViewModel({
      ...baseInput,
      hasVerdict: true,
      showPricingSection: true,
      hasFeatures: true,
      hasAlternatives: true,
    });

    expect(result.lensPriorityLinks).toEqual([
      { href: '#verdict', label: 'Verdict' },
      { href: '#pricing-plans', label: 'Pricing' },
      { href: '#features', label: 'Capabilities' },
      { href: '#alternatives', label: 'Alternatives' },
    ]);
  });

  it('selects setup as personal default focus when getting-started exists', () => {
    const result = buildToolPageViewModel({
      ...baseInput,
      activeReviewLens: 'personal',
      hasGettingStarted: true,
      hasVerdict: true,
    });

    expect(result.lensDefaultFocus).toBe('setup');
  });

  it('selects integrations as startup default focus when pricing is hidden', () => {
    const result = buildToolPageViewModel({
      ...baseInput,
      activeReviewLens: 'startup',
      hasPlatform: true,
      hasVerdict: true,
    });

    expect(result.lensDefaultFocus).toBe('integrations');
  });

  it('hides focus switch when trust is the only enabled focus option', () => {
    const result = buildToolPageViewModel(baseInput);
    expect(result.showFocusSwitch).toBe(false);
  });

  it('uses platform fallback for capabilities link when only platform data exists', () => {
    const result = buildToolPageViewModel({
      ...baseInput,
      hasPlatform: true,
      hasVerdict: true,
    });

    expect(result.lensPriorityLinks).toContainEqual({
      href: '#platform-integrations',
      label: 'Platform',
    });
  });
});
