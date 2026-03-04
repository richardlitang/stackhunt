import { describe, expect, it } from 'vitest';
import { buildToolPageGettingStartedProps } from '@/lib/tool-page/getting-started-props';

describe('tool page getting started props', () => {
  it('falls back to tool website when knowledge-card url is missing', () => {
    const result = buildToolPageGettingStartedProps({
      setupComplexity: 'medium',
      hasApi: true,
      websiteUrl: null,
      fallbackWebsiteUrl: 'https://tool.example.com',
      setupTracks: [],
      setupUrl: 'https://tool.example.com/docs/setup',
      toolName: 'Tool',
    });

    expect(result.websiteUrl).toBe('https://tool.example.com');
    expect(result.hasApi).toBe(true);
  });
});
