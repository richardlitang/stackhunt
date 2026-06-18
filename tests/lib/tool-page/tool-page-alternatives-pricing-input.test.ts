import { describe, expect, it } from 'vitest';
import { buildToolPageAlternativesPricingStateInputFromRoute } from '@/lib/tool-page/alternatives/alternatives-pricing-input';

describe('tool page alternatives pricing input', () => {
  it('maps route fields into alternatives pricing state input', () => {
    const result = buildToolPageAlternativesPricingStateInputFromRoute({
      activeReviewLens: 'startup',
      budgetCostDrivers: ['Per seat'],
      budgetOneTimeFees: ['Onboarding'],
      budgetCommitmentTerms: 'Annual discount',
      budgetRoiThreshold: '2 months',
      toolSpecs: { category: 'project-management' },
      alternativesLabel: 'Alternatives',
      categoryName: 'Project Management',
      toolSlug: 'acme',
      comparableAlternatives: [{ slug: 'beta', name: 'Beta Tool' }],
      category: { slug: 'project-management', name: 'Project Management' },
      orderedAlternatives: [{ slug: 'beta' }],
      canCompareByAlternativeSlug: { beta: true },
    });

    expect(result.pricingInsightsInput.budgetCostDrivers).toEqual(['Per seat']);
    expect(result.activeReviewLens).toBe('startup');
    expect(result.primaryFunctionInput.specs).toEqual({ category: 'project-management' });
    expect(result.alternativesIntroInput).toEqual({
      alternativesLabel: 'Alternatives',
      categoryName: 'Project Management',
    });
    expect(result.compareTeaserInput.toolSlug).toBe('acme');
    expect(result.alternativeCardsInput.canCompareByAlternativeSlug.beta).toBe(true);
  });
});
