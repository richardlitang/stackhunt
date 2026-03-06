import { describe, expect, it } from 'vitest';
import { buildToolPageConstraintEvidence } from '@/lib/tool-page/constraint-evidence';

describe('tool page constraint evidence', () => {
  it('derives hidden costs and hard limits with source and policy filtering', () => {
    const result = buildToolPageConstraintEvidence({
      constraints: {
        hidden_costs: [
          {
            name: 'Gateway fee',
            amount: '$0.30',
            when_charged: 'per transaction',
            source_url: 'https://a.com',
          },
          { name: 'No source', source_url: '' },
        ],
        hard_limits: [
          {
            metric: 'api_calls',
            value: 1000,
            unit: 'month',
            plan_name_match: 'Starter',
            source_url: 'https://b.com',
            works_for_lenses: ['startup'],
          },
          { metric: 'blocked_limit', value: 10, source_url: 'https://c.com' },
        ],
      },
      isEligibleEvidenceUrl: (url) => url.startsWith('https://'),
      isDisallowedConClaim: (text) => text.includes('blocked'),
    });

    expect(result.hiddenCostBullets).toHaveLength(1);
    expect(result.hiddenCostBullets[0].text).toContain('Gateway fee');
    expect(result.hardLimitFromConstraints).toHaveLength(1);
    expect(result.hardLimitFromConstraints[0].text).toContain('api calls');
    expect(result.hardLimitFromConstraints[0].works_for_lenses).toEqual(['startup']);
  });
});
