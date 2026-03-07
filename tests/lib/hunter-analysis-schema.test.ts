import { describe, expect, it } from 'vitest';
import { AnalysisSchema } from '@/lib/hunter/types';

describe('hunter analysis schema', () => {
  it('accepts empty optional user-reported arrays', () => {
    const parsed = AnalysisSchema.safeParse({
      score: 80,
      pros: [
        {
          text: 'Offers documented API access for integration workflows.',
          source_url: 'https://example.com/docs/api',
          source_type: 'official',
          claim_type: 'fact',
        },
      ],
      cons: [
        {
          text: 'Advanced controls are restricted to higher pricing tiers.',
          source_url: 'https://example.com/pricing',
          source_type: 'official',
          claim_type: 'fact',
        },
      ],
      userReportedPros: [],
      userReportedCons: [],
      summary:
        'This tool is strong for API-first teams, but advanced controls and budget constraints should be validated before rollout.',
      sentimentTags: ['powerful', 'flexible'],
      pricingType: 'paid',
      vetoLogic: [
        {
          condition: 'No SSO support in the required plan',
          alternative: 'Choose a vendor with baseline SSO',
          reason: 'Identity controls are mandatory for procurement.',
          source_url: 'https://example.com/security',
        },
      ],
      realityChecks: [
        {
          claim: 'Quick setup for all teams',
          reality: 'Operational setup still requires admin ownership and policy checks.',
          impact: 'Rollout can stall without dedicated ownership.',
          source_url: 'https://example.com/setup',
        },
      ],
      graphTags: {
        functions: ['automation'],
        audiences: ['developers'],
        platforms: ['web'],
      },
    });

    expect(parsed.success).toBe(true);
  });
});
