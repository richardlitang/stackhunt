import { describe, expect, it } from 'vitest';
import {
  buildToolPageNavigationStateInputFromRoute,
  buildToolPageNavigationStateInputFromRouteContext,
} from '@/lib/tool-page/navigation-input';

describe('tool page navigation input', () => {
  it('maps route booleans into navigation state input', () => {
    const result = buildToolPageNavigationStateInputFromRoute({
      hasVerdict: false,
      showProceduralVerdict: true,
      hasGettingStarted: true,
      showPricingSection: true,
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
    expect(result.hasAlternatives).toBe(false);
    expect(result.evidenceBasisCount).toBe(4);
    expect(result.lowConfidenceCount).toBe(2);
    expect(result.updateHistoryEntriesCount).toBe(3);
  });

  it('maps flattened route context into navigation state input', () => {
    const result = buildToolPageNavigationStateInputFromRouteContext({
      hasVerdict: false,
      showProceduralVerdict: true,
      hasGettingStarted: true,
      showPricingSection: true,
      hasFeatures: true,
      hasSpecs: false,
      showProceduralSpecs: true,
      hasPlatform: true,
      hasFAQ: true,
      hasAlternatives: false,
      faqItems: [{ question: 'Q', answer: 'A' }],
      evidenceBasis: [{ label: 'docs_checked', count: 2 }],
      lowConfidenceEvidenceLinks: [{ url: 'https://example.com/forum' }],
      updateHistoryEntries: [{ label: 'Updated pricing' }],
    });

    expect(result.showVerdict).toBe(true);
    expect(result.showSpecs).toBe(true);
    expect(result.evidenceBasisCount).toBe(1);
    expect(result.lowConfidenceCount).toBe(1);
    expect(result.updateHistoryEntriesCount).toBe(1);
  });
});
