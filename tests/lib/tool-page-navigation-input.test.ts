import { describe, expect, it } from 'vitest';
import { buildToolPageNavigationStateInputFromRoute } from '@/lib/tool-page/navigation-input';

describe('tool page navigation input', () => {
  it('maps route booleans into navigation state input', () => {
    const result = buildToolPageNavigationStateInputFromRoute({
      hasVerdict: false,
      showProceduralVerdict: true,
      hasGettingStarted: true,
      showPricingSection: true,
      hasStrengths: true,
      hasFeatures: true,
      hasSpecs: false,
      showProceduralSpecs: true,
      hasPlatform: true,
      hasFAQ: true,
      hasAlternatives: false,
      evidenceBasisCount: 4,
      lowConfidenceCount: 2,
      faqItems: [{ question: 'Q', answer: 'A' }],
      updateHistoryEntriesCount: 3,
    });

    expect(result.showVerdict).toBe(true);
    expect(result.showSpecs).toBe(true);
    expect(result.hasFaq).toBe(true);
    expect(result.hasStrengths).toBe(true);
    expect(result.hasAlternatives).toBe(false);
    expect(result.evidenceBasisCount).toBe(4);
    expect(result.lowConfidenceCount).toBe(2);
    expect(result.updateHistoryEntriesCount).toBe(3);
  });
});
