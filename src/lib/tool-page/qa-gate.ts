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
  requiresSourceBackedDecisionLayer?: boolean;
  hasSourceBackedMainRiskSignal?: boolean;
  hasSourceBackedUpgradeTriggerSignal?: boolean;
  hasSourceBackedImplementationFrictionSignal?: boolean;
  hasSourceBackedFitMatrixSignal?: boolean;
  hasSourceBackedTestBeforeBuySignal?: boolean;
  hasMalformedDecisionLayerSignal?: boolean;
  hasDuplicatePricingRealitySignal?: boolean;
  hasDuplicateFitMatrixRowsSignal?: boolean;
  hasEnterpriseFitContradictionSignal?: boolean;
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
  /\bbest value threshold\b/i,
  /\bworth it when\b/i,
  /\bplatform access is limited to web-based environments\b/i,
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

  if (input.requiresSourceBackedDecisionLayer) {
    if (!input.hasSourceBackedMainRiskSignal) {
      blockers.push('missing_source_backed_main_risk_signal');
    }
    if (!input.hasSourceBackedUpgradeTriggerSignal) {
      blockers.push('missing_source_backed_upgrade_trigger_signal');
    }
    if (!input.hasSourceBackedImplementationFrictionSignal) {
      blockers.push('missing_source_backed_implementation_friction_signal');
    }
    if (!input.hasSourceBackedFitMatrixSignal) {
      blockers.push('missing_source_backed_fit_matrix_signal');
    }
    if (!input.hasSourceBackedTestBeforeBuySignal) {
      blockers.push('missing_source_backed_test_before_buy_signal');
    }
    if (input.hasMalformedDecisionLayerSignal) {
      blockers.push('malformed_decision_layer_signal');
    }
    if (input.hasDuplicatePricingRealitySignal) {
      blockers.push('duplicate_pricing_reality_signal');
    }
    if (input.hasDuplicateFitMatrixRowsSignal) {
      blockers.push('duplicate_fit_matrix_rows_signal');
    }
    if (input.hasEnterpriseFitContradictionSignal) {
      blockers.push('enterprise_fit_contradiction_signal');
    }
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
