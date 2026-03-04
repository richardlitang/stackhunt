import { describe, expect, it } from 'vitest';
import { buildToolPageNavigationState } from '@/lib/tool-page/navigation-state';

describe('tool page navigation state', () => {
  it('derives quick jump links using sources and updates availability', () => {
    const withSourcesAndUpdates = buildToolPageNavigationState({
      showVerdict: true,
      hasGettingStarted: true,
      showPricingSection: true,
      hasFeatures: true,
      showSpecs: true,
      hasPlatform: true,
      hasFaq: true,
      hasAlternatives: true,
      evidenceBasisCount: 3,
      lowConfidenceCount: 1,
      faqItems: [{ question: 'Q', answer: 'A' }],
      updateHistoryEntriesCount: 2,
    });

    const linksWithAll = withSourcesAndUpdates.quickJumpLinks.map((link) => link.href);
    expect(linksWithAll).toContain('#sources');
    expect(linksWithAll).toContain('#update-history');
    expect(withSourcesAndUpdates.sourcesSectionState.hasSources).toBe(true);
    expect(withSourcesAndUpdates.updateHistoryState.hasUpdates).toBe(true);

    const withoutSourcesOrUpdates = buildToolPageNavigationState({
      showVerdict: true,
      hasGettingStarted: true,
      showPricingSection: true,
      hasFeatures: true,
      showSpecs: true,
      hasPlatform: true,
      hasFaq: true,
      hasAlternatives: true,
      evidenceBasisCount: 0,
      lowConfidenceCount: 0,
      faqItems: [{ question: 'Q', answer: 'A' }],
      updateHistoryEntriesCount: 0,
    });

    const linksWithout = withoutSourcesOrUpdates.quickJumpLinks.map((link) => link.href);
    expect(linksWithout).not.toContain('#sources');
    expect(linksWithout).not.toContain('#update-history');
    expect(withoutSourcesOrUpdates.sourcesSectionState.hasSources).toBe(false);
    expect(withoutSourcesOrUpdates.updateHistoryState.hasUpdates).toBe(false);
  });
});
