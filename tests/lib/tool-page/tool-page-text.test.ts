import { describe, expect, it } from 'vitest';
import {
  cleanToolPageDecisionSlotText,
  cleanToolPageDecisionText,
  cleanToolPageNarrativeText,
  deriveToolPageFallbackConsText,
  deriveToolPagePaymentTriggerCons,
  extractToolPageClaimText,
  hasToolPageDistinctAbout,
  isLikelyIncompleteToolPageClause,
  sanitizeToolPageStructuredClaimMarkdown,
  stripToolPageControlChars,
  uniqueToolPageDecisionText,
} from '@/lib/tool-page/shared/text';

describe('tool page text helpers', () => {
  it('normalizes control chars and whitespace', () => {
    expect(stripToolPageControlChars('  hello\u200B   world  ')).toBe('hello world');
  });

  it('detects incomplete clauses', () => {
    expect(isLikelyIncompleteToolPageClause('Approximately')).toBe(true);
    expect(isLikelyIncompleteToolPageClause('Price increase to $10')).toBe(false);
  });

  it('extracts claim text from strings and objects', () => {
    expect(extractToolPageClaimText('  Good claim text  ')).toBe('Good claim text');
    expect(extractToolPageClaimText({ text: ' Another claim ' })).toBe('Another claim');
  });

  it('cleans decision text variants', () => {
    expect(cleanToolPageDecisionText('best fit: teams with clear owners')).toBe(
      'Teams with clear owners'
    );
    expect(cleanToolPageNarrativeText('- setup takes about 1 hour')).toBe(
      'Setup takes about 1 hour'
    );
    expect(cleanToolPageDecisionSlotText('main tradeoff: requires setup', 'tradeoff')).toBe(
      'Requires setup'
    );
  });

  it('deduplicates decision text case-insensitively', () => {
    expect(
      uniqueToolPageDecisionText(['Fast onboarding', 'fast onboarding', 'Clear controls'])
    ).toEqual(['Fast onboarding', 'Clear controls']);
  });

  it('sanitizes structured markdown and strips legacy headings', () => {
    const value =
      '## Community Insights\n{"text":"\\u200BFast setup"}\n\n\nReal-world notes remain.';
    expect(sanitizeToolPageStructuredClaimMarkdown(value)).toBe(
      'Fast setup\n\nReal-world notes remain.'
    );
  });

  it('detects distinct about text', () => {
    expect(hasToolPageDistinctAbout('Long form product summary', 'Short summary')).toBe(true);
    expect(hasToolPageDistinctAbout('Same sentence', 'same sentence')).toBe(false);
  });

  it('derives fallback and payment-trigger cons', () => {
    const fallbackCons = deriveToolPageFallbackConsText([
      { text: 'Gateway fee adds cost' },
      { text: 'Needs onboarding support' },
    ]);
    expect(fallbackCons).toEqual(['Gateway fee adds cost', 'Needs onboarding support']);
    expect(deriveToolPagePaymentTriggerCons(fallbackCons)).toEqual(['Gateway fee adds cost']);
  });
});
