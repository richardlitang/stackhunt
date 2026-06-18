import { describe, expect, it } from 'vitest';
import { buildToolPageEvidenceLinks } from '@/lib/tool-page/evidence/evidence-links';

describe('tool page evidence links', () => {
  it('filters blocked domains and classifies official pricing as high quality', () => {
    const result = buildToolPageEvidenceLinks(
      [
        {
          url: 'https://www.reddit.com/r/test/comments/1',
          title: 'Reddit thread',
          source_type: 'community',
        },
        { url: 'https://acme.com/pricing', title: 'Acme pricing', source_type: 'official' },
      ],
      'Acme'
    );

    expect(result.evidenceLinksAll).toHaveLength(1);
    expect(result.evidenceLinks[0].basis).toBe('Official pricing pages');
    expect(result.evidenceLinks[0].quality).toBe('high');
    expect(result.officialEvidenceLinks).toHaveLength(1);
  });

  it('downgrades off-topic official blog sources and keeps low-confidence bucket', () => {
    const result = buildToolPageEvidenceLinks(
      [
        {
          url: 'https://acme.com/blog/random-post',
          title: 'General announcement',
          source_type: 'official',
        },
      ],
      'DifferentTool'
    );

    expect(result.evidenceLinks).toHaveLength(0);
    expect(result.lowConfidenceEvidenceLinks).toHaveLength(1);
    expect(result.lowConfidenceEvidenceLinks[0].inclusionReason).toContain('appears unrelated');
  });
});
