import { describe, expect, it } from 'vitest';
import { buildToolPageDecisionRuntimeInput } from '@/lib/tool-page/decision-runtime-input';

describe('tool page decision runtime input', () => {
  it('normalizes route data into decision runtime input shape', () => {
    const result = buildToolPageDecisionRuntimeInput({
      tool: {
        name: 'Acme',
        short_description: 'Short summary',
        long_description: 'Long summary',
        pricing_type: 'paid',
        verdict: 'Default verdict',
        website: 'https://acme.test',
        category: { slug: 'payments' },
      },
      knowledgeCard: { pricing: { starting_price: '$20' } },
      setupTracks: { track: 'onboarding' },
      firstReviewSummaryMarkdown: 'Summary markdown',
      reviewPros: ['Fast setup'],
      reviewCons: ['Needs training'],
      audiences: [{ name: 'Ops teams' }],
      reviewContextSignals: {
        userAdvocate: null,
        budgetAnalyst: null,
        humanVerdict: 'Human verdict',
        decisionSlotsRaw: { best_fit: 'Ops teams' },
        decisionIntroRaw: { what_it_is: 'Short intro' },
        delighters: ['Fast setup'],
        frustrations: ['Needs training'],
        powerTip: null,
        vibe: null,
        originStory: null,
        idealFor: ['Ops teams'],
        avoidIf: ['Large procurement-heavy teams'],
        budgetCostDrivers: [],
        budgetOneTimeFees: [],
        budgetCommitmentTerms: null,
        budgetRoiThreshold: null,
      },
      sectionStatus: {
        pricing: 'show',
        verdict: 'show',
      },
      globalCons: ['Needs training'],
      hasEligibleNegativeEvidence: true,
      renderVerdict: 'Rendered verdict',
    });

    expect(result.tool.category?.slug).toBe('payments');
    expect(result.review.summary_markdown).toBe('Summary markdown');
    expect(result.review.pros).toEqual(['Fast setup']);
    expect(result.reviewContextSignals.humanVerdict).toBe('Human verdict');
    expect(result.sectionStatus.pricing).toBe('show');
    expect(result.hasEligibleNegativeEvidence).toBe(true);
  });
});
