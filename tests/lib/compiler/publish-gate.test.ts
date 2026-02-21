import { describe, expect, it } from 'vitest';
import {
  DEFAULT_BEST_PUBLISH_THRESHOLDS,
  LONG_TAIL_BEST_PUBLISH_THRESHOLDS,
  evaluateBestPublishGate,
  resolveBestPublishThresholds,
} from '@/lib/compiler/best/publish-gate';
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

describe('best publish threshold profiles', () => {
  it('resolves default thresholds when profile is unset', () => {
    const original = process.env.BEST_PUBLISH_PROFILE;
    delete process.env.BEST_PUBLISH_PROFILE;
    try {
      expect(resolveBestPublishThresholds()).toEqual(DEFAULT_BEST_PUBLISH_THRESHOLDS);
    } finally {
      if (typeof original === 'string') {
        process.env.BEST_PUBLISH_PROFILE = original;
      }
    }
  });

  it('resolves long-tail thresholds when profile is long_tail', () => {
    const original = process.env.BEST_PUBLISH_PROFILE;
    process.env.BEST_PUBLISH_PROFILE = 'long_tail';
    try {
      expect(resolveBestPublishThresholds()).toEqual(LONG_TAIL_BEST_PUBLISH_THRESHOLDS);
    } finally {
      if (typeof original === 'string') {
        process.env.BEST_PUBLISH_PROFILE = original;
      } else {
        delete process.env.BEST_PUBLISH_PROFILE;
      }
    }
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
