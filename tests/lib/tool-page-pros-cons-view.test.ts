import { describe, expect, it } from 'vitest';
import { buildToolPageProsConsView } from '@/lib/tool-page/pros-cons-view';

describe('tool page pros/cons view', () => {
  it('maps evidence bullets to ProsCons component shape', () => {
    const result = buildToolPageProsConsView({
      pros: [
        {
          text: 'Fast setup',
          sourceUrl: 'https://docs.example.com/setup',
          sourceType: 'community',
          sourceChannel: 'reddit',
          claimType: 'opinion',
          corroboratingSourceCount: 3,
          claimConfidenceTier: 'high',
          claimConfidenceScore: 0.82,
        },
      ],
      cons: [{ text: 'Steep learning curve', sourceUrl: null }],
    });

    expect(result).toEqual({
      pros: [
        {
          text: 'Fast setup',
          source_url: 'https://docs.example.com/setup',
          source_type: 'community',
          claim_type: 'opinion',
          source_channel: 'reddit',
          corroborating_source_count: 3,
          claim_confidence_tier: 'high',
          claim_confidence_score: 0.82,
        },
      ],
      cons: [{ text: 'Steep learning curve', source_url: null }],
    });
  });

  it('derives corroboration from user-reported source_urls when count is absent', () => {
    const result = buildToolPageProsConsView({
      pros: [],
      cons: [],
      userReportedPros: [
        {
          text: 'Users report strong day-to-day reliability.',
          source_url: 'https://reddit.com/r/example/1',
          source_urls: ['https://reddit.com/r/example/1', 'https://news.ycombinator.com/item?id=1'],
          source_type: 'community',
          source_channel: 'reddit',
          claim_confidence_tier: 'medium',
        },
      ],
    });

    expect(result.pros[0]?.corroborating_source_count).toBe(2);
    expect(result.pros[0]?.claim_confidence_tier).toBe('medium');
  });

  it('derives source channel for community claims when channel is missing', () => {
    const result = buildToolPageProsConsView({
      pros: [
        {
          text: 'Users report faster setup after migration.',
          sourceUrl: 'https://news.ycombinator.com/item?id=12345',
          sourceType: 'community',
        },
      ],
      cons: [],
    });

    expect(result.pros[0]?.source_channel).toBe('hn');
  });
});
