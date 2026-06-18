import { describe, expect, it } from 'vitest';
import {
  countToolPageClaimBullets,
  evaluateToolPageProvisionalIndexEligibility,
} from '@/lib/tool-page/policy/provisional-index';

describe('tool page provisional index', () => {
  it('counts claim bullets from strings and objects', () => {
    expect(countToolPageClaimBullets(['a', ' ', { text: 'b' }, { text: '' }])).toBe(2);
  });

  it('allows provisional index when all thresholds pass', () => {
    const result = evaluateToolPageProvisionalIndexEligibility({
      firstReview: {
        status: 'draft',
        score: 80,
        summary_markdown: 'x'.repeat(150),
        pros: ['Pro 1', 'Pro 2'],
        cons: ['Con 1'],
        sources: [{ url: 'a' }, { url: 'b' }, { url: 'c' }],
      },
      gateReasons: [],
      strictBlockers: ['quality_gate:warning'],
    });

    expect(result.allowed).toBe(true);
    expect(result.reasons).toEqual([]);
  });

  it('blocks provisional index when hard reasons or strict blockers exist', () => {
    const result = evaluateToolPageProvisionalIndexEligibility({
      firstReview: {
        status: 'review',
        score: 60,
        summary_markdown: 'short',
        pros: ['Pro 1'],
        cons: [],
        sources: [{ url: 'a' }],
      },
      gateReasons: ['missing_required_sections'],
      strictBlockers: ['structure_missing'],
    });

    expect(result.allowed).toBe(false);
    expect(result.reasons).toContain('score_below_threshold');
    expect(result.reasons).toContain('summary_too_short');
    expect(result.reasons).toContain('pros_below_threshold');
    expect(result.reasons).toContain('cons_missing');
    expect(result.reasons).toContain('sources_below_threshold');
    expect(result.reasons).toContain('missing_required_sections');
    expect(result.reasons).toContain('structure_missing');
  });

  it('treats subject scope pending as a hard blocker', () => {
    const result = evaluateToolPageProvisionalIndexEligibility({
      firstReview: {
        status: 'review',
        score: 90,
        summary_markdown: 'x'.repeat(180),
        pros: ['Pro 1', 'Pro 2'],
        cons: ['Con 1'],
        sources: [{ url: 'a' }, { url: 'b' }, { url: 'c' }],
      },
      gateReasons: ['subject_scope_pending'],
      strictBlockers: [],
    });

    expect(result.allowed).toBe(false);
    expect(result.reasons).toContain('subject_scope_pending');
  });
});
