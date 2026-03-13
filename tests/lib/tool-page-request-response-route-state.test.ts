import { describe, expect, it } from 'vitest';
import {
  applyToolPageResponseRouteState,
  buildToolPageRequestRouteState,
} from '@/lib/tool-page/request-response-route-state';

describe('tool page request/response route state', () => {
  it('derives request lens and applies bypass cache headers when v param exists', () => {
    const response = new Response(null);
    const result = buildToolPageRequestRouteState({
      searchParams: new URLSearchParams('lens=startup&v=42'),
      response,
    });

    expect(result.activeReviewLens).toBe('startup');
    expect(result.hasVersionBypassParam).toBe(true);
    expect(response.headers.get('Cache-Control')).toContain('no-store');
  });

  it('applies robots tag header from route state', () => {
    const response = new Response(null);
    applyToolPageResponseRouteState({
      response,
      robotsTag: 'noindex,follow',
    });
    expect(response.headers.get('X-Robots-Tag')).toBe('noindex,follow');
  });
});
