import { describe, expect, it } from 'vitest';
import {
  buildToolPageEvidenceBulletV2,
  toToolPageEvidenceBullet,
} from '@/lib/tool-page/evidence-bullets';

const isEligibleEvidenceUrl = (url?: string | null): boolean => {
  if (!url) return false;
  try {
    return new URL(url).hostname.length > 0;
  } catch {
    return false;
  }
};

describe('tool page evidence bullets', () => {
  it('converts structured evidence bullets and rejects invalid ones', () => {
    const valid = toToolPageEvidenceBullet(
      {
        text: 'Documented limit',
        source_url: 'https://acme.com/docs',
        source_type: 'community',
        claim_type: 'opinion',
        source_urls: ['https://acme.com/docs', 'https://reddit.com/r/acme/comments/1'],
        claim_confidence_tier: 'medium',
        claim_confidence_score: 0.7,
      },
      isEligibleEvidenceUrl
    );
    const invalid = toToolPageEvidenceBullet(
      { text: 'Approximately', source_url: 'https://acme.com/docs' },
      isEligibleEvidenceUrl
    );

    expect(valid).toEqual({
      text: 'Documented limit',
      sourceUrl: 'https://acme.com/docs',
      sourceType: 'community',
      claimType: 'opinion',
      corroboratingSourceCount: 2,
      claimConfidenceTier: 'medium',
      claimConfidenceScore: 0.7,
    });
    expect(invalid).toBeNull();
  });

  it('creates unverified fallback bullet when required sourcing is missing', () => {
    const result = buildToolPageEvidenceBulletV2({
      text: 'Claim needing source',
      kind: 'claim',
      requiredSourcing: true,
      sourceUrl: null,
      isEligibleEvidenceUrl,
    });

    expect(result?.unverified).toBe(true);
    expect(result?.confidence).toBe('low');
  });

  it('creates high confidence bullet when valid source exists', () => {
    const result = buildToolPageEvidenceBulletV2({
      text: 'Sourced claim',
      kind: 'pro',
      requiredSourcing: true,
      sourceUrl: 'https://acme.com/pricing',
      sourceLabel: 'Official pricing',
      isEligibleEvidenceUrl,
    });

    expect(result?.unverified).toBe(false);
    expect(result?.confidence).toBe('high');
    expect(result?.sources[0].url).toBe('https://acme.com/pricing');
  });
});
