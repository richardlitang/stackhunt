import { describe, expect, it } from 'vitest';
import { evaluateToolPageQaGate } from '@/lib/tool-page/qa-gate';

describe('tool page qa gate', () => {
  it('passes for valid review page input', () => {
    const result = evaluateToolPageQaGate({
      title:
        'GitHub Copilot Review (2026): Pricing, Best For, Tradeoffs & Alternatives | StackHunt',
      h1: 'GitHub Copilot Review',
      intro: 'GitHub Copilot is an AI coding assistant for teams using GitHub workflows.',
      verdict:
        'Best for teams already standardized on GitHub. Skip if lowest-cost flexibility across non-GitHub workflows is critical.',
      evaluationDepth: 'docs_only',
      pricingSectionVisible: true,
      hasPricingCheckedProof: true,
      schemaMatchesVisibleContent: true,
      hasBestForSignal: true,
      hasNotForSignal: true,
      hasTradeoffSignal: true,
      hasDecisionSummaryBlock: true,
      introLooksSpecSheet: false,
      requiresSourceBackedDecisionLayer: true,
      hasSourceBackedMainRiskSignal: true,
      hasSourceBackedUpgradeTriggerSignal: true,
      hasSourceBackedImplementationFrictionSignal: true,
      hasSourceBackedFitMatrixSignal: true,
      hasSourceBackedTestBeforeBuySignal: true,
    });

    expect(result.pass).toBe(true);
    expect(result.blockers).toEqual([]);
  });

  it('fails on title and h1 intent mismatch', () => {
    const result = evaluateToolPageQaGate({
      title: 'GitHub Copilot Review (2026): Pricing, Best For & Tradeoffs | StackHunt',
      h1: 'GitHub Copilot vs Cursor',
      intro: 'This page helps decide whether to use GitHub Copilot.',
      verdict: 'Best for GitHub-native teams.',
      evaluationDepth: 'docs_only',
      pricingSectionVisible: false,
      hasPricingCheckedProof: false,
      schemaMatchesVisibleContent: true,
    });

    expect(result.pass).toBe(false);
    expect(result.blockers).toContain('intent_mismatch:title_review_h1_compare');
  });

  it('fails on generic verdict phrase', () => {
    const result = evaluateToolPageQaGate({
      title: 'Tool X Review (2026) | StackHunt',
      h1: 'Tool X Review',
      intro: 'Tool X is a robust and powerful solution for modern teams.',
      verdict: 'Tool X is worth shortlisting with caveats.',
      evaluationDepth: 'docs_only',
      pricingSectionVisible: false,
      hasPricingCheckedProof: false,
      schemaMatchesVisibleContent: true,
    });

    expect(result.pass).toBe(false);
    expect(result.blockers).toContain('generic_verdict_phrase_detected');
  });

  it('fails when pricing is visible without checked proof', () => {
    const result = evaluateToolPageQaGate({
      title: 'Tool Y Review (2026) | StackHunt',
      h1: 'Tool Y Review',
      intro: 'Tool Y helps teams automate repetitive work.',
      verdict: 'Best for teams with moderate automation needs.',
      evaluationDepth: 'docs_only',
      pricingSectionVisible: true,
      hasPricingCheckedProof: false,
      schemaMatchesVisibleContent: true,
    });

    expect(result.pass).toBe(false);
    expect(result.blockers).toContain('pricing_visible_without_checked_proof');
  });

  it('fails when schema does not match visible content', () => {
    const result = evaluateToolPageQaGate({
      title: 'Tool Z Review (2026) | StackHunt',
      h1: 'Tool Z Review',
      intro: 'Tool Z supports support-team workflows with routing automation.',
      verdict: 'Best for support teams that need configurable routing.',
      evaluationDepth: 'docs_only',
      pricingSectionVisible: false,
      hasPricingCheckedProof: false,
      schemaMatchesVisibleContent: false,
    });

    expect(result.pass).toBe(false);
    expect(result.blockers).toContain('schema_visible_content_mismatch');
  });

  it('fails when decision signals are missing', () => {
    const result = evaluateToolPageQaGate({
      title: 'Tool Q Review (2026) | StackHunt',
      h1: 'Tool Q Review',
      intro: 'Tool Q helps small teams centralize product feedback.',
      verdict: 'Best for lightweight collaboration, but limits appear at scale.',
      evaluationDepth: 'docs_only',
      pricingSectionVisible: false,
      hasPricingCheckedProof: false,
      schemaMatchesVisibleContent: true,
      hasBestForSignal: false,
      hasNotForSignal: false,
      hasTradeoffSignal: false,
    });

    expect(result.pass).toBe(false);
    expect(result.blockers).toContain('missing_best_for_signal');
    expect(result.blockers).toContain('missing_not_for_signal');
    expect(result.blockers).toContain('missing_tradeoff_signal');
  });

  it('fails when intro looks like a spec sheet block', () => {
    const result = evaluateToolPageQaGate({
      title: 'Tool R Review (2026) | StackHunt',
      h1: 'Tool R Review',
      intro: 'Tool R across pricing, fit, and rollout risk.',
      verdict: 'Best for teams with light process and clear ownership.',
      evaluationDepth: 'docs_only',
      pricingSectionVisible: false,
      hasPricingCheckedProof: false,
      schemaMatchesVisibleContent: true,
      hasBestForSignal: true,
      hasNotForSignal: true,
      hasTradeoffSignal: true,
      hasDecisionSummaryBlock: false,
      introLooksSpecSheet: true,
    });

    expect(result.pass).toBe(false);
    expect(result.blockers).toContain('missing_decision_summary_block');
    expect(result.blockers).toContain('spec_sheet_intro_pattern_detected');
  });

  it('fails when source-backed decision signals are required but missing', () => {
    const result = evaluateToolPageQaGate({
      title: 'Tool S Review (2026) | StackHunt',
      h1: 'Tool S Review',
      intro: 'Tool S helps teams align approvals and spending policies.',
      verdict: 'Best for teams with strong approval controls.',
      evaluationDepth: 'docs_only',
      pricingSectionVisible: false,
      hasPricingCheckedProof: false,
      schemaMatchesVisibleContent: true,
      hasBestForSignal: true,
      hasNotForSignal: true,
      hasTradeoffSignal: true,
      hasDecisionSummaryBlock: true,
      introLooksSpecSheet: false,
      requiresSourceBackedDecisionLayer: true,
      hasSourceBackedMainRiskSignal: false,
      hasSourceBackedUpgradeTriggerSignal: false,
      hasSourceBackedImplementationFrictionSignal: false,
      hasSourceBackedFitMatrixSignal: false,
      hasSourceBackedTestBeforeBuySignal: false,
    });

    expect(result.pass).toBe(false);
    expect(result.blockers).toContain('missing_source_backed_main_risk_signal');
    expect(result.blockers).toContain('missing_source_backed_upgrade_trigger_signal');
    expect(result.blockers).toContain('missing_source_backed_implementation_friction_signal');
    expect(result.blockers).toContain('missing_source_backed_fit_matrix_signal');
    expect(result.blockers).toContain('missing_source_backed_test_before_buy_signal');
  });

  it('fails when decision-layer consistency signals show malformed or contradictory content', () => {
    const result = evaluateToolPageQaGate({
      title: 'Tool T Review (2026) | StackHunt',
      h1: 'Tool T Review',
      intro: 'Tool T helps teams route approvals and controls.',
      verdict: 'Best for approval-heavy teams.',
      evaluationDepth: 'docs_only',
      pricingSectionVisible: true,
      hasPricingCheckedProof: true,
      schemaMatchesVisibleContent: true,
      hasBestForSignal: true,
      hasNotForSignal: true,
      hasTradeoffSignal: true,
      hasDecisionSummaryBlock: true,
      introLooksSpecSheet: false,
      requiresSourceBackedDecisionLayer: true,
      hasSourceBackedMainRiskSignal: true,
      hasSourceBackedUpgradeTriggerSignal: true,
      hasSourceBackedImplementationFrictionSignal: true,
      hasSourceBackedFitMatrixSignal: true,
      hasSourceBackedTestBeforeBuySignal: true,
      hasMalformedDecisionLayerSignal: true,
      hasDuplicatePricingRealitySignal: true,
      hasDuplicateFitMatrixRowsSignal: true,
    });

    expect(result.pass).toBe(false);
    expect(result.blockers).toContain('malformed_decision_layer_signal');
    expect(result.blockers).toContain('duplicate_pricing_reality_signal');
    expect(result.blockers).toContain('duplicate_fit_matrix_rows_signal');
  });
});
