import { describe, expect, it } from 'vitest';
import { buildToolPageTradeoffEvidence } from '@/lib/tool-page/tradeoff-evidence';

describe('tool page tradeoff evidence', () => {
  it('builds avoid-if and tradeoff bullets with canonical source mapping', () => {
    const result = buildToolPageTradeoffEvidence({
      decisionSnapshotWatchOuts: ['Needs enterprise plan for SSO'],
      canonicalHardLimits: [{ text: 'Needs enterprise plan for SSO', sourceUrl: 'https://example.com/pricing' }],
      topHardLimit: { text: 'Needs enterprise plan for SSO', sourceUrl: 'https://example.com/pricing' },
      communityVerifiedLabel: 'Mar 1, 2026',
      specsVerifiedLabel: null,
      pricingVerifiedLabel: null,
    });

    expect(result.avoidIfBullet).toBeTruthy();
    expect(result.tradeoffCons.length).toBeGreaterThan(0);
    expect(result.tradeoffCons[0].sources[0].url).toBe('https://example.com/pricing');
  });
});
