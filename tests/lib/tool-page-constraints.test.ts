import { describe, expect, it } from 'vitest';
import { deriveToolPageCanonicalHardLimits } from '@/lib/tool-page/constraints';

describe('tool page constraints', () => {
  it('derives canonical hard limits with filtering and deduplication', () => {
    const result = deriveToolPageCanonicalHardLimits({
      hardLimitFromConstraints: [{ text: 'API limit: 1000 calls', sourceUrl: 'https://acme.com/pricing' }],
      effectiveEvidenceCons: [
        { text: 'Monthly quota cap applies', sourceUrl: 'https://acme.com/docs' },
        { text: 'No clear SLA mention', sourceUrl: 'https://acme.com/docs' },
      ],
      hiddenCostBullets: [
        { text: 'Setup fee (one-time) - onboarding', sourceUrl: 'https://acme.com/pricing' },
        { text: 'API limit: 1000 calls', sourceUrl: 'https://acme.com/pricing' },
      ],
    });

    expect(result.hardLimitBullets).toEqual([
      { text: 'API limit: 1000 calls', sourceUrl: 'https://acme.com/pricing' },
      { text: 'Monthly quota cap applies', sourceUrl: 'https://acme.com/docs' },
      { text: 'Setup fee (one-time) - onboarding', sourceUrl: 'https://acme.com/pricing' },
    ]);
    expect(result.canonicalHardLimits).toEqual([
      { text: 'API limit: 1000 calls', sourceUrl: 'https://acme.com/pricing' },
      { text: 'Monthly quota cap applies', sourceUrl: 'https://acme.com/docs' },
      { text: 'Setup fee (one-time) - onboarding', sourceUrl: 'https://acme.com/pricing' },
    ]);
    expect(result.topHardLimit).toEqual({
      text: 'API limit: 1000 calls',
      sourceUrl: 'https://acme.com/pricing',
    });
  });
});
