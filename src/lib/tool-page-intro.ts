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

const GENERIC_PHRASES = [
  /\bworth shortlisting\b/i,
  /\brobust and powerful solution\b/i,
  /\bbest-in-class capabilities\b/i,
  /\bstrong option\b/i,
];
const HEDGING_PREFIX = /^(users report(?: that)?|community (?:reports|mentions|consensus (?:is|suggests)|feedback)|according to (?:reddit|hn|community)|based on user discussions)[:,]?\s*/i;
const GENERIC_TOKENS =
  /\b(powerful|robust|great|excellent|solid|best-in-class|innovative|modern|intuitive|seamless)\b/i;
const NUMERIC_SIGNAL = /\b\d+(?:\.\d+)?(?:%|x|k|m|b|\/| per |\b)\b/i;
const LIMIT_SIGNAL =
  /\b(limit|limited|cap|caps|rate[-\s]?limit|seat|seats|tier|enterprise|overage|retention|quota|window|token|pricing|cost)\b/i;

function cleanText(value: string): string {
  return value
    .replace(/\s+/g, ' ')
    .replace(HEDGING_PREFIX, '')
    .replace(/[.:;!?]+$/, '')
    .trim();
}

function removeGenericPhrases(value: string): string {
  let next = value;
  for (const phrase of GENERIC_PHRASES) {
    next = next.replace(phrase, '').trim();
  }
  return cleanText(next);
}

function toSentence(value: string, fallback: string): string {
  const cleaned = removeGenericPhrases(value);
  const text = cleaned.length > 0 ? cleaned : fallback;
  return text.endsWith('.') ? text : `${text}.`;
}

function normalizeEvidenceClaim(claim: ClaimEvidenceLike | null | undefined): DecisionEvidenceClaim | undefined {
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
    claim_type: claim.claim_type === 'fact' || claim.claim_type === 'opinion' ? claim.claim_type : 'unknown',
  };
}

function claimSpecificityScore(claim: ClaimEvidenceLike | null | undefined): number {
  if (!claim || typeof claim.text !== 'string') return -1;
  const text = cleanText(claim.text);
  if (text.length < 12) return -1;
  let score = 0;
  if (text.length >= 40) score += 2;
  if (NUMERIC_SIGNAL.test(text)) score += 3;
  if (LIMIT_SIGNAL.test(text)) score += 2;
  if (!GENERIC_TOKENS.test(text)) score += 1;
  if (claim.source_type === 'official') score += 3;
  else if (claim.source_type === 'editorial') score += 2;
  else if (claim.source_type === 'community') score += 1;
  if (claim.claim_type === 'fact') score += 2;
  return score;
}

function pickBestClaim(
  primaryClaims: ClaimEvidenceLike[] | undefined,
  fallbackTexts: string[]
): string | null {
  const claims = Array.isArray(primaryClaims) ? primaryClaims : [];
  let best: { text: string; score: number } | null = null;
  for (const claim of claims) {
    const score = claimSpecificityScore(claim);
    if (score < 0) continue;
    const text = cleanText(String(claim.text || ''));
    if (!text) continue;
    if (!best || score > best.score) {
      best = { text, score };
    }
  }
  if (best) return best.text;
  const fallback = fallbackTexts.find((text) => typeof text === 'string' && cleanText(text).length > 10);
  return fallback ? cleanText(fallback) : null;
}

export function generateDecisionEvidence(
  pros: ClaimEvidenceLike[],
  cons: ClaimEvidenceLike[]
): DecisionEvidence {
  const sortedPros = [...pros].sort((a, b) => claimSpecificityScore(b) - claimSpecificityScore(a));
  const sortedCons = [...cons].sort((a, b) => claimSpecificityScore(b) - claimSpecificityScore(a));
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
  const bestProClaim = pickBestClaim(input.proClaims, input.pros);
  const bestConClaim = pickBestClaim(input.conClaims, input.cons);
  const proText = bestProClaim ? cleanText(bestProClaim) : null;
  const conText = bestConClaim ? cleanText(bestConClaim) : null;
  const whatItIsRaw =
    typeof input.shortDescription === 'string' && input.shortDescription.trim().length >= 20
      ? input.shortDescription
      : `${input.toolName} is covered here as a software buying decision.`;
  const bestForRaw =
    proText && proText.length > 10
      ? `Best for teams that need ${proText}`
      : 'Best for teams with needs that match the current verified feature set';
  const notForRaw =
    conText && conText.length > 10
      ? `Not for teams that need to avoid ${conText}`
      : 'Not for teams that require capabilities not confirmed in current sources';
  const tradeoffRaw =
    proText && conText
      ? `Main tradeoff: stronger fit when ${proText}, but higher risk when ${conText}`
      : 'Main tradeoff: advantages are clearer than constraints only after source-backed claims are complete';

  const what_it_is = toSentence(whatItIsRaw, `${input.toolName} is covered here as a software buying decision.`);
  const best_for = toSentence(bestForRaw, 'Best for teams with needs that match the current verified feature set.');
  const not_for = toSentence(
    notForRaw,
    'Not for teams that require capabilities not confirmed in current sources.'
  );
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
