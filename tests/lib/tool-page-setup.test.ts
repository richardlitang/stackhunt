import { describe, expect, it } from 'vitest';
import { deriveToolPageSetupSignals } from '@/lib/tool-page/setup';

describe('tool page setup signals', () => {
  it('detects meaningful getting started signals from setup complexity and tracks', () => {
    const result = deriveToolPageSetupSignals({
      knowledgeCard: {
        setup_complexity: {
          steps: [{ action: 'Open settings and connect your account' }],
          setup_url: 'https://example.com/setup',
        },
      },
      setupTracks: {
        non_dev: [{ action: 'Follow the no-code onboarding flow' }],
        dev: [{ action: 'Call API endpoints from your backend integration' }],
      },
      website: 'https://example.com',
    });

    expect(result.hasSetupComplexityContent).toBe(true);
    expect(result.hasNonDevTrackContent).toBe(true);
    expect(result.hasDevTrackContent).toBe(true);
    expect(result.hasGettingStarted).toBe(true);
    expect(result.gettingStartedCtaUrl).toBe('https://example.com/setup');
  });

  it('falls back to website when setup url is unavailable', () => {
    const result = deriveToolPageSetupSignals({
      knowledgeCard: { setup_complexity: null },
      setupTracks: null,
      website: 'https://fallback.example.com',
    });

    expect(result.hasGettingStarted).toBe(false);
    expect(result.gettingStartedCtaUrl).toBe('https://fallback.example.com');
  });
});
