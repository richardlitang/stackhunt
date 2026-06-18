import { describe, expect, it } from 'vitest';
import { deriveToolPageDecisionLayerConsistencySignals } from '@/lib/tool-page/decision/decision-layer-consistency-signals';

describe('tool page decision layer consistency signals', () => {
  it('detects malformed and duplicate lane signals', () => {
    const result = deriveToolPageDecisionLayerConsistencySignals({
      decisionSnapshotBestWhen: ['That need enterprise controls without setup ownership'],
      decisionSnapshotWatchOuts: [],
      decisionTradeoffSummary: null,
      laneOutputs: {
        subject_profile: {
          subject_type: 'product',
          subject_key: 'acme:core',
          display_name: 'Acme',
          entity_scope: 'core',
          confidence: 'high',
        },
        fact_sheet: {
          official_facts: [
            {
              text: 'Enterprise plan includes SSO and SCIM controls.',
              source_type: 'official',
              source_url: 'https://example.com/security',
              checked_at: '2026-03-20',
            },
          ],
          official_pricing_facts: [],
          official_limit_facts: [],
          pricing_reality: {
            free_works_if: 'Free for pilot workflows',
            paid_needed_when: 'Free for pilot workflows',
            hidden_cost_triggers: [],
            main_cost_drivers: [],
          },
        },
        user_signal_sheet: {
          user_signal_pros: [],
          user_signal_cons: [],
        },
        editorial_decision: {
          summary: null,
          best_for: null,
          not_for: null,
          main_tradeoff: null,
          human_verdict: null,
          main_risk: null,
          upgrade_trigger: null,
          implementation_friction_level: null,
          implementation_friction_drivers: [],
          implementation_friction_stakeholders: [],
          fit_matrix: {
            solo: { fit: 'mixed', reason: 'Same reason', caveat: 'Same caveat' },
            startup: { fit: 'mixed', reason: 'Same reason', caveat: 'Same caveat' },
            mid_market: null,
            enterprise: { fit: 'weak', reason: 'Same reason', caveat: 'Same caveat' },
          },
          test_before_buy: [],
          alternatives_rebuttals: [],
        },
      },
    });

    expect(result.hasMalformedDecisionLayerSignal).toBe(true);
    expect(result.hasDuplicatePricingRealitySignal).toBe(true);
    expect(result.hasDuplicateFitMatrixRowsSignal).toBe(true);
    expect(result.hasEnterpriseFitContradictionSignal).toBe(true);
    expect(result.hasUnsupportedGenerationModeSignal).toBe(false);
  });

  it('flags unsupported llm-only generation mode for critical decision fields', () => {
    const result = deriveToolPageDecisionLayerConsistencySignals({
      decisionSnapshotBestWhen: [],
      decisionSnapshotWatchOuts: [],
      decisionTradeoffSummary: null,
      laneOutputs: {
        subject_profile: {
          subject_type: 'product',
          subject_key: 'acme:core',
          display_name: 'Acme',
          entity_scope: 'core',
          confidence: 'high',
        },
        fact_sheet: {
          official_facts: [],
          official_pricing_facts: [],
          official_limit_facts: [],
          pricing_reality: {
            free_works_if: null,
            paid_needed_when: 'Paid starts when limits hit.',
            hidden_cost_triggers: [],
            main_cost_drivers: [],
            generation_mode: {
              paid_needed_when: 'llm_phrase_only',
            },
          },
        },
        user_signal_sheet: {
          user_signal_pros: [],
          user_signal_cons: [],
        },
        editorial_decision: {
          summary: null,
          best_for: null,
          not_for: null,
          main_tradeoff: null,
          human_verdict: null,
          main_risk: 'Risk depends on unclear wording.',
          upgrade_trigger: null,
          implementation_friction_level: null,
          implementation_friction_drivers: [],
          implementation_friction_stakeholders: [],
          fit_matrix: null,
          test_before_buy: [],
          alternatives_rebuttals: [],
          generation_mode: {
            main_risk: 'llm_phrase_only',
          },
        },
      },
    });

    expect(result.hasUnsupportedGenerationModeSignal).toBe(true);
  });

  it('flags unsupported llm-only generation mode across decision and pricing arrays', () => {
    const result = deriveToolPageDecisionLayerConsistencySignals({
      decisionSnapshotBestWhen: [],
      decisionSnapshotWatchOuts: [],
      decisionTradeoffSummary: null,
      laneOutputs: {
        subject_profile: {
          subject_type: 'product',
          subject_key: 'acme:core',
          display_name: 'Acme',
          entity_scope: 'core',
          confidence: 'high',
        },
        fact_sheet: {
          official_facts: [],
          official_pricing_facts: [],
          official_limit_facts: [],
          pricing_reality: {
            free_works_if: null,
            paid_needed_when: null,
            hidden_cost_triggers: ['Overages kick in after threshold'],
            main_cost_drivers: ['Per-seat billing'],
            generation_mode: {
              hidden_cost_triggers: 'llm_phrase_only',
              main_cost_drivers: 'llm_phrase_only',
            },
          },
        },
        user_signal_sheet: {
          user_signal_pros: [],
          user_signal_cons: [],
        },
        editorial_decision: {
          summary: null,
          best_for: 'Teams needing strict governance',
          not_for: 'Teams requiring offline-first support',
          main_tradeoff: 'Faster setup, less customization',
          human_verdict: null,
          main_risk: null,
          upgrade_trigger: null,
          implementation_friction_level: null,
          implementation_friction_drivers: [],
          implementation_friction_stakeholders: [],
          fit_matrix: {
            solo: { fit: 'mixed', reason: 'Heavy setup', caveat: 'Policy overhead' },
            startup: null,
            mid_market: null,
            enterprise: null,
          },
          test_before_buy: [],
          alternatives_rebuttals: [],
          generation_mode: {
            best_for: 'llm_phrase_only',
            not_for: 'llm_phrase_only',
            main_tradeoff: 'llm_phrase_only',
            fit_matrix: 'llm_phrase_only',
          },
        },
      },
    });

    expect(result.hasUnsupportedGenerationModeSignal).toBe(true);
  });
});
