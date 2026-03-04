import { describe, expect, it } from 'vitest';
import { buildToolPageDecisionSnapshot } from '@/lib/tool-page-decision';

const cleanNarrativeText = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

const cleanDecisionSlotText = (
  value: unknown,
  _slot: 'best_fit' | 'weak_fit' | 'tradeoff'
): string | null => (typeof value === 'string' && value.trim().length > 0 ? value.trim() : null);

const uniqueDecisionText = (items: Array<unknown>): string[] => {
  const seen = new Set<string>();
  return items
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map((item) => item.trim())
    .filter((item) => {
      const key = item.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

describe('tool page decision snapshot', () => {
  it('uses fallback summary when intro looks like a spec sheet', () => {
    const result = buildToolPageDecisionSnapshot({
      decisionSlotsRaw: { what_it_is: 'Strong product across pricing, fit, and rollout risk' },
      decisionIntroRaw: null,
      fallbackDecisionSummary: 'Fallback summary',
      idealFor: [],
      guardedAvoidIf: [],
      isPaymentsCategory: false,
      paymentTriggerCons: [],
      fallbackConsText: [],
      firstReviewPros: ['For analysts'],
      firstReviewCons: ['Needs setup'],
      tagAudienceNames: [],
      isDisallowedConClaim: () => false,
      cleanNarrativeText,
      cleanDecisionSlotText,
      uniqueDecisionText,
    });

    expect(result.introLooksSpecSheet).toBe(true);
    expect(result.decisionSnapshotSummary).toBe('Fallback summary');
    expect(result.decisionSnapshotBestWhen).toEqual(['For analysts']);
  });

  it('applies disallowed-claim filtering and fallback watch-outs', () => {
    const result = buildToolPageDecisionSnapshot({
      decisionSlotsRaw: { tradeoff: 'Needs enterprise plan', weak_fit: 'DISALLOWED' },
      decisionIntroRaw: null,
      fallbackDecisionSummary: 'Fallback summary',
      idealFor: ['Startups'],
      guardedAvoidIf: ['Needs onboarding help'],
      isPaymentsCategory: true,
      paymentTriggerCons: ['Settlement lag risk'],
      fallbackConsText: ['Contract lock-in'],
      firstReviewPros: [],
      firstReviewCons: ['General downside'],
      tagAudienceNames: [],
      isDisallowedConClaim: (text) => text === 'DISALLOWED',
      cleanNarrativeText,
      cleanDecisionSlotText,
      uniqueDecisionText,
    });

    expect(result.decisionSnapshotBestWhen).toEqual(['Startups']);
    expect(result.decisionSnapshotWatchOuts).toEqual(['Needs onboarding help']);
    expect(result.decisionTradeoffSummaryInitial).toBe('Needs enterprise plan');
  });
});
