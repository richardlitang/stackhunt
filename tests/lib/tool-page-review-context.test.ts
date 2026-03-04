import { describe, expect, it } from 'vitest';
import { deriveToolPageReviewContextSignals } from '@/lib/tool-page-review-context';

describe('tool page review context signals', () => {
  it('extracts normalized narrative and budget fields from review context payload', () => {
    const result = deriveToolPageReviewContextSignals({
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
    });

    expect(result.delighters).toEqual(['Fast setup']);
    expect(result.frustrations).toEqual(['No offline mode']);
    expect(result.idealFor).toEqual(['Small teams']);
    expect(result.avoidIf).toEqual(['Needs offline']);
    expect(result.budgetCostDrivers).toEqual(['Seats']);
    expect(result.budgetOneTimeFees).toEqual(['Migration']);
    expect(result.humanVerdict).toBe('Good fit');
    expect(result.decisionSlotsRaw).toBeTruthy();
    expect(result.decisionIntroRaw).toBeTruthy();
  });
});
