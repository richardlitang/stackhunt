import { describe, expect, it } from 'vitest';
import { buildToolPageSourceListsView } from '@/lib/tool-page/source-lists';

const link = (i: number) => ({
  url: `https://example.com/${i}`,
  title: `Source ${i}`,
  domain: 'example.com',
  basis: 'docs',
  quality: 'high',
  inclusionReason: 'official',
});

describe('tool page source lists', () => {
  it('applies methodology and low-confidence caps', () => {
    const result = buildToolPageSourceListsView({
      evidenceLinks: Array.from({ length: 20 }, (_, i) => link(i + 1)),
      lowConfidenceEvidenceLinks: Array.from({ length: 10 }, (_, i) => link(i + 101)),
    });

    expect(result.methodologyLinks).toHaveLength(12);
    expect(result.lowConfidenceLinks).toHaveLength(6);
  });
});
