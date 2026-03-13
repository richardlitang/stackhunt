import { describe, expect, it } from 'vitest';
import { buildToolPageSpecsCategoryRouteState } from '@/lib/tool-page/specs-category-route-state';

describe('tool page specs category route state', () => {
  it('builds specs signals and category ref together', () => {
    const result = buildToolPageSpecsCategoryRouteState({
      specs: {
        user_signal_summary: {
          community_pros: 3,
          community_cons: 2,
        },
        canonical: {
          quality: {
            pricing_lens_coverage: { startup: 2 },
            constraints_lens_coverage: { startup: 1 },
            integrations_lens_coverage: { startup: 4 },
          },
        },
      },
      userReportedPros: [{ text: 'Easy onboarding', source_type: 'community' }],
      userReportedCons: [{ text: 'Pricing rises quickly', source_type: 'community' }],
      activeReviewLens: 'startup',
      category: {
        slug: 'project-management',
        name: 'Project Management',
      },
    });

    expect(result.userSignalSummary?.community_pros).toBe(3);
    expect(result.activeLensPricingPlanCount).toBe(2);
    expect(result.toolCategoryRef.slug).toBe('project-management');
  });
});
