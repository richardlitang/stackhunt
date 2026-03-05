import { describe, expect, it } from 'vitest';
import {
  toToolPageComparableAlternatives,
  toToolPageObjectArray,
  toToolPageOptionalRecord,
  toToolPageOrderedAlternatives,
  toToolPageReviewSources,
  toToolPageStringOrNull,
  toToolPageSpecsRecord,
} from '@/lib/tool-page/route-normalizers';

describe('tool page route normalizers', () => {
  it('normalizes review sources and specs records', () => {
    expect(toToolPageReviewSources([{ a: 1 }, null, 'x'])).toEqual([{ a: 1 }]);
    expect(toToolPageReviewSources(null)).toEqual([]);
    expect(toToolPageSpecsRecord({ key: 'value' })).toEqual({ key: 'value' });
    expect(toToolPageSpecsRecord(['x'])).toBeNull();
    expect(toToolPageOptionalRecord({ k: 'v' })).toEqual({ k: 'v' });
    expect(toToolPageOptionalRecord(['x'])).toBeUndefined();
    expect(toToolPageObjectArray([{ a: 1 }, null, 'x'])).toEqual([{ a: 1 }]);
    expect(toToolPageStringOrNull('2026-03-05')).toBe('2026-03-05');
    expect(toToolPageStringOrNull(42)).toBeNull();
  });

  it('normalizes ordered and comparable alternatives', () => {
    expect(toToolPageOrderedAlternatives([{ slug: 'a', name: 'A' }, { slug: 5 }, null])).toEqual([
      { slug: 'a', name: 'A' },
    ]);

    expect(
      toToolPageComparableAlternatives([{ slug: 'a', name: 'A' }, { slug: 'b' }, { name: 'C' }])
    ).toEqual([{ slug: 'a', name: 'A' }]);
  });
});
