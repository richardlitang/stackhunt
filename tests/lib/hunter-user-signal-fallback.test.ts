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
    expect(claims[0]?.source_channel).toBe('reddit');
    expect(claims[0]?.text.toLowerCase()).toContain('users report');
    expect(claims[0]?.source_urls.length).toBeGreaterThan(0);
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

  it('aggregates corroboration counts when similar claims appear across sources', () => {
    const claims = buildFallbackUserSignalClaimsFromSources({
      label: 'cons',
      sources: [
        {
          url: 'https://www.reddit.com/r/saas/comments/1',
          snippet: 'Users report slow responses during busy periods and reliability issues.',
          source_type: 'community',
        },
        {
          url: 'https://news.ycombinator.com/item?id=22',
          snippet: 'Users report slow responses during busy periods and reliability issues.',
          source_type: 'community',
        },
      ],
    });

    expect(claims).toHaveLength(1);
    expect(claims[0]?.corroborating_source_count).toBe(2);
    expect(claims[0]?.claim_confidence_tier).toBe('medium');
    expect(claims[0]?.source_urls).toHaveLength(2);
  });

  it('assigns medium confidence to high-signal reddit claims even when single-source', () => {
    const claims = buildFallbackUserSignalClaimsFromSources({
      label: 'pros',
      sources: [
        {
          url: 'https://www.reddit.com/r/saas/comments/99',
          snippet: 'Users report strong reliability and faster execution in daily usage.',
          source_type: 'community',
        },
      ],
    });

    expect(claims).toHaveLength(1);
    expect(claims[0]?.source_channel).toBe('reddit');
    expect(claims[0]?.claim_confidence_tier).toBe('medium');
  });

  it('extracts sentence-level claims from longer snippets', () => {
    const claims = buildFallbackUserSignalClaimsFromSources({
      label: 'cons',
      sources: [
        {
          url: 'https://www.reddit.com/r/saas/comments/777',
          snippet:
            'Teams like the UI for quick tasks. But users report slow sync and missing notifications during peak hours.',
          source_type: 'community',
        },
      ],
    });

    expect(claims).toHaveLength(1);
    expect(claims[0]?.text.toLowerCase()).toContain('slow sync');
  });

  it('prioritizes snippet text over noisy titles for claim extraction', () => {
    const claims = buildFallbackUserSignalClaimsFromSources({
      label: 'pros',
      sources: [
        {
          url: 'https://www.reddit.com/r/saas/comments/123',
          snippet: 'Users report easier onboarding and faster setup for small teams.',
          title: 'Top 10 AI tools compared in 2026',
          source_type: 'community',
        },
      ],
    });

    expect(claims).toHaveLength(1);
    expect(claims[0]?.text.toLowerCase()).toContain('easier onboarding');
    expect(claims[0]?.text.toLowerCase()).not.toContain('top 10 ai tools');
  });
});
