import { describe, expect, it } from 'vitest';
import { deriveToolPageDecisionLayerConsistencySignals } from '@/lib/tool-page/decision-layer-consistency-signals';

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
  });
});
