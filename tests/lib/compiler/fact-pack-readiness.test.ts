import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FACT_PACK_READINESS_THRESHOLDS,
  RELAXED_FACT_PACK_READINESS_THRESHOLDS,
  evaluateFactPackReadiness,
  resolveFactPackReadinessThresholds,
} from '@/lib/compiler/fact-pack-readiness';

describe('evaluateFactPackReadiness', () => {
  it('passes when coverage and freshness meet thresholds', () => {
    const result = evaluateFactPackReadiness({
      coverage: {
        ratio: 0.81,
        required_ratio: 0.95,
      },
      freshness: {
        pricing: {
          age_days: 14,
          is_stale: false,
        },
      },
    });

    expect(result.eligible).toBe(true);
    expect(result.reasons).toEqual([]);
  });

  it('fails when coverage is too low', () => {
    const result = evaluateFactPackReadiness({
      coverage: {
        ratio: 0.2,
        required_ratio: 0.5,
      },
      freshness: {
        pricing: {
          age_days: 5,
          is_stale: false,
        },
      },
    });

    expect(result.eligible).toBe(false);
    expect(result.reasons).toContain(
      `fact_pack_coverage_below_min:${(0.2).toFixed(2)}<${DEFAULT_FACT_PACK_READINESS_THRESHOLDS.minCoverageRatio.toFixed(2)}`
    );
    expect(result.reasons).toContain(
      `fact_pack_required_coverage_below_min:${(0.5).toFixed(2)}<${DEFAULT_FACT_PACK_READINESS_THRESHOLDS.minRequiredCoverageRatio.toFixed(2)}`
    );
  });

  it('fails when pricing freshness is stale', () => {
    const result = evaluateFactPackReadiness({
      coverage: {
        ratio: 0.9,
        required_ratio: 0.9,
      },
      freshness: {
        pricing: {
          age_days: 200,
          is_stale: true,
        },
      },
    });

    expect(result.eligible).toBe(false);
    expect(result.reasons).toContain('fact_pack_pricing_stale');
    expect(result.reasons).toContain(
      `fact_pack_pricing_age_exceeds_max:200>${DEFAULT_FACT_PACK_READINESS_THRESHOLDS.maxPricingAgeDays}`
    );
  });
});

describe('resolveFactPackReadinessThresholds', () => {
  it('returns default thresholds when profile is unset', () => {
    const original = process.env.FACT_PACK_READINESS_PROFILE;
    delete process.env.FACT_PACK_READINESS_PROFILE;
    try {
      expect(resolveFactPackReadinessThresholds()).toEqual(DEFAULT_FACT_PACK_READINESS_THRESHOLDS);
    } finally {
      if (typeof original === 'string') {
        process.env.FACT_PACK_READINESS_PROFILE = original;
      }
    }
  });

  it('returns relaxed thresholds when profile is relaxed', () => {
    const original = process.env.FACT_PACK_READINESS_PROFILE;
    process.env.FACT_PACK_READINESS_PROFILE = 'relaxed';
    try {
      expect(resolveFactPackReadinessThresholds()).toEqual(RELAXED_FACT_PACK_READINESS_THRESHOLDS);
    } finally {
      if (typeof original === 'string') {
        process.env.FACT_PACK_READINESS_PROFILE = original;
      } else {
        delete process.env.FACT_PACK_READINESS_PROFILE;
      }
    }
  });
});
