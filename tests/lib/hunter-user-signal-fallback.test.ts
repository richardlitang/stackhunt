import { describe, expect, it } from 'vitest';
import { buildFallbackUserSignalClaimsFromSources } from '@/lib/hunter/user-signal-fallback';

describe('hunter user-signal fallback', () => {
  it('keeps corroborated community claims when they are already hedged', () => {
    const result = buildFallbackUserSignalClaimsFromSources({
      label: 'cons',
      sources: [
        {
          url: 'https://www.reddit.com/r/crm/comments/one',
          source_type: 'community',
          snippet: 'Users report onboarding is slow and setup permissions are confusing.',
        },
        {
          url: 'https://news.ycombinator.com/item?id=1234',
          source_type: 'community',
          snippet: 'Users report onboarding is slow and setup permissions are confusing.',
        },
      ],
    });

    expect(result).toHaveLength(1);
    expect(result[0].text).toContain('Users report onboarding is slow');
  });

  it('suppresses community claims that are not explicitly user-voice hedged', () => {
    const result = buildFallbackUserSignalClaimsFromSources({
      label: 'cons',
      sources: [
        {
          url: 'https://www.reddit.com/r/crm/comments/one',
          source_type: 'community',
          snippet: 'Onboarding is slow and setup permissions are confusing.',
        },
        {
          url: 'https://news.ycombinator.com/item?id=1234',
          source_type: 'community',
          snippet: 'Onboarding is slow and setup permissions are confusing.',
        },
      ],
    });

    expect(result).toHaveLength(0);
  });
});
