export type UserSignalChannel = 'reddit' | 'forum' | 'hn' | 'editorial' | 'other';

function normalizeHostname(rawUrl?: string | null): string | null {
  if (!rawUrl) return null;
  try {
    return new URL(rawUrl).hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return null;
  }
}

export function inferUserSignalChannelFromUrl(rawUrl?: string | null): UserSignalChannel {
  const hostname = normalizeHostname(rawUrl);
  if (!hostname) return 'other';
  if (hostname === 'reddit.com' || hostname.endsWith('.reddit.com')) return 'reddit';
  if (hostname === 'news.ycombinator.com' || hostname === 'ycombinator.com') return 'hn';
  if (
    hostname.includes('forum') ||
    hostname.includes('community') ||
    hostname.includes('discourse') ||
    hostname.endsWith('.stackexchange.com') ||
    hostname === 'stackoverflow.com' ||
    hostname === 'quora.com' ||
    hostname === 'discord.com'
  ) {
    return 'forum';
  }
  return 'other';
}
