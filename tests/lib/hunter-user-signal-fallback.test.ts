import { describe, expect, it } from 'vitest';
import { buildFallbackUserSignalClaimsFromSources } from '@/lib/hunter/user-signal-fallback';

describe('hunter user signal fallback', () => {
  it('extracts pros from community/editorial snippets with positive signal', () => {
    const claims = buildFallbackUserSignalClaimsFromSources({
      label: 'pros',
      sources: [
        {
          url: 'https://www.reddit.com/r/saas/comments/abc123/tool_review/',
          snippet: 'Teams say onboarding is fast and the workflow is easier to adopt.',
          source_type: 'community',
        },
        {
          url: 'https://vendor.example.com/docs/setup',
          snippet: 'Official setup reference.',
          source_type: 'docs',
        },
      ],
    });

    expect(claims).toHaveLength(1);
    expect(claims[0]?.source_type).toBe('community');
    expect(claims[0]?.text.toLowerCase()).toContain('users report');
  });

  it('extracts cons only when negative cues exist', () => {
    const claims = buildFallbackUserSignalClaimsFromSources({
      label: 'cons',
      sources: [
        {
          url: 'https://news.ycombinator.com/item?id=123',
          snippet: 'Users report slow responses and inconsistent reliability under load.',
          source_type: 'community',
        },
        {
          url: 'https://www.g2.com/products/acme/reviews',
          snippet: 'Reviewers mention confusion during advanced setup.',
          source_type: 'editorial',
        },
      ],
    });

    expect(claims.length).toBeGreaterThan(0);
    expect(claims.every((claim) => claim.claim_type === 'opinion')).toBe(true);
    expect(claims.some((claim) => claim.source_type === 'community')).toBe(true);
  });
});
