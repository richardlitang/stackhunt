import { describe, expect, it } from 'vitest';
import { deriveToolPageReviewContextSignals } from '@/lib/tool-page/review-context';

describe('tool page review context signals', () => {
  it('extracts normalized narrative and budget fields from review context payload', () => {
    const result = deriveToolPageReviewContextSignals({
      reviewContext: {
        user_advocate: {
          delighters: ['Fast setup'],
          frustrations: ['No offline mode'],
          power_tip: 'Start with templates',
          ideal_for: ['Small teams'],
          avoid_if: ['Needs offline'],
        },
        budget_analyst: {
          cost_drivers: ['Seats'],
          one_time_fees: ['Migration'],
          commitment_terms: 'Annual',
        },
        human_verdict: 'Good fit',
        decision_slots: { best_when: ['A'] },
        decision_intro: { summary: 'B' },
      },
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
            paid_needed_when: 'Upgrade when approval controls are needed.',
            hidden_cost_triggers: [],
            main_cost_drivers: ['Active seats'],
            generation_mode: {
              paid_needed_when: 'deterministic',
              main_cost_drivers: 'deterministic',
            },
          },
        },
        user_signal_sheet: {
          user_signal_pros: [],
          user_signal_cons: [],
        },
        editorial_decision: {
          summary: 'Operational summary',
          best_for: 'Teams with owner-led rollout workflows.',
          not_for: 'Teams needing offline-first operations.',
          main_tradeoff: 'Faster setup, tighter plan boundaries.',
          human_verdict: 'Lane verdict',
          generation_mode: {
            summary: 'deterministic',
            best_for: 'deterministic',
            not_for: 'deterministic',
            main_tradeoff: 'deterministic',
          },
        },
      },
    });

    expect(result.delighters).toEqual(['Fast setup']);
    expect(result.frustrations).toEqual(['No offline mode']);
    expect(result.idealFor).toEqual(['Teams with owner-led rollout workflows.', 'Small teams']);
    expect(result.avoidIf).toEqual(['Teams needing offline-first operations.', 'Needs offline']);
    expect(result.budgetCostDrivers).toEqual(['Active seats', 'Seats']);
    expect(result.budgetOneTimeFees).toEqual(['Migration']);
    expect(result.humanVerdict).toBe('Lane verdict');
    expect(result.decisionSlotsRaw).toBeTruthy();
    expect(result.decisionIntroRaw).toBeTruthy();
    expect(result.budgetRoiThreshold).toBe('Upgrade when approval controls are needed.');
  });
});
