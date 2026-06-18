import { describe, expect, it } from 'vitest';
import { buildToolPageReviewBannerText } from '@/lib/tool-page/presentation/review-banner';

describe('tool page review banner', () => {
  it('returns source-backed copy when sources are collected', () => {
    const text = buildToolPageReviewBannerText({ hasCollectedSources: true });

    expect(text).toContain('Claims are source-backed');
  });

  it('returns in-progress source collection copy when sources are missing', () => {
    const text = buildToolPageReviewBannerText({ hasCollectedSources: false });

    expect(text).toContain('Source collection is still in progress');
  });
});
