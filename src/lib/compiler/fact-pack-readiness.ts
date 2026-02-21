type FreshnessEntry = {
  age_days?: number | null;
  is_stale?: boolean;
};

export type FactPackReadinessThresholds = {
  minCoverageRatio: number;
  minRequiredCoverageRatio: number;
  maxPricingAgeDays: number;
  requireKnownPricingAge: boolean;
};

export const DEFAULT_FACT_PACK_READINESS_THRESHOLDS: FactPackReadinessThresholds = {
  minCoverageRatio: 0.5,
  minRequiredCoverageRatio: 0.8,
  maxPricingAgeDays: 120,
  requireKnownPricingAge: true,
};

export const RELAXED_FACT_PACK_READINESS_THRESHOLDS: FactPackReadinessThresholds = {
  minCoverageRatio: 0.35,
  minRequiredCoverageRatio: 0.6,
  maxPricingAgeDays: 180,
  requireKnownPricingAge: false,
};

export function resolveFactPackReadinessThresholds(): FactPackReadinessThresholds {
  const profile = String(process.env.FACT_PACK_READINESS_PROFILE || '')
    .trim()
    .toLowerCase();
  if (profile === 'relaxed') {
    return RELAXED_FACT_PACK_READINESS_THRESHOLDS;
  }
  return DEFAULT_FACT_PACK_READINESS_THRESHOLDS;
}

export type FactPackReadinessResult = {
  eligible: boolean;
  reasons: string[];
  coverageRatio: number;
  requiredCoverageRatio: number;
  pricingAgeDays: number | null;
};

function readNumber(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return parsed;
}

function readPricingFreshness(quality: Record<string, unknown>): FreshnessEntry | null {
  const freshness = quality.freshness;
  if (!freshness || typeof freshness !== 'object') return null;
  const pricing = (freshness as Record<string, unknown>).pricing;
  if (!pricing || typeof pricing !== 'object') return null;
  return pricing as FreshnessEntry;
}

export function evaluateFactPackReadiness(
  qualityJson: unknown,
  thresholds: FactPackReadinessThresholds = DEFAULT_FACT_PACK_READINESS_THRESHOLDS
): FactPackReadinessResult {
  const quality =
    qualityJson && typeof qualityJson === 'object'
      ? (qualityJson as Record<string, unknown>)
      : ({} as Record<string, unknown>);
  const coverage =
    quality.coverage && typeof quality.coverage === 'object'
      ? (quality.coverage as Record<string, unknown>)
      : ({} as Record<string, unknown>);

  const coverageRatio = readNumber(coverage.ratio);
  const requiredCoverageRatio = readNumber(coverage.required_ratio);
  const pricingFreshness = readPricingFreshness(quality);
  const rawPricingAge = pricingFreshness?.age_days;
  const pricingAgeDaysRaw =
    pricingFreshness && typeof rawPricingAge !== 'undefined' && rawPricingAge !== null
      ? Number(rawPricingAge)
      : null;
  const pricingAgeDays =
    pricingAgeDaysRaw === null || !Number.isFinite(pricingAgeDaysRaw) ? null : pricingAgeDaysRaw;
  const reasons: string[] = [];
  if (coverageRatio < thresholds.minCoverageRatio) {
    reasons.push(
      `fact_pack_coverage_below_min:${coverageRatio.toFixed(2)}<${thresholds.minCoverageRatio.toFixed(2)}`
    );
  }
  if (requiredCoverageRatio < thresholds.minRequiredCoverageRatio) {
    reasons.push(
      `fact_pack_required_coverage_below_min:${requiredCoverageRatio.toFixed(2)}<${thresholds.minRequiredCoverageRatio.toFixed(2)}`
    );
  }
  if (pricingAgeDays === null) {
    if (thresholds.requireKnownPricingAge) {
      reasons.push('fact_pack_pricing_age_unknown');
    }
  } else if (pricingAgeDays > thresholds.maxPricingAgeDays) {
    reasons.push(
      `fact_pack_pricing_age_exceeds_max:${pricingAgeDays}>${thresholds.maxPricingAgeDays}`
    );
  }

  return {
    eligible: reasons.length === 0,
    reasons,
    coverageRatio,
    requiredCoverageRatio,
    pricingAgeDays,
  };
}
