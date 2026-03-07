import { describe, expect, it } from 'vitest';
import {
  buildToolPageDecisionSnapshot,
  buildToolPageFallbackDecisionSummary,
  deriveToolPageDecisionDifferentiators,
} from '@/lib/tool-page/decision';

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
    expect(result.decisionSnapshotBestWhen).toEqual([]);
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

  it('builds fallback summary from short description, tagline, or generic fallback', () => {
    expect(buildToolPageFallbackDecisionSummary('Acme', 'Short description', 'Tagline')).toBe(
      'Short description'
    );
    expect(buildToolPageFallbackDecisionSummary('Acme', null, 'Tagline')).toBe('Tagline');
    expect(buildToolPageFallbackDecisionSummary('Acme', null, null)).toBe('');
  });

  it('does not derive best-when/watch-out lists from generic pros/cons fallbacks', () => {
    const result = buildToolPageDecisionSnapshot({
      decisionSlotsRaw: null,
      decisionIntroRaw: null,
      fallbackDecisionSummary: '',
      idealFor: [],
      guardedAvoidIf: [],
      isPaymentsCategory: true,
      paymentTriggerCons: ['Settlement lag risk'],
      fallbackConsText: ['Contract lock-in'],
      firstReviewPros: ['Good for teams'],
      firstReviewCons: ['Needs setup'],
      tagAudienceNames: ['Operations'],
      isDisallowedConClaim: () => false,
      cleanNarrativeText,
      cleanDecisionSlotText,
      uniqueDecisionText,
    });

    expect(result.decisionSnapshotBestWhen).toEqual([]);
    expect(result.decisionSnapshotWatchOuts).toEqual([]);
  });

  it('derives differentiators from unique and core features with dedupe', () => {
    const differentiators = deriveToolPageDecisionDifferentiators(
      ['Fast setup', 'SOC 2'],
      ['SOC 2', 'Audit logs'],
      uniqueDecisionText
    );
    expect(differentiators).toEqual(['Fast setup', 'SOC 2']);
  });
});
