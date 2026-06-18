import { describe, expect, it } from 'vitest';
import { buildToolPageRuntimeTrustInputFromRoute } from '@/lib/tool-page/route-state/runtime-trust-input';

describe('tool page runtime trust input', () => {
  it('maps route trust fields into runtime trust input', () => {
    const result = buildToolPageRuntimeTrustInputFromRoute({
      baseEvidenceGrade: 'B',
      avoidIfBullet: null,
      tradeoffCons: [],
      decisionProofPoints: [],
      hasCollectedSources: true,
      contentConfidenceLevel: 'medium',
      hasPricingCheckedProof: true,
      pricingCheckedLabel: '2026-03-05',
      pricingSourceUrl: 'https://example.com/pricing',
      specsVerifiedLabel: '2026-03-04',
      officialDocsSourceUrl: 'https://example.com/docs',
      communityVerifiedLabel: '2026-03-03',
      officialPricingSourceUrl: 'https://example.com/pricing',
    });

    expect(result.baseEvidenceGrade).toBe('B');
    expect(result.hasCollectedSources).toBe(true);
    expect(result.contentConfidenceLevel).toBe('medium');
    expect(result.officialDocsSourceUrl).toBe('https://example.com/docs');
  });
});
