import { describe, it, expect } from 'vitest';
import { resolveToolVerdict } from '@/lib/tool-page/tool-verdict';

describe('resolveToolVerdict', () => {
  it('averages review scores over base_score', () => {
    const v = resolveToolVerdict({
      baseScore: 50,
      reviewScores: [80, 84],
      verdictText: 'Great for fast teams.',
      lastCheckedISO: null,
    });
    expect(v.score).toBe(82);
    expect(v.scoreLabel).toBe('Good');
    expect(v.recommendationTerm).toBe('Strong buy');
    expect(v.scoreColor?.text).toBe('text-green-400');
  });

  it('falls back to base_score when no review scores', () => {
    expect(
      resolveToolVerdict({
        baseScore: 88,
        reviewScores: [],
        verdictText: null,
        lastCheckedISO: null,
      }).score
    ).toBe(88);
  });

  it('returns null score when nothing resolves', () => {
    expect(
      resolveToolVerdict({
        baseScore: null,
        reviewScores: [],
        verdictText: null,
        lastCheckedISO: null,
      }).score
    ).toBeNull();
  });

  it('trims verdict to one clean sentence', () => {
    const v = resolveToolVerdict({
      baseScore: 70,
      reviewScores: [],
      verdictText:
        'Linear is fast and opinionated; it suits product teams who want speed over configurability and dislike Jira.',
      lastCheckedISO: null,
    });
    expect(v.verdictLine!.length).toBeLessThanOrEqual(140);
    expect(/[.!?]$/.test(v.verdictLine!)).toBe(true);
  });
});
