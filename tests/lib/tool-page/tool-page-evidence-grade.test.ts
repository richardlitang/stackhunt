import { describe, expect, it } from 'vitest';
import { deriveToolPageBaseEvidenceGrade } from '@/lib/tool-page/evidence/evidence-grade';

describe('tool page base evidence grade', () => {
  it('returns A with strong official coverage and core claim support', () => {
    const result = deriveToolPageBaseEvidenceGrade({
      officialEvidenceLinks: [
        { domain: 'acme.com', basis: 'Official pricing pages' },
        { domain: 'docs.acme.com', basis: 'Official docs/help center' },
      ],
      canonicalHardLimitCount: 1,
      evidenceLinkCount: 4,
    });

    expect(result).toBe('A');
  });

  it('returns B with limited official coverage but docs signal present', () => {
    const result = deriveToolPageBaseEvidenceGrade({
      officialEvidenceLinks: [{ domain: 'acme.com', basis: 'Official docs/help center' }],
      canonicalHardLimitCount: 0,
      evidenceLinkCount: 1,
    });

    expect(result).toBe('B');
  });

  it('returns C when official sources and claim coverage are weak', () => {
    const result = deriveToolPageBaseEvidenceGrade({
      officialEvidenceLinks: [],
      canonicalHardLimitCount: 0,
      evidenceLinkCount: 2,
    });

    expect(result).toBe('C');
  });
});
