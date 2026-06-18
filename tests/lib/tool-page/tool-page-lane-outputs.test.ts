import { describe, expect, it } from 'vitest';
import {
  countToolPageLaneUserSignals,
  readToolPageLaneOutputs,
} from '@/lib/tool-page/decision/lane-outputs';

describe('tool page lane outputs', () => {
  it('reads canonical lane outputs from tool specs', () => {
    const tool = {
      name: 'Acme',
      specs: {
        canonical: {
          entity_first_lane_outputs: {
            subject_profile: {
              subject_type: 'product_surface',
              subject_key: 'acme:copilot',
              display_name: 'Acme Copilot',
              entity_scope: 'copilot',
              confidence: 'high',
            },
            fact_sheet: {
              official_facts: [{ text: 'Official docs confirm SSO.' }],
              official_pricing_facts: [{ text: 'Pricing starts at $19.' }],
              official_limit_facts: [{ text: 'Seat cap applies on starter plan.' }],
              pricing_reality: {
                free_works_if: 'Free works for single-team pilots.',
                paid_needed_when: 'Paid needed for approvals and automation.',
                hidden_cost_triggers: ['Seat growth past pilot threshold.'],
                main_cost_drivers: ['Per-seat pricing and admin controls.'],
              },
            },
            user_signal_sheet: {
              user_signal_pros: [{ text: 'Users report fast onboarding.' }],
              user_signal_cons: [{ text: 'Users report billing confusion.' }],
            },
            editorial_decision: {
              summary: 'Good for fast-moving teams.',
              best_for: 'Small teams',
              not_for: 'Heavy compliance orgs',
              main_tradeoff: 'Speed versus controls',
              human_verdict: 'Strong shortlist',
              main_risk: 'Approval depth is plan-gated.',
              upgrade_trigger: 'Upgrade when automation depth is required.',
              implementation_friction_level: 'medium',
              implementation_friction_drivers: ['Role mapping', 'Approval routing'],
              implementation_friction_stakeholders: ['operations', 'finance'],
              fit_matrix: {
                solo: {
                  fit: 'mixed',
                  caveat: 'Admin overhead grows quickly.',
                  reason: 'Fast setup for one owner.',
                },
                startup: null,
                mid_market: null,
                enterprise: null,
              },
              test_before_buy: [
                {
                  name: 'Daily workflow test',
                  why_it_matters: 'Validate operator throughput.',
                  test: 'Run a complete workflow from intake to outcome.',
                  pass_condition: 'No blocked step on required plan.',
                  common_failure: 'Automation feature is gated.',
                },
              ],
              alternatives_rebuttals: [
                {
                  slug: 'budgetflow',
                  tool_name: 'BudgetFlow',
                  choose_instead_if: 'Budget is fixed and strict',
                  differentiator: 'cheaper_at_scale',
                  confidence: 'high',
                },
              ],
            },
          },
        },
      },
    } as any;

    const laneOutputs = readToolPageLaneOutputs(tool);

    expect(laneOutputs?.subject_profile.subject_key).toBe('acme:copilot');
    expect(laneOutputs?.fact_sheet.official_facts.length).toBe(1);
    expect(laneOutputs?.user_signal_sheet.user_signal_pros.length).toBe(1);
    expect(laneOutputs?.fact_sheet.pricing_reality?.paid_needed_when).toContain('Paid needed');
    expect(laneOutputs?.editorial_decision.main_risk).toContain('plan-gated');
    expect(laneOutputs?.editorial_decision.implementation_friction_drivers?.length).toBe(2);
    expect(laneOutputs?.editorial_decision.implementation_friction_stakeholders?.[0]).toBe(
      'operations'
    );
    expect(laneOutputs?.editorial_decision.fit_matrix?.solo?.fit).toBe('mixed');
    expect(laneOutputs?.editorial_decision.test_before_buy?.[0]?.name).toBe('Daily workflow test');
    expect(laneOutputs?.editorial_decision.alternatives_rebuttals?.[0]?.differentiator).toBe(
      'cheaper_at_scale'
    );
    expect(countToolPageLaneUserSignals(laneOutputs)).toBe(2);
  });

  it('returns null when lane outputs are absent', () => {
    const tool = {
      name: 'Acme',
      specs: {},
    } as any;

    const laneOutputs = readToolPageLaneOutputs(tool);
    expect(laneOutputs).toBeNull();
    expect(countToolPageLaneUserSignals(laneOutputs)).toBe(0);
  });

  it('normalizes malformed subject profile fields from persisted lane payloads', () => {
    const tool = {
      name: 'Acme',
      specs: {
        canonical: {
          entity_first_lane_outputs: {
            subject_profile: {
              subject_type: 'unsupported_subject',
              subject_key: 'acme:unknown',
              display_name: 'Acme Unknown',
              entity_scope: 'enterprise cloud',
              confidence: 'confident',
            },
            fact_sheet: {
              official_facts: [],
              official_pricing_facts: [],
              official_limit_facts: [],
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
            },
          },
        },
      },
    } as any;

    const laneOutputs = readToolPageLaneOutputs(tool);
    expect(laneOutputs?.subject_profile.subject_type).toBe('product');
    expect(laneOutputs?.subject_profile.entity_scope).toBe('enterprise_cloud');
    expect(laneOutputs?.subject_profile.confidence).toBe('medium');
  });

  it('suppresses subjective pricing-reality strings without operational signals', () => {
    const tool = {
      name: 'Acme',
      specs: {
        canonical: {
          entity_first_lane_outputs: {
            subject_profile: {
              subject_type: 'product',
              subject_key: 'acme:core',
              display_name: 'Acme',
              confidence: 'high',
            },
            fact_sheet: {
              official_facts: [],
              official_pricing_facts: [],
              official_limit_facts: [],
              pricing_reality: {
                free_works_if: 'Great value for everyone.',
                paid_needed_when: 'Upgrade at 10 seats for SSO and audit logs.',
                hidden_cost_triggers: [
                  'Amazing premium support.',
                  'Annual contract required for enterprise tier.',
                ],
                main_cost_drivers: ['Best value', 'Per-seat monthly pricing above 20 users.'],
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
            },
          },
        },
      },
    } as any;

    const laneOutputs = readToolPageLaneOutputs(tool);
    expect(laneOutputs?.fact_sheet.pricing_reality?.free_works_if).toBeNull();
    expect(laneOutputs?.fact_sheet.pricing_reality?.paid_needed_when).toContain('10 seats');
    expect(laneOutputs?.fact_sheet.pricing_reality?.hidden_cost_triggers).toEqual([
      'Annual contract required for enterprise tier.',
    ]);
    expect(laneOutputs?.fact_sheet.pricing_reality?.main_cost_drivers).toEqual([
      'Per-seat monthly pricing above 20 users.',
    ]);
  });

  it('suppresses solo/startup fit rows that only carry enterprise caveats', () => {
    const tool = {
      name: 'Acme',
      specs: {
        canonical: {
          entity_first_lane_outputs: {
            subject_profile: {
              subject_type: 'product',
              subject_key: 'acme:core',
              display_name: 'Acme',
              confidence: 'high',
            },
            fact_sheet: {
              official_facts: [],
              official_pricing_facts: [],
              official_limit_facts: [],
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
              fit_matrix: {
                solo: {
                  fit: 'mixed',
                  caveat: 'Enterprise SSO and procurement review are required.',
                  reason: 'Simple setup otherwise.',
                },
                startup: {
                  fit: 'weak',
                  caveat: 'SOC2 governance controls are required.',
                  reason: 'Can be heavy for small teams.',
                },
                mid_market: null,
                enterprise: null,
              },
            },
          },
        },
      },
    } as any;

    const laneOutputs = readToolPageLaneOutputs(tool);
    expect(laneOutputs?.editorial_decision.fit_matrix?.solo).toBeNull();
    expect(laneOutputs?.editorial_decision.fit_matrix?.startup).toBeNull();
  });
});
