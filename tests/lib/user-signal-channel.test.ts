import { describe, expect, it } from 'vitest';
import { inferUserSignalChannelFromUrl } from '@/lib/user-signal-channel';

describe('user signal channel inference', () => {
  it('detects reddit and hn sources', () => {
    expect(inferUserSignalChannelFromUrl('https://www.reddit.com/r/saas/comments/abc')).toBe(
      'reddit'
    );
    expect(inferUserSignalChannelFromUrl('https://news.ycombinator.com/item?id=1')).toBe('hn');
  });

  it('detects forum-style community hosts', () => {
    expect(inferUserSignalChannelFromUrl('https://community.figma.com/t/workflow/1')).toBe('forum');
    expect(inferUserSignalChannelFromUrl('https://forum.asana.com/t/tip/2')).toBe('forum');
  });

  it('falls back to other for unknown hosts and invalid urls', () => {
    expect(inferUserSignalChannelFromUrl('https://example.com/review')).toBe('other');
    expect(inferUserSignalChannelFromUrl('not-a-url')).toBe('other');
  });
});
