import { describe, expect, it } from 'vitest';
import {
  deriveToolPageReviewContentLists,
  deriveToolPageSourceEvidenceDomains,
} from '@/lib/tool-page/review-content';

describe('tool page review content', () => {
  it('normalizes review pros/cons/sources into arrays', () => {
    const result = deriveToolPageReviewContentLists({
      pros: ['Fast setup'],
      cons: [{ text: 'Plan limits' }],
      sources: [{ domain: 'www.example.com' }],
    });

    expect(result.pros).toHaveLength(1);
    expect(result.cons).toHaveLength(1);
    expect(result.sources).toHaveLength(1);
  });

  it('derives source evidence domains from domain or url', () => {
    const domains = deriveToolPageSourceEvidenceDomains([
      { domain: 'www.docs.example.com' },
      { url: 'https://pricing.example.com/plans?x=1' },
      { url: 'not-a-url' },
    ]);

    expect(domains.has('docs.example.com')).toBe(true);
    expect(domains.has('pricing.example.com')).toBe(true);
    expect(domains.size).toBe(2);
  });
});
