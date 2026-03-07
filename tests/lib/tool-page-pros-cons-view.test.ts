import { describe, expect, it } from 'vitest';
import { buildToolPageProsConsView } from '@/lib/tool-page/pros-cons-view';

describe('tool page pros/cons view', () => {
  it('maps evidence bullets to ProsCons component shape', () => {
    const result = buildToolPageProsConsView({
      pros: [
        {
          text: 'Fast setup',
          sourceUrl: 'https://docs.example.com/setup',
          sourceType: 'official',
          claimType: 'fact',
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
          source_type: 'official',
          claim_type: 'fact',
          corroborating_source_count: 3,
          claim_confidence_tier: 'high',
          claim_confidence_score: 0.82,
        },
      ],
      cons: [{ text: 'Steep learning curve', source_url: null }],
      userSignalPros: [],
      userSignalCons: [],
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

    expect(result.userSignalPros[0]?.corroborating_source_count).toBe(2);
    expect(result.userSignalPros[0]?.claim_confidence_tier).toBe('medium');
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

    expect(result.userSignalPros[0]?.source_channel).toBe('hn');
  });

  it('derives channel from source_urls when primary source_url is not classifiable', () => {
    const result = buildToolPageProsConsView({
      pros: [],
      cons: [],
      userReportedCons: [
        {
          text: 'Users report intermittent sync lag.',
          source_url: 'https://example.com/thread',
          source_urls: ['https://example.com/thread', 'https://www.reddit.com/r/saas/comments/xyz'],
          source_type: 'community',
          claim_confidence_tier: 'low',
        },
      ],
    });

    expect(result.userSignalCons[0]?.source_channel).toBe('reddit');
  });

  it('keeps factual and user-reported lanes separate', () => {
    const result = buildToolPageProsConsView({
      pros: [{ text: 'Official docs confirm SSO support.', sourceUrl: 'https://example.com/docs' }],
      cons: [
        {
          text: 'Official pricing has seat caps on starter.',
          sourceUrl: 'https://example.com/pricing',
        },
      ],
      userReportedPros: [
        {
          text: 'Users report onboarding is quick once templates are set up.',
          source_url: 'https://reddit.com/r/saas/alpha',
          source_type: 'community',
          claim_type: 'opinion',
        },
      ],
      userReportedCons: [
        {
          text: 'Users report intermittent UI lag in large workspaces.',
          source_url: 'https://news.ycombinator.com/item?id=12345',
          source_type: 'community',
          claim_type: 'opinion',
        },
      ],
    });

    expect(result.pros).toHaveLength(1);
    expect(result.cons).toHaveLength(1);
    expect(result.userSignalPros).toHaveLength(1);
    expect(result.userSignalCons).toHaveLength(1);
  });

  it('reroutes contaminated opinion/community claims out of factual lanes', () => {
    const result = buildToolPageProsConsView({
      pros: [
        {
          text: 'Users report support quality varies by timezone.',
          sourceUrl: 'https://reddit.com/r/saas/2',
          sourceType: 'community',
          claimType: 'opinion',
        },
      ],
      cons: [
        {
          text: 'Users report billing spikes are hard to predict.',
          sourceUrl: 'https://news.ycombinator.com/item?id=9988',
          sourceType: 'community',
          claimType: 'opinion',
        },
      ],
    });

    expect(result.pros).toHaveLength(0);
    expect(result.cons).toHaveLength(0);
    expect(result.userSignalPros).toHaveLength(1);
    expect(result.userSignalCons).toHaveLength(1);
  });
});
