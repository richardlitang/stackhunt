import { describe, expect, it } from 'vitest';

import {
  mergeRankedUserSignalClaims,
  normalizeUserSignalClaimKey,
  scoreUserSignalClaim,
} from '@/lib/hunter/user-signal-claims';

describe('hunter user-signal claims', () => {
  it('normalizes hedged keys for dedupe stability', () => {
    expect(normalizeUserSignalClaimKey('Users report onboarding is faster for small teams.')).toBe(
      'onboarding is faster for small teams'
    );
  });

  it('scores corroborated community claims above single-source editorial claims', () => {
    const communityScore = scoreUserSignalClaim({
      text: 'Users report faster rollout after migration.',
      source_url: 'https://www.reddit.com/r/saas/comments/abc',
      source_type: 'community',
      source_channel: 'reddit',
      claim_type: 'opinion',
      source_urls: [
        'https://www.reddit.com/r/saas/comments/abc',
        'https://news.ycombinator.com/item?id=1',
      ],
      claim_confidence_tier: 'medium',
      retrieved_at: new Date().toISOString(),
    });
    const editorialScore = scoreUserSignalClaim({
      text: 'Reviewers note easier onboarding.',
      source_url: 'https://g2.com/products/x/reviews',
      source_type: 'editorial',
      claim_type: 'opinion',
      claim_confidence_tier: 'medium',
      retrieved_at: new Date().toISOString(),
    });
    expect(communityScore).toBeGreaterThan(editorialScore);
  });

  it('merges and ranks claims with dedupe', () => {
    const merged = mergeRankedUserSignalClaims(
      [
        {
          text: 'Users report faster onboarding for startups.',
          source_url: 'https://www.reddit.com/r/saas/comments/abc',
          source_type: 'community',
          source_channel: 'reddit',
          claim_type: 'opinion',
          source_urls: [
            'https://www.reddit.com/r/saas/comments/abc',
            'https://news.ycombinator.com/item?id=2',
          ],
          claim_confidence_tier: 'medium',
          retrieved_at: new Date().toISOString(),
        },
      ],
      [
        {
          text: 'Users report that faster onboarding for startups.',
          source_url: 'https://news.ycombinator.com/item?id=2',
          source_type: 'community',
          source_channel: 'hn',
          claim_type: 'opinion',
          source_urls: ['https://news.ycombinator.com/item?id=2'],
          claim_confidence_tier: 'low',
          retrieved_at: new Date().toISOString(),
        },
      ],
      5
    );

    expect(merged).toHaveLength(1);
    expect(merged[0]?.source_channel).toBe('reddit');
  });
});
