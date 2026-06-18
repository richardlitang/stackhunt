import { describe, expect, it } from 'vitest';
import { buildToolPageLensHrefs } from '@/lib/tool-page/navigation/lens-hrefs';

describe('tool page lens hrefs', () => {
  it('preserves existing query params and removes lens for general', () => {
    const result = buildToolPageLensHrefs(
      '/tool/acme',
      new URLSearchParams('lens=startup&foo=bar')
    );

    expect(result.general).toBe('/tool/acme?foo=bar');
    expect(result.personal).toBe('/tool/acme?lens=personal&foo=bar');
    expect(result.startup).toBe('/tool/acme?lens=startup&foo=bar');
    expect(result.enterprise).toBe('/tool/acme?lens=enterprise&foo=bar');
  });

  it('returns bare pathname when no query params exist', () => {
    const result = buildToolPageLensHrefs('/tool/acme', new URLSearchParams(''));

    expect(result.general).toBe('/tool/acme');
    expect(result.personal).toBe('/tool/acme?lens=personal');
  });
});
