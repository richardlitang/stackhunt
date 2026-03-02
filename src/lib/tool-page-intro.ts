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

function cleanText(value: string): string {
  return value
    .replace(/\s+/g, ' ')
    .replace(HEDGING_PREFIX, '')
    .replace(/[.:;!?]+$/, '')
    .trim();
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

export function generateDecisionEvidence(
  pros: ClaimEvidenceLike[],
  cons: ClaimEvidenceLike[]
): DecisionEvidence {
  const bestFor = normalizeEvidenceClaim(pros[0]);
  const notFor = normalizeEvidenceClaim(cons[0]);
  const tradeoff = normalizeEvidenceClaim(cons[1] || cons[0] || pros[0]);
  return {
    ...(bestFor ? { best_for_reason: bestFor } : {}),
    ...(notFor ? { not_for_reason: notFor } : {}),
    ...(tradeoff ? { tradeoff_reason: tradeoff } : {}),
  };
}

export function generateDecisionIntro(input: DecisionIntroInput): DecisionIntro {
  const firstPro = input.pros.find((value) => typeof value === 'string' && value.trim().length > 8) || '';
  const firstCon = input.cons.find((value) => typeof value === 'string' && value.trim().length > 8) || '';
  const whatItIsRaw =
    typeof input.shortDescription === 'string' && input.shortDescription.trim().length >= 20
      ? input.shortDescription
      : `${input.toolName} is covered here as a software buying decision.`;
  const bestForRaw =
    firstPro.length > 0
      ? `Best for teams that need ${cleanText(firstPro)}`
      : 'Best for teams with needs that match the current verified feature set';
  const notForRaw =
    firstCon.length > 0
      ? `Not for teams that need to avoid ${cleanText(firstCon)}`
      : 'Not for teams that require capabilities not confirmed in current sources';
  const tradeoffRaw =
    firstPro.length > 0 && firstCon.length > 0
      ? `Main tradeoff: stronger fit when ${cleanText(firstPro)}, but higher risk when ${cleanText(firstCon)}`
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
