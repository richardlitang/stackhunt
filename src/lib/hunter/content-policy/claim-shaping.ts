/**
 * Claim shaping for hunter synthesis output.
 *
 * These helpers were extracted from the Gemini synthesis method so they can be
 * unit-tested in isolation. Two rules they enforce:
 *  - A claim that is already a full clause is never wrapped in a framing prefix
 *    ("Can block teams that require …"). Wrapping a clause produced broken
 *    double-clause copy ("Can block teams that require reports indicate …").
 *  - A claim too generic to carry decision value is dropped (returns ''), not
 *    replaced with a canned filler string. The caller skips dropped claims.
 */

type ClaimLabel = 'pros' | 'cons';
type ClaimSourceType = 'official' | 'editorial' | 'community';

const GENERIC_CLAIM_PATTERNS = [
  /\beasy to use\b/i,
  /\buser[- ]?friendly\b/i,
  /\bpowerful\b/i,
  /\brobust\b/i,
  /\bscalable\b/i,
  /\bgreat support\b/i,
  /\bgood value\b/i,
  /\bfeature[- ]?rich\b/i,
  /\bgreat for\b/i,
  /\bsolid choice\b/i,
  /\bworth (?:considering|shortlisting)\b/i,
];

/** A claim carries decision value if it names a number, a constraint, or a concrete capability. */
export function hasSpecificitySignal(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return false;
  if (/\d/.test(normalized)) return true;
  if (
    /\b(no|not|without|only|limited|limit|limits|constraint|constraints|requires?|supports?|lacks?)\b/.test(
      normalized
    )
  ) {
    return true;
  }
  if (
    /\b(api|sso|sla|gdpr|soc ?2|hipaa|oauth|export|import|linux|windows|ios|android)\b/.test(
      normalized
    )
  ) {
    return true;
  }
  return false;
}

function lowercaseFirst(text: string): string {
  return text.length > 0 ? `${text.charAt(0).toLowerCase()}${text.slice(1)}` : text;
}

function uppercaseFirst(text: string): string {
  return text.length > 0 ? `${text.charAt(0).toUpperCase()}${text.slice(1)}` : text;
}

/** Too short, or matches a known marketing platitude. */
export function isGenericClaim(text: string): boolean {
  const normalized = text.trim();
  if (normalized.length < 18) return true;
  return GENERIC_CLAIM_PATTERNS.some((pattern) => pattern.test(normalized));
}

const DECISION_SCENARIO_SIGNAL_REGEX =
  /\b(best for|not for|avoid if|switch (?:when|if)|if|when|unless|team|teams|startup|enterprise|small business|solo|agency|developer|marketer|ops|compliance|budget|rollout|migration)\b/i;

const DECISION_CONSEQUENCE_SIGNAL_REGEX =
  /\b(block|blocker|risk|trade[- ]?off|means|impact|forces|requires|cannot|can't|only on|tier|plan|overage|limit|limited)\b/i;

/**
 * A claim that already reads as a sentence (has a subject + finite verb). Such a
 * claim must not be wrapped in a framing prefix — doing so stitches two clauses
 * into ungrammatical copy.
 */
const CLAUSE_VERB_REGEX =
  /\b(is|are|was|were|has|have|had|indicates?|reports?|requires?|supports?|lacks?|blocks?|costs?|limits?|charges?|offers?|needs?|cannot|can't|does|do|provides?|includes?|allows?|prevents?|forces?|means)\b/i;

/**
 * Rewrite a low-specificity claim. Specific claims pass through unchanged.
 * Generic/unimprovable claims return '' so the caller can drop them — we never
 * substitute a canned filler string.
 */
export function rewriteLowSpecificityClaim(
  text: string,
  _label: ClaimLabel,
  _sourceType: ClaimSourceType
): string {
  if (!isGenericClaim(text) && hasSpecificitySignal(text)) return text;
  return '';
}

/**
 * Frame a claim so it reads as a buyer decision. A bare noun/gerund fragment is
 * wrapped ("Best for teams that need …" / "Can block teams that require …"); a
 * claim that is already a clause is left as a sentence (only capitalized and
 * punctuated), never wrapped.
 */
export function enforceDecisionUsefulClaim(
  text: string,
  label: ClaimLabel,
  sourceType: ClaimSourceType
): string {
  let next = (text ?? '').trim().replace(/\s+/g, ' ');
  if (!next) return '';

  const hasScenario = DECISION_SCENARIO_SIGNAL_REGEX.test(next);
  const looksLikeClause = CLAUSE_VERB_REGEX.test(next);

  if (!hasScenario && !looksLikeClause) {
    next =
      label === 'pros'
        ? `Best for teams that need ${lowercaseFirst(next)}`
        : sourceType === 'community'
          ? `Users report this can block teams that require ${lowercaseFirst(next)}`
          : `Can block teams that require ${lowercaseFirst(next)}`;
  }

  if (label === 'cons' && !looksLikeClause && !DECISION_CONSEQUENCE_SIGNAL_REGEX.test(next)) {
    next =
      sourceType === 'community'
        ? `Users report rollout risk: ${lowercaseFirst(next)}`
        : `Rollout risk: ${lowercaseFirst(next)}`;
  }

  next = uppercaseFirst(next);
  if (!/[.!?]$/.test(next)) next = `${next}.`;
  return next;
}
