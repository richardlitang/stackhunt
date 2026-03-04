import { describe, expect, it } from 'vitest';
import { applyToolPageVersionBypassCacheHeaders } from '@/lib/tool-page/request-cache';

describe('tool page request cache', () => {
  it('applies no-store headers when version bypass is present', () => {
    const response = { headers: new Headers() };
    applyToolPageVersionBypassCacheHeaders(response, true);

    expect(response.headers.get('Cache-Control')).toBe('no-store, max-age=0');
    expect(response.headers.get('CDN-Cache-Control')).toBe('no-store, max-age=0');
    expect(response.headers.get('Vercel-CDN-Cache-Control')).toBe('no-store, max-age=0');
  });

  it('does not set headers when version bypass is absent', () => {
    const response = { headers: new Headers() };
    applyToolPageVersionBypassCacheHeaders(response, false);

    expect(response.headers.get('Cache-Control')).toBeNull();
  });
});
