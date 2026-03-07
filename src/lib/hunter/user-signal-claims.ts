import type { ClaimWithSource } from '@/lib/hunter/types';
import { inferUserSignalChannelFromUrl } from '@/lib/user-signal-channel';

const TERMINAL_PUNCTUATION = /[.:;!?…"'`”’)\]]+$/g;
const CONTROL_CHARS_REGEX = /[\p{Cc}\u200B-\u200D\u2060\uFEFF]/gu;
const HEDGING_PREFIX =
  /^(users report(?: that)?|according to community feedback|based on user discussions|according to reviews|reviewers note that),?\s+/i;

export function normalizeUserSignalClaimKey(value: string): string {
  return value
    .normalize('NFKC')
    .replace(CONTROL_CHARS_REGEX, '')
    .replace(HEDGING_PREFIX, '')
    .replace(TERMINAL_PUNCTUATION, '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function scoreUserSignalClaim(claim: ClaimWithSource): number {
  const sourceWeight =
    claim.source_type === 'community' ? 40 : claim.source_type === 'editorial' ? 28 : 12;
  const channel = claim.source_channel || inferUserSignalChannelFromUrl(claim.source_url);
  const channelWeight =
    channel === 'reddit' ? 14 : channel === 'hn' ? 11 : channel === 'forum' ? 8 : 0;
  const corroborationCount = Math.max(
    1,
    typeof (claim as { corroborating_source_count?: number }).corroborating_source_count ===
      'number'
      ? ((claim as { corroborating_source_count?: number }).corroborating_source_count as number)
      : Array.isArray(claim.source_urls) && claim.source_urls.length > 0
        ? claim.source_urls.length
        : 1
  );
  const corroborationWeight = Math.min(15, (corroborationCount - 1) * 5);
  const confidenceWeight =
    claim.claim_confidence_tier === 'high' ? 10 : claim.claim_confidence_tier === 'medium' ? 5 : 0;
  const textWeight = Math.min(8, Math.floor((claim.text || '').length / 40));
  return sourceWeight + channelWeight + corroborationWeight + confidenceWeight + textWeight;
}

export function mergeRankedUserSignalClaims(
  primary: ClaimWithSource[],
  supplement: ClaimWithSource[],
  max = 5
): ClaimWithSource[] {
  const ranked = [...primary, ...supplement]
    .map((claim, index) => ({ claim, index, score: scoreUserSignalClaim(claim) }))
    .sort((a, b) => b.score - a.score || a.index - b.index);

  const merged: ClaimWithSource[] = [];
  const seen = new Set<string>();
  for (const entry of ranked) {
    const key = normalizeUserSignalClaimKey(entry.claim.text || '');
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push(entry.claim);
    if (merged.length >= max) break;
  }
  return merged;
}
