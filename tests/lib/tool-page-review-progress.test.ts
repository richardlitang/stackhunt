import { describe, expect, it } from 'vitest';
import { deriveToolPageReviewProgress } from '@/lib/tool-page-review-progress';
import type { Tool } from '@/types/database';

describe('tool page review progress', () => {
  it('shows review-in-progress banner when provisional thresholds pass', () => {
    const result = deriveToolPageReviewProgress({
      tool: {
        id: 'tool_1',
        metadata: {},
        specs: {},
        pricing_verified_at: '2026-03-01T00:00:00.000Z',
        short_description: 'Acme',
        verdict: 'Useful',
        updated_at: '2026-03-01T00:00:00.000Z',
      } as Tool,
      firstReview: {
        status: 'draft',
        score: 80,
        summary_markdown: 'x'.repeat(160),
        pros: ['One', 'Two'],
        cons: ['One'],
        sources: [{ url: 'https://a.com' }, { url: 'https://b.com' }, { url: 'https://c.com' }],
      },
      gateReasons: [],
    });

    expect(typeof result.showReviewInProgressBanner).toBe('boolean');
    expect(Array.isArray(result.strictGateBlockers)).toBe(true);
  });

  it('keeps banner off when strict blockers include structural blockers', () => {
    const result = deriveToolPageReviewProgress({
      tool: {
        id: 'tool_1',
        metadata: {},
        specs: {},
        pricing_verified_at: null,
        short_description: null,
        verdict: null,
        updated_at: null,
      } as Tool,
      firstReview: {
        status: 'review',
        score: 40,
        summary_markdown: 'short',
        pros: [],
        cons: [],
        sources: [],
      },
      gateReasons: ['missing_required_sections'],
    });

    expect(result.showReviewInProgressBanner).toBe(false);
    expect(result.provisionalReasons.length).toBeGreaterThan(0);
  });
});
