import { describe, expect, it } from 'vitest';
import { evaluateBestPublishGate } from '@/lib/compiler/best/publish-gate';
import { evaluateComparePublishGate } from '@/lib/compiler/compare/publish-gate';

describe('best publish gate', () => {
  it('passes when thresholds are met', () => {
    const result = evaluateBestPublishGate({
      rankedCount: 6,
      topKCount: 5,
      topKWithEvidenceCount: 5,
      topKFreshCount: 5,
      criticalConflictCount: 0,
    });

    expect(result.pass).toBe(true);
    expect(result.reasons).toEqual([]);
  });

  it('fails when ranked count is too low', () => {
    const result = evaluateBestPublishGate({
      rankedCount: 3,
      topKCount: 3,
      topKWithEvidenceCount: 3,
      topKFreshCount: 3,
      criticalConflictCount: 0,
    });

    expect(result.pass).toBe(false);
    expect(result.reasons).toContain('ranked_count_below_min:3<5');
  });
});

describe('compare publish gate', () => {
  it('passes when pair is comparable and evidence exists', () => {
    const result = evaluateComparePublishGate({
      comparable: true,
      toolAHasEvidence: true,
      toolBHasEvidence: true,
      criticalConflictCount: 0,
    });

    expect(result.pass).toBe(true);
  });

  it('fails when pair is not comparable', () => {
    const result = evaluateComparePublishGate({
      comparable: false,
      toolAHasEvidence: true,
      toolBHasEvidence: true,
      criticalConflictCount: 0,
    });

    expect(result.pass).toBe(false);
    expect(result.reasons).toContain('pair_not_comparable');
  });
});
