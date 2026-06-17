import { describe, expect, it } from 'vitest';
import {
  jaccardSimilarity,
  overlapRatio,
  tokenizeForSimilarity,
} from '@/lib/hunter/text-similarity';

describe('text similarity (characterization)', () => {
  it('jaccard of identical sets is 1', () => {
    const a = tokenizeForSimilarity('best crm for startups');
    expect(jaccardSimilarity(a, a)).toBe(1);
  });

  it('jaccard of disjoint sets is 0', () => {
    expect(
      jaccardSimilarity(tokenizeForSimilarity('alpha beta'), tokenizeForSimilarity('gamma delta'))
    ).toBe(0);
  });

  it('overlapRatio is high on identical phrases', () => {
    expect(overlapRatio('kanban board view', 'kanban board view')).toBeGreaterThan(0.9);
  });
});
