import { describe, expect, it } from 'vitest';
import {
  countToolPageLaneUserSignals,
  readToolPageLaneOutputs,
} from '@/lib/tool-page/lane-outputs';

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
            },
          },
        },
      },
    } as any;

    const laneOutputs = readToolPageLaneOutputs(tool);

    expect(laneOutputs?.subject_profile.subject_key).toBe('acme:copilot');
    expect(laneOutputs?.fact_sheet.official_facts.length).toBe(1);
    expect(laneOutputs?.user_signal_sheet.user_signal_pros.length).toBe(1);
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
});
