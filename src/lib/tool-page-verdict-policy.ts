const NEGATIVE_CLAIM_GUARD =
  /\b(no|not|lacks|lack|cannot|can't|won't|avoid|veto|problem|risk|limit|limited|slow|expensive|broken|fails|failure)\b/i;
const WEB_ONLY_CLAIM_PATTERN =
  /\b(platform access is limited to web(?:[-\s]*based)? environments|web[-\s]*only|limited to web[-\s]*based environments|web-based environments only)\b/i;
const CONTRADICTORY_FREE_PLAN_PATTERN = /\b(no|lack(?:s| of)?)\s+(?:a\s+)?free\s+(?:tier|plan)\b/i;

export interface DeriveToolPageVerdictPolicyInput {
  firstReviewSummaryMarkdown?: string | null;
  toolVerdict?: string | null;
  humanVerdict?: string | null;
  avoidIf: string[];
  hasEligibleNegativeEvidence: boolean;
  hasFreePlanSignal: boolean;
  renderVerdict: string | null;
}

export interface ToolPageVerdictPolicy {
  guardedHumanVerdict: string | null;
  guardedAvoidIf: string[];
  renderVerdictSafe: string | null;
  isDisallowedConClaim: (text: string) => boolean;
}

function isAllowedNegativeClaim(text: string | null | undefined, hasEligibleNegativeEvidence: boolean): boolean {
  if (!text) return false;
  return !NEGATIVE_CLAIM_GUARD.test(text) || hasEligibleNegativeEvidence;
}

function sanitizeVerdictText(value: string | null, hasFreePlanSignal: boolean): string | null {
  if (!value) return value;
  let next = value;
  if (hasFreePlanSignal) {
    next = next.replace(
      /\b(?:no|lack(?:s| of)?)\s+(?:a\s+)?free\s+(?:tier|plan|trial)\b[^.\n]*(?:[.\n]|$)/gi,
      ''
    );
  }
  next = next.replace(
    /\b(?:web[-\s]*only|limited to web(?:[-\s]*based environments)?|platform access is limited to web(?:[-\s]*based)? environments)\b[^.\n]*(?:[.\n]|$)/gi,
    ''
  );
  next = next.replace(/\n{3,}/g, '\n\n').trim();
  return next || value;
}

export function deriveToolPageVerdictPolicy(
  input: DeriveToolPageVerdictPolicyInput
): ToolPageVerdictPolicy {
  const guardedVerdict = isAllowedNegativeClaim(
    input.firstReviewSummaryMarkdown,
    input.hasEligibleNegativeEvidence
  )
    ? input.firstReviewSummaryMarkdown || null
    : null;
  const guardedHumanVerdict = isAllowedNegativeClaim(
    input.humanVerdict,
    input.hasEligibleNegativeEvidence
  )
    ? input.humanVerdict || null
    : null;
  const guardedToolVerdict = isAllowedNegativeClaim(
    input.toolVerdict,
    input.hasEligibleNegativeEvidence
  )
    ? input.toolVerdict || null
    : null;

  const renderVerdictSource =
    guardedVerdict || guardedToolVerdict || guardedHumanVerdict || input.renderVerdict;
  const renderVerdictSafe = sanitizeVerdictText(renderVerdictSource, input.hasFreePlanSignal);
  const guardedAvoidIf = input.hasEligibleNegativeEvidence ? input.avoidIf : [];

  const isDisallowedConClaim = (text: string): boolean => {
    if (!text) return false;
    if (WEB_ONLY_CLAIM_PATTERN.test(text)) return true;
    if (input.hasFreePlanSignal && CONTRADICTORY_FREE_PLAN_PATTERN.test(text)) return true;
    return false;
  };

  return {
    guardedHumanVerdict,
    guardedAvoidIf,
    renderVerdictSafe,
    isDisallowedConClaim,
  };
}
