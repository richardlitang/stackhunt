import { describe, expect, it } from 'vitest';
import { deriveOutboundType, sanitizeOutboundHref } from '@/lib/client/tool-page-interactions';

describe('tool page interactions helpers', () => {
  it('sanitizes outbound href by stripping query params', () => {
    expect(sanitizeOutboundHref('https://example.com/pricing?utm_source=test')).toBe(
      'https://example.com/pricing'
    );
  });

  it('falls back to vendor type when source type is not explicit', () => {
    const link = { dataset: {}, textContent: 'Visit site' } as unknown as HTMLAnchorElement;
    expect(deriveOutboundType(link)).toBe('vendor');
  });

  it('detects source links from visible text', () => {
    const link = { dataset: {}, textContent: 'Source' } as unknown as HTMLAnchorElement;
    expect(deriveOutboundType(link)).toBe('source');
  });
});
