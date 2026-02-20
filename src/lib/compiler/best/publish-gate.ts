export interface BestPublishGateInput {
  rankedCount: number;
  topKCount: number;
  topKWithEvidenceCount: number;
  topKFreshCount: number;
  criticalConflictCount: number;
}

export interface BestPublishGateThresholds {
  minRankedCount: number;
  minTopKEvidenceRate: number;
  minTopKFreshRate: number;
  maxCriticalConflictCount: number;
}

export interface BestPublishGateResult {
  pass: boolean;
  reasons: string[];
  metrics: {
    topKEvidenceRate: number;
    topKFreshRate: number;
  };
}

export const DEFAULT_BEST_PUBLISH_THRESHOLDS: BestPublishGateThresholds = {
  minRankedCount: 5,
  minTopKEvidenceRate: 0.8,
  minTopKFreshRate: 0.8,
  maxCriticalConflictCount: 0,
};

function safeRate(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return numerator / denominator;
}

export function evaluateBestPublishGate(
  input: BestPublishGateInput,
  thresholds: BestPublishGateThresholds = DEFAULT_BEST_PUBLISH_THRESHOLDS
): BestPublishGateResult {
  const reasons: string[] = [];

  const topKEvidenceRate = safeRate(input.topKWithEvidenceCount, input.topKCount);
  const topKFreshRate = safeRate(input.topKFreshCount, input.topKCount);

  if (input.rankedCount < thresholds.minRankedCount) {
    reasons.push(`ranked_count_below_min:${input.rankedCount}<${thresholds.minRankedCount}`);
  }

  if (topKEvidenceRate < thresholds.minTopKEvidenceRate) {
    reasons.push(
      `topk_evidence_below_min:${topKEvidenceRate.toFixed(2)}<${thresholds.minTopKEvidenceRate.toFixed(2)}`
    );
  }

  if (topKFreshRate < thresholds.minTopKFreshRate) {
    reasons.push(`topk_freshness_below_min:${topKFreshRate.toFixed(2)}<${thresholds.minTopKFreshRate.toFixed(2)}`);
  }

  if (input.criticalConflictCount > thresholds.maxCriticalConflictCount) {
    reasons.push(
      `critical_conflicts_exceed_max:${input.criticalConflictCount}>${thresholds.maxCriticalConflictCount}`
    );
  }

  return {
    pass: reasons.length === 0,
    reasons,
    metrics: {
      topKEvidenceRate,
      topKFreshRate,
    },
  };
}
