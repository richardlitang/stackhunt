export interface ToolPageProvisionalReviewLike {
  status?: string | null;
  score?: number | null;
  summary_markdown?: string | null;
  pros?: unknown;
  cons?: unknown;
  sources?: unknown;
}

export interface ToolPageProvisionalIndexEligibility {
  allowed: boolean;
  reasons: string[];
}

export function countToolPageClaimBullets(raw: unknown): number {
  if (!Array.isArray(raw)) return 0;
  return raw.filter((entry) => {
    if (typeof entry === 'string') return entry.trim().length > 0;
    if (entry && typeof entry === 'object') {
      const text = (entry as { text?: string }).text;
      return typeof text === 'string' && text.trim().length > 0;
    }
    return false;
  }).length;
}

export function evaluateToolPageProvisionalIndexEligibility({
  firstReview,
  gateReasons,
  strictBlockers,
}: {
  firstReview: ToolPageProvisionalReviewLike | null;
  gateReasons: string[];
  strictBlockers: string[];
}): ToolPageProvisionalIndexEligibility {
  if (!firstReview) return { allowed: false, reasons: ['missing_review'] };
  const status = String(firstReview.status || '').toLowerCase();
  if (!['draft', 'review'].includes(status)) {
    return { allowed: false, reasons: ['not_draft_or_review'] };
  }
  const score = Number(firstReview.score || 0);
  const summaryLength =
    typeof firstReview.summary_markdown === 'string'
      ? firstReview.summary_markdown.trim().length
      : 0;
  const prosCount = countToolPageClaimBullets(firstReview.pros);
  const consCount = countToolPageClaimBullets(firstReview.cons);
  const sourceCount = Array.isArray(firstReview.sources) ? firstReview.sources.length : 0;
  const nonQualityStrictBlockers = strictBlockers.filter(
    (blocker) => !blocker.startsWith('quality_gate:')
  );
  const hardReasons = gateReasons.filter(
    (reason) =>
      reason === 'missing_required_sections' ||
      reason === 'subject_scope_pending' ||
      reason === 'UNSUPPORTED_NEGATIVE_CLAIM' ||
      reason.startsWith('conflicts_detected:') ||
      reason.startsWith('pricing_conflicts_detected:')
  );
  const allowed =
    score >= 72 &&
    summaryLength >= 140 &&
    prosCount >= 2 &&
    consCount >= 1 &&
    sourceCount >= 3 &&
    hardReasons.length === 0 &&
    nonQualityStrictBlockers.length === 0;
  return {
    allowed,
    reasons: [
      ...(score >= 72 ? [] : ['score_below_threshold']),
      ...(summaryLength >= 140 ? [] : ['summary_too_short']),
      ...(prosCount >= 2 ? [] : ['pros_below_threshold']),
      ...(consCount >= 1 ? [] : ['cons_missing']),
      ...(sourceCount >= 3 ? [] : ['sources_below_threshold']),
      ...hardReasons,
      ...nonQualityStrictBlockers,
    ],
  };
}
