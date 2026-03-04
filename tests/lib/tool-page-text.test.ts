import { describe, expect, it } from 'vitest';
import {
  cleanToolPageDecisionSlotText,
  cleanToolPageDecisionText,
  cleanToolPageNarrativeText,
  extractToolPageClaimText,
  isLikelyIncompleteToolPageClause,
  stripToolPageControlChars,
  uniqueToolPageDecisionText,
} from '@/lib/tool-page/text';

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
    expect(cleanToolPageNarrativeText('- setup takes about 1 hour')).toBe('Setup takes about 1 hour');
    expect(cleanToolPageDecisionSlotText('main tradeoff: requires setup', 'tradeoff')).toBe(
      'Requires setup'
    );
  });

  it('deduplicates decision text case-insensitively', () => {
    expect(uniqueToolPageDecisionText(['Fast onboarding', 'fast onboarding', 'Clear controls'])).toEqual([
      'Fast onboarding',
      'Clear controls',
    ]);
  });
});
