export interface ToolPageQaGateInput {
  title: string;
  h1: string;
  intro: string;
  verdict: string;
  evaluationDepth: 'docs_only' | 'hands_on';
  pricingSectionVisible: boolean;
  hasPricingCheckedProof: boolean;
  schemaMatchesVisibleContent: boolean;
  hasBestForSignal?: boolean;
  hasNotForSignal?: boolean;
  hasTradeoffSignal?: boolean;
  hasDecisionSummaryBlock?: boolean;
  introLooksSpecSheet?: boolean;
}

export interface ToolPageQaGateResult {
  pass: boolean;
  blockers: string[];
}

const GENERIC_COPY_PATTERNS = [
  /\brobust and powerful solution\b/i,
  /\bworth shortlisting\b/i,
  /\bbest-in-class capabilities?\b/i,
  /\bgreat for teams?\b/i,
  /\bclear tool guidance\b/i,
];

function isReviewTitle(title: string): boolean {
  return /\breview\b/i.test(title);
}

function isReviewHeading(h1: string): boolean {
  return /\breview\b/i.test(h1);
}

function isCompareHeading(h1: string): boolean {
  return /\b(vs\.?|versus|compare)\b/i.test(h1);
}

function hasGenericVerdictPhrase(intro: string, verdict: string): boolean {
  const content = `${intro} ${verdict}`;
  return GENERIC_COPY_PATTERNS.some((pattern) => pattern.test(content));
}

export function evaluateToolPageQaGate(input: ToolPageQaGateInput): ToolPageQaGateResult {
  const blockers: string[] = [];

  if (isReviewTitle(input.title) && isCompareHeading(input.h1)) {
    blockers.push('intent_mismatch:title_review_h1_compare');
  }

  if (isReviewTitle(input.title) && !isReviewHeading(input.h1)) {
    blockers.push('intent_mismatch:h1_missing_review_intent');
  }

  if (hasGenericVerdictPhrase(input.intro, input.verdict)) {
    blockers.push('generic_verdict_phrase_detected');
  }

  if (input.hasBestForSignal === false) {
    blockers.push('missing_best_for_signal');
  }

  if (input.hasNotForSignal === false) {
    blockers.push('missing_not_for_signal');
  }

  if (input.hasTradeoffSignal === false) {
    blockers.push('missing_tradeoff_signal');
  }

  if (input.hasDecisionSummaryBlock === false) {
    blockers.push('missing_decision_summary_block');
  }

  if (input.introLooksSpecSheet) {
    blockers.push('spec_sheet_intro_pattern_detected');
  }

  if (input.pricingSectionVisible && !input.hasPricingCheckedProof) {
    blockers.push('pricing_visible_without_checked_proof');
  }

  if (!input.schemaMatchesVisibleContent) {
    blockers.push('schema_visible_content_mismatch');
  }

  return {
    pass: blockers.length === 0,
    blockers,
  };
}
