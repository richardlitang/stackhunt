import { describe, expect, it } from 'vitest';
import { createToolPageEvidenceBulletAdapters } from '@/lib/tool-page/evidence/evidence-bullet-adapters';

describe('tool page evidence bullet adapters', () => {
  it('wraps bullet builders with a shared eligibility policy', () => {
    const adapters = createToolPageEvidenceBulletAdapters({
      isEligibleEvidenceUrl: (value) =>
        typeof value === 'string' && value.startsWith('https://') && !value.includes('localhost'),
    });

    const v1 = adapters.toEvidenceBullet({
      text: 'Pricing confirmed',
      source_url: 'https://example.com/pricing',
      source_label: 'Pricing page',
    });
    const v2 = adapters.buildEvidenceBulletV2({
      text: 'Pricing checked against vendor docs.',
      kind: 'claim',
      sourceUrl: 'https://example.com/docs',
      requiredSourcing: true,
    });
    const rejected = adapters.buildEvidenceBulletV2({
      text: 'Internal note',
      kind: 'claim',
      sourceUrl: 'http://localhost:3000/mock',
      requiredSourcing: true,
    });

    expect(v1).toBeTruthy();
    expect(v1?.sourceUrl).toBe('https://example.com/pricing');
    expect(v2).toBeTruthy();
    expect(v2?.sources[0]?.url).toBe('https://example.com/docs');
    expect(rejected?.unverified).toBe(true);
  });
});
