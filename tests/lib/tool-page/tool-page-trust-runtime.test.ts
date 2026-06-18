import { describe, expect, it } from 'vitest';
import { buildToolPageTrustRuntime } from '@/lib/tool-page/runtime/trust-runtime';

describe('tool page trust runtime', () => {
  it('derives pending verification and trust labels consistently', () => {
    const result = buildToolPageTrustRuntime({
      baseEvidenceGrade: 'A',
      verificationItems: [{ unverified: true }, { unverified: false }, null],
      hasCollectedSources: true,
      contentConfidenceLevel: 'high',
      hasPricingCheckedProof: true,
      pricingCheckedLabel: 'Mar 1, 2026',
      pricingSourceUrl: 'https://example.com/pricing',
      specsVerifiedLabel: 'Mar 1, 2026',
      officialDocsSourceUrl: 'https://example.com/docs',
      communityVerifiedLabel: 'Mar 1, 2026',
      officialPricingSourceUrl: 'https://example.com/pricing',
    });

    expect(result.pendingVerificationCount).toBe(1);
    expect(result.evidenceGrade).toBe('B');
    expect(result.isVerificationMode).toBe(true);
    expect(result.trustStatus).toBe('Needs confirmation');
    expect(result.trustConfidenceLabel).toBe('Medium');
    expect(result.updateHistoryEntries.length).toBeGreaterThan(0);
  });
});
