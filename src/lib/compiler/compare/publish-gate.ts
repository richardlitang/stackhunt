export interface ComparePublishGateInput {
  comparable: boolean;
  toolAHasEvidence: boolean;
  toolBHasEvidence: boolean;
  criticalConflictCount: number;
}

export interface ComparePublishGateThresholds {
  requireComparable: boolean;
  requireEvidenceForBothTools: boolean;
  maxCriticalConflictCount: number;
}

export interface ComparePublishGateResult {
  pass: boolean;
  reasons: string[];
}

export const DEFAULT_COMPARE_PUBLISH_THRESHOLDS: ComparePublishGateThresholds = {
  requireComparable: true,
  requireEvidenceForBothTools: true,
  maxCriticalConflictCount: 0,
};

export function evaluateComparePublishGate(
  input: ComparePublishGateInput,
  thresholds: ComparePublishGateThresholds = DEFAULT_COMPARE_PUBLISH_THRESHOLDS
): ComparePublishGateResult {
  const reasons: string[] = [];

  if (thresholds.requireComparable && !input.comparable) {
    reasons.push('pair_not_comparable');
  }

  if (
    thresholds.requireEvidenceForBothTools &&
    (!input.toolAHasEvidence || !input.toolBHasEvidence)
  ) {
    reasons.push('missing_evidence_for_one_or_more_tools');
  }

  if (input.criticalConflictCount > thresholds.maxCriticalConflictCount) {
    reasons.push(
      `critical_conflicts_exceed_max:${input.criticalConflictCount}>${thresholds.maxCriticalConflictCount}`
    );
  }

  return {
    pass: reasons.length === 0,
    reasons,
  };
}
