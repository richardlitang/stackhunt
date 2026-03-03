export interface DecisionIntroInput {
  toolName: string;
  shortDescription?: string | null;
  pros: string[];
  cons: string[];
  proClaims?: ClaimEvidenceLike[];
  conClaims?: ClaimEvidenceLike[];
}

export interface DecisionIntro {
  what_it_is: string;
  best_for: string;
  not_for: string;
  main_tradeoff: string;
  summary: string;
}

export interface DecisionEvidenceClaim {
  text: string;
  source_url: string;
  source_type: 'official' | 'editorial' | 'community' | 'unknown';
  claim_type: 'fact' | 'opinion' | 'unknown';
}

export interface DecisionEvidence {
  best_for_reason?: DecisionEvidenceClaim;
  not_for_reason?: DecisionEvidenceClaim;
  tradeoff_reason?: DecisionEvidenceClaim;
}

export interface ClaimEvidenceLike {
  text?: string | null;
  source_url?: string | null;
  source_type?: string | null;
  claim_type?: string | null;
}

const HEDGING_PREFIX =
  /^(users report(?: that)?|community (?:reports|mentions|consensus (?:is|suggests)|feedback)|according to (?:reddit|hn|community)|based on user discussions)[:,]?\s*/i;
const GENERIC_DECISION_PATTERNS = [
  /\brobust and powerful solution\b/gi,
  /\bworth shortlisting\b/gi,
  /\bbest-in-class capabilities?\b/gi,
  /\bgreat for teams?\b/gi,
  /\bmodern teams?\b/gi,
];

function removeGenericPhrases(value: string): string {
  let next = value;
  for (const pattern of GENERIC_DECISION_PATTERNS) {
    next = next.replace(pattern, '');
  }
  return next.replace(/\s+/g, ' ').trim();
}

function cleanText(value: string): string {
  return removeGenericPhrases(
    value
    .replace(/\s+/g, ' ')
    .replace(HEDGING_PREFIX, '')
    .replace(/[.:;!?]+$/, '')
    .trim()
  );
}

function toSentence(value: string, fallback: string): string {
  const text = cleanText(value || '');
  const next = text.length > 0 ? text : fallback;
  return next.endsWith('.') ? next : `${next}.`;
}

function normalizeEvidenceClaim(
  claim: ClaimEvidenceLike | null | undefined
): DecisionEvidenceClaim | undefined {
  if (!claim || typeof claim.text !== 'string' || claim.text.trim().length < 8) return undefined;
  if (typeof claim.source_url !== 'string' || claim.source_url.trim().length < 10) return undefined;
  return {
    text: cleanText(claim.text),
    source_url: claim.source_url.trim(),
    source_type:
      claim.source_type === 'official' ||
      claim.source_type === 'editorial' ||
      claim.source_type === 'community'
        ? claim.source_type
        : 'unknown',
    claim_type:
      claim.claim_type === 'fact' || claim.claim_type === 'opinion' ? claim.claim_type : 'unknown',
  };
}

function hasConcreteSignal(value: string): boolean {
  return /\d/.test(value) || /\b(k|m|b|token|request|seat|plan|tier|gb|tb|ms|sec|min|hour|day|month|year|api|quota|limit)\b/i.test(value);
}

function scoreSpecificity(claim: ClaimEvidenceLike): number {
  const text = typeof claim.text === 'string' ? cleanText(claim.text) : '';
  if (text.length < 8) return -100;

  let score = text.length >= 32 ? 2 : 0;
  if (hasConcreteSignal(text)) score += 5;

  if (claim.source_type === 'official') score += 5;
  else if (claim.source_type === 'editorial') score += 2;
  else if (claim.source_type === 'community') score += 1;

  if (claim.claim_type === 'fact') score += 3;
  else if (claim.claim_type === 'opinion') score += 1;

  if (/\b(great|best-in-class|robust|powerful|shortlisting)\b/i.test(text)) score -= 4;
  return score;
}

function pickMostSpecificClaim(claims: ClaimEvidenceLike[] | undefined): string | null {
  if (!Array.isArray(claims) || claims.length === 0) return null;
  const ranked = claims
    .map((claim) => ({ claim, score: scoreSpecificity(claim) }))
    .sort((a, b) => b.score - a.score);

  const best = ranked[0];
  if (!best || best.score < 3 || typeof best.claim.text !== 'string') return null;
  return cleanText(best.claim.text);
}

function toBuyerFitSentence(prefix: string, claim: string, fallback: string): string {
  const normalized = cleanText(claim);
  if (normalized.length < 8) return fallback;
  return toSentence(`${prefix} ${normalized}`, fallback);
}

export function generateDecisionEvidence(
  pros: ClaimEvidenceLike[],
  cons: ClaimEvidenceLike[]
): DecisionEvidence {
  const sortedPros = [...pros].sort((a, b) => scoreSpecificity(b) - scoreSpecificity(a));
  const sortedCons = [...cons].sort((a, b) => scoreSpecificity(b) - scoreSpecificity(a));
  const bestFor = normalizeEvidenceClaim(sortedPros[0]);
  const notFor = normalizeEvidenceClaim(sortedCons[0]);
  const tradeoff = normalizeEvidenceClaim(sortedCons[1] || sortedCons[0] || sortedPros[0]);
  return {
    ...(bestFor ? { best_for_reason: bestFor } : {}),
    ...(notFor ? { not_for_reason: notFor } : {}),
    ...(tradeoff ? { tradeoff_reason: tradeoff } : {}),
  };
}

export function generateDecisionIntro(input: DecisionIntroInput): DecisionIntro {
  const firstPro = input.pros.find((value) => typeof value === 'string' && value.trim().length > 8) || '';
  const firstCon = input.cons.find((value) => typeof value === 'string' && value.trim().length > 8) || '';
  const specificProFromClaims = pickMostSpecificClaim(input.proClaims);
  const specificConFromClaims = pickMostSpecificClaim(input.conClaims);
  const specificPro = specificProFromClaims || cleanText(firstPro);
  const specificCon = specificConFromClaims || cleanText(firstCon);

  const descriptionCandidate =
    typeof input.shortDescription === 'string' && input.shortDescription.trim().length >= 20
      ? cleanText(input.shortDescription)
      : '';
  const whatItIsRaw =
    descriptionCandidate.length >= 20
      ? descriptionCandidate
      : `${input.toolName} is covered here as a software buying decision.`;

  const best_for = toBuyerFitSentence(
    'Best for teams where',
    specificPro,
    'Best for teams with needs that match the current verified feature set.'
  );
  const not_for = toBuyerFitSentence(
    'Not for teams where',
    specificCon,
    'Not for teams that require capabilities not confirmed in current sources.'
  );
  const tradeoffRaw =
    specificPro.length > 0 && specificCon.length > 0
      ? `Main tradeoff: stronger fit when ${specificPro}, but higher risk when ${specificCon}`
      : 'Main tradeoff: advantages are clearer than constraints only after source-backed claims are complete';

  const what_it_is = toSentence(whatItIsRaw, `${input.toolName} is covered here as a software buying decision.`);
  const main_tradeoff = toSentence(
    tradeoffRaw,
    'Main tradeoff: advantages and constraints are still being confirmed from source-backed claims.'
  );

  return {
    what_it_is,
    best_for,
    not_for,
    main_tradeoff,
    summary: `${what_it_is} ${best_for} ${not_for} ${main_tradeoff}`.trim(),
  };
}
