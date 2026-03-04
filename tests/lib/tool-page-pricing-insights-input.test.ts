import { describe, expect, it } from 'vitest';
import { buildToolPagePricingInsightsBudgetAnalyst } from '@/lib/tool-page/pricing-insights-input';

describe('tool page pricing insights input', () => {
  it('returns undefined when there is no budget analyst data', () => {
    expect(
      buildToolPagePricingInsightsBudgetAnalyst({
        budgetCostDrivers: [],
        budgetOneTimeFees: [],
        budgetCommitmentTerms: null,
        budgetRoiThreshold: null,
      })
    ).toBeUndefined();
  });

  it('returns normalized budget analyst shape when values exist', () => {
    expect(
      buildToolPagePricingInsightsBudgetAnalyst({
        budgetCostDrivers: ['Seats'],
        budgetOneTimeFees: ['Onboarding fee'],
        budgetCommitmentTerms: 'Annual',
        budgetRoiThreshold: 'After 10 active users',
      })
    ).toEqual({
      costDrivers: ['Seats'],
      oneTimeFees: ['Onboarding fee'],
      commitmentTerms: 'Annual',
      roiThreshold: 'After 10 active users',
    });
  });
});
