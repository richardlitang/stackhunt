import { describe, expect, it } from 'vitest';
import { buildToolPageSpecsSignals } from '@/lib/tool-page/specs-signals';

describe('tool page specs signals', () => {
  it('prefers top user-reported claims from explicit user signal lanes', () => {
    const result = buildToolPageSpecsSignals({
      specs: {
        user_signal_summary: {
          top_user_reported_claims: [{ text: 'Fallback summary claim', source_type: 'community' }],
          community_pros: 1,
          community_cons: 1,
        },
      },
      userReportedPros: [
        {
          text: 'Users report quick onboarding when templates are prepared.',
          source_type: 'community',
          source_domain: 'reddit.com',
        },
      ],
      userReportedCons: [],
      activeReviewLens: 'general',
    });

    expect(result.topUserReportedClaims[0]?.text).toContain('quick onboarding');
    expect(result.communityProsCount).toBe(1);
    expect(result.communityConsCount).toBe(1);
    expect(result.activeLensPricingPlanCount).toBeNull();
  });

  it('derives active lens coverage counts from canonical quality coverage', () => {
    const result = buildToolPageSpecsSignals({
      specs: {
        canonical: {
          quality: {
            pricing_lens_coverage: { personal: 1, startup: 2, enterprise: 3 },
            constraints_lens_coverage: { personal: 4, startup: 5, enterprise: 6 },
            integrations_lens_coverage: { personal: 7, startup: 8, enterprise: 9 },
          },
        },
      },
      userReportedPros: [],
      userReportedCons: [],
      activeReviewLens: 'startup',
    });

    expect(result.activeLensPricingPlanCount).toBe(2);
    expect(result.activeLensConstraintCount).toBe(5);
    expect(result.activeLensIntegrationCount).toBe(8);
  });
});
