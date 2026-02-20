import { describe, expect, it } from 'vitest';
import {
  normalizeComparePair,
  toClaimList,
  toEvidenceRefs,
} from '@/lib/compiler/snapshot-helpers';

describe('snapshot helpers', () => {
  it('normalizes compare pair ordering', () => {
    expect(normalizeComparePair('Notion', 'Linear')).toEqual({
      toolASlug: 'linear',
      toolBSlug: 'notion',
    });
  });

  it('throws when compare pair is invalid', () => {
    expect(() => normalizeComparePair('same', 'same')).toThrow(
      'Comparison requires two different slugs'
    );
  });

  it('extracts claim text with dedupe and limit', () => {
    const claims = toClaimList(
      [
        'Fast setup',
        { text: 'Fast setup' },
        { text: 'Great integrations' },
        '',
        { text: 'Simple UI' },
      ],
      2
    );
    expect(claims).toEqual(['Fast setup', 'Great integrations']);
  });

  it('extracts evidence refs with domain normalization', () => {
    const refs = toEvidenceRefs([
      { url: 'https://www.example.com/pricing', source_type: 'official' },
      { url: 'https://blog.example.com/review', source_type: 'editorial' },
      { url: 'https://www.example.com/pricing', source_type: 'official' },
    ]);

    expect(refs).toEqual([
      {
        url: 'https://www.example.com/pricing',
        source_type: 'official',
        domain: 'example.com',
        retrieved_at: undefined,
      },
      {
        url: 'https://blog.example.com/review',
        source_type: 'editorial',
        domain: 'blog.example.com',
        retrieved_at: undefined,
      },
    ]);
  });
});
