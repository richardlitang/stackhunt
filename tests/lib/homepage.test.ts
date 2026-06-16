import { describe, it, expect } from 'vitest';
import { formatScore, truncateVerdict, resolveDecisionHref } from '@/lib/homepage';

describe('formatScore', () => {
  it('returns the integer string for a valid 0-100 score', () => {
    expect(formatScore(92)).toBe('92');
    expect(formatScore(7.6)).toBe('8');
  });
  it('returns null for missing or zero scores', () => {
    expect(formatScore(0)).toBeNull();
    expect(formatScore(null)).toBeNull();
    expect(formatScore(undefined)).toBeNull();
  });
});

describe('truncateVerdict', () => {
  it('returns trimmed verdict when short', () => {
    expect(truncateVerdict('  Worth it.  ')).toBe('Worth it.');
  });
  it('ellipsizes past the max length', () => {
    expect(truncateVerdict('a'.repeat(90), 80)).toBe('a'.repeat(80) + '…');
  });
  it('handles empty input', () => {
    expect(truncateVerdict(null)).toBe('');
    expect(truncateVerdict(undefined)).toBe('');
  });
});

describe('resolveDecisionHref', () => {
  it('builds a /best slug url', () => {
    expect(resolveDecisionHref('best-design-tools')).toBe('/best/best-design-tools');
  });
  it('falls back to /best when no slug', () => {
    expect(resolveDecisionHref(null)).toBe('/best');
    expect(resolveDecisionHref('')).toBe('/best');
  });
});
