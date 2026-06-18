import { describe, expect, it } from 'vitest';
import { buildToolPageAlternativesIntroText } from '@/lib/tool-page/alternatives/alternatives-intro';

describe('tool page alternatives intro text', () => {
  it('uses alternatives wording for alternatives label', () => {
    expect(
      buildToolPageAlternativesIntroText({
        alternativesLabel: 'Alternatives',
        primaryFunction: 'Analytics',
        categoryName: 'Business Intelligence',
      })
    ).toBe('Other analytics tools to consider');
  });

  it('uses related tools wording otherwise', () => {
    expect(
      buildToolPageAlternativesIntroText({
        alternativesLabel: 'Related Tools',
        primaryFunction: null,
        categoryName: null,
      })
    ).toBeNull();
  });
});
