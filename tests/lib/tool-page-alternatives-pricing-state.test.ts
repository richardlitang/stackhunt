import { describe, expect, it } from 'vitest';
import {
  buildToolPageAlternativesPricingState,
  buildToolPageAlternativesPricingStateFromRoute,
} from '@/lib/tool-page/alternatives-pricing-state';

describe('tool page alternatives pricing state', () => {
  it('builds alternatives and pricing intro state together', () => {
    const state = buildToolPageAlternativesPricingState({
      activeReviewLens: 'startup',
      pricingInsightsInput: {
        budgetCostDrivers: ['Per-seat pricing'],
        budgetOneTimeFees: ['Setup fee'],
        budgetCommitmentTerms: 'Annual contract',
        budgetRoiThreshold: '20 hours saved/month',
      },
      primaryFunctionInput: {
        specs: { taxonomy: { primary_function: 'project management' } },
      },
      alternativesIntroInput: {
        alternativesLabel: 'Alternatives',
        categoryName: 'Project Management',
      },
      compareTeaserInput: {
        toolSlug: 'acme',
        alternatives: [
          { slug: 'beta', name: 'Beta' },
          { slug: 'gamma', name: 'Gamma' },
        ],
      },
      alternativesSectionInput: {
        category: { slug: 'project-management', name: 'Project Management' },
      },
      alternativeCardsInput: {
        alternatives: [
          {
            slug: 'beta',
            name: 'Beta',
            logo_url: null,
            short_description: 'Alternative beta',
            pricing_type: 'Freemium',
            avg_score: 4.2,
            item_category_links: [{ relevance_score: 0.8 }],
          },
        ],
        canCompareByAlternativeSlug: () => true,
      },
    });

    expect(state.pricingInsightsBudgetAnalyst?.costDrivers).toContain('Per-seat pricing');
    expect(state.primaryFunction).toContain('project management');
    expect(state.alternativesIntroText).toContain('tools to consider');
    expect(state.compareTeaserLinks.length).toBe(2);
    expect(state.alternativesSectionState.viewAllHref).toBe('/categories/project-management');
    expect(state.alternativeCardsView.length).toBe(1);
  });

  it('builds alternatives pricing state from route-level fields', () => {
    const state = buildToolPageAlternativesPricingStateFromRoute({
      activeReviewLens: 'startup',
      budgetCostDrivers: ['Per-seat pricing'],
      budgetOneTimeFees: ['Setup fee'],
      budgetCommitmentTerms: 'Annual contract',
      budgetRoiThreshold: '20 hours saved/month',
      toolSpecs: { taxonomy: { primary_function: 'project management' } },
      alternativesLabel: 'Alternatives',
      categoryName: 'Project Management',
      toolSlug: 'acme',
      comparableAlternatives: [{ slug: 'beta', name: 'Beta' }],
      category: { slug: 'project-management', name: 'Project Management' },
      orderedAlternatives: [
        {
          slug: 'beta',
          name: 'Beta',
          logo_url: null,
          short_description: 'Alternative beta',
          pricing_type: 'Freemium',
          avg_score: 4.2,
          item_category_links: [{ relevance_score: 0.8 }],
        },
      ],
      canCompareByAlternativeSlug: { beta: true },
    });

    expect(state.compareTeaserLinks.length).toBe(1);
    expect(state.alternativeCardsView.length).toBe(1);
    expect(state.alternativesSectionState.viewAllHref).toBe('/categories/project-management');
  });

  it('prioritizes alternatives based on active lens', () => {
    const state = buildToolPageAlternativesPricingState({
      activeReviewLens: 'enterprise',
      pricingInsightsInput: {
        budgetCostDrivers: [],
        budgetOneTimeFees: [],
        budgetCommitmentTerms: null,
        budgetRoiThreshold: null,
      },
      primaryFunctionInput: { specs: null },
      alternativesIntroInput: {
        alternativesLabel: 'Alternatives',
        categoryName: 'CRM',
      },
      compareTeaserInput: {
        toolSlug: 'acme',
        alternatives: [],
      },
      alternativesSectionInput: {
        category: { slug: 'crm-sales', name: 'CRM' },
      },
      alternativeCardsInput: {
        alternatives: [
          {
            slug: 'starter',
            name: 'Starter CRM',
            pricing_type: 'freemium',
            metadata: { target_market: 'consumer' },
            specs: { pricing_data: { plans: [{ target_audience: 'individual' }] } },
          },
          {
            slug: 'enterprise',
            name: 'Enterprise CRM',
            pricing_type: 'enterprise',
            metadata: { target_market: 'enterprise' },
            specs: { pricing_data: { plans: [{ target_audience: 'enterprise' }] } },
          },
        ],
        canCompareByAlternativeSlug: { starter: true, enterprise: true },
      },
    });

    expect(state.alternativeCardsView[0]?.alt.slug).toBe('enterprise');
  });
});
