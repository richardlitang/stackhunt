import { describe, expect, it } from 'vitest';
import { applyToolPageRobotsHeader } from '@/lib/tool-page/response-headers';

describe('tool page response headers', () => {
  it('sets x-robots-tag header from runtime index policy', () => {
    const response = { headers: new Headers() };

    applyToolPageRobotsHeader({
      response,
      robotsTag: 'noindex,nofollow',
    });

    expect(response.headers.get('X-Robots-Tag')).toBe('noindex,nofollow');
  });
});
