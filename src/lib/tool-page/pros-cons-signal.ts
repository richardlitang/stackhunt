type ProsConsSourceType = 'official' | 'editorial' | 'community';
type ProsConsClaimType = 'fact' | 'opinion';
import { inferUserSignalChannelFromUrl } from '@/lib/user-signal-channel';

const COMMUNITY_HOST_PATTERNS = [
  /(^|\.)reddit\.com$/i,
  /(^|\.)news\.ycombinator\.com$/i,
  /(^|\.)stackoverflow\.com$/i,
  /(^|\.)stackexchange\.com$/i,
  /(^|\.)quora\.com$/i,
  /(^|\.)discord\.com$/i,
  /(^|\.)x\.com$/i,
  /(^|\.)twitter\.com$/i,
];

const EDITORIAL_HOST_PATTERNS = [
  /(^|\.)g2\.com$/i,
  /(^|\.)capterra\.com$/i,
  /(^|\.)trustradius\.com$/i,
  /(^|\.)getapp\.com$/i,
  /(^|\.)softwareadvice\.com$/i,
  /(^|\.)producthunt\.com$/i,
  /(^|\.)pcmag\.com$/i,
  /(^|\.)techradar\.com$/i,
  /(^|\.)forbes\.com$/i,
  /(^|\.)zapier\.com$/i,
];

function matchesHostPattern(hostname: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(hostname));
}

function isLikelyCommunityHost(hostname: string): boolean {
  if (matchesHostPattern(hostname, COMMUNITY_HOST_PATTERNS)) return true;
  return (
    hostname.includes('forum') || hostname.includes('community') || hostname.includes('discourse')
  );
}

export function classifyProsConsSourceType(input: {
  sourceUrl?: string | null;
  sourceType?: string | null;
}): ProsConsSourceType {
  if (
    input.sourceType === 'community' ||
    input.sourceType === 'editorial' ||
    input.sourceType === 'official'
  ) {
    return input.sourceType;
  }
  if (!input.sourceUrl) return 'official';
  try {
    const hostname = new URL(input.sourceUrl).hostname.toLowerCase();
    if (isLikelyCommunityHost(hostname)) return 'community';
    if (matchesHostPattern(hostname, EDITORIAL_HOST_PATTERNS)) return 'editorial';
    return 'official';
  } catch {
    return 'official';
  }
}

export function scoreProsConsClaimSignal(input: {
  sourceType: ProsConsSourceType;
  sourceUrl?: string | null;
  sourceChannel?: 'reddit' | 'forum' | 'hn' | 'editorial' | 'other';
  claimType?: ProsConsClaimType | null;
  text?: string;
  corroboratingSourceCount?: number;
  claimConfidenceTier?: 'high' | 'medium' | 'low';
}): number {
  const sourceWeight =
    input.sourceType === 'community' ? 320 : input.sourceType === 'editorial' ? 220 : 120;
  const corroborationCount = Math.max(1, input.corroboratingSourceCount || 1);
  const corroborationWeight = Math.min(120, (corroborationCount - 1) * 40);
  const claimWeight = input.claimType === 'opinion' ? 12 : 0;
  const communityChannel =
    input.sourceType === 'community'
      ? input.sourceChannel || inferUserSignalChannelFromUrl(input.sourceUrl)
      : null;
  const communityChannelBoost =
    communityChannel === 'reddit'
      ? 24
      : communityChannel === 'hn'
        ? 18
        : communityChannel === 'forum'
          ? 14
          : communityChannel === 'other'
            ? 6
            : 0;
  const confidenceWeight =
    input.claimConfidenceTier === 'high' ? 28 : input.claimConfidenceTier === 'medium' ? 12 : 0;
  const textWeight = (input.text || '').length;
  return (
    sourceWeight +
    corroborationWeight +
    claimWeight +
    communityChannelBoost +
    confidenceWeight +
    textWeight
  );
}

export function prioritizeProsConsClaims<
  T extends {
    text?: string;
    source_type?: ProsConsSourceType;
    source_channel?: 'reddit' | 'forum' | 'hn' | 'editorial' | 'other';
    claim_type?: ProsConsClaimType;
    corroborating_source_count?: number;
    claim_confidence_tier?: 'high' | 'medium' | 'low';
    displayText?: string;
  },
>(items: T[]): T[] {
  const ranked = [...items]
    .map((item, index) => ({
      item,
      index,
      key: normalizeProsConsKey(getClaimDisplayText(item)),
      score: scoreProsConsClaimSignal({
        sourceType: item.source_type || 'official',
        sourceUrl:
          typeof (item as { source_url?: string }).source_url === 'string'
            ? (item as { source_url?: string }).source_url || null
            : null,
        sourceChannel:
          typeof item.source_channel === 'string' ? item.source_channel : undefined,
        claimType: item.claim_type,
        text: getClaimDisplayText(item),
        corroboratingSourceCount: item.corroborating_source_count,
        claimConfidenceTier: item.claim_confidence_tier,
      }),
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index);

  const deduped = dedupeRankedProsConsClaims(ranked);
  return promoteUserSignalTopSlots(deduped).map((entry) => entry.item);
}

function normalizeProsConsKey(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getClaimDisplayText<T extends { displayText?: string; text?: string }>(item: T): string {
  const display = typeof item.displayText === 'string' ? item.displayText : '';
  if (display.trim().length > 0) return display;
  return typeof item.text === 'string' ? item.text : '';
}

function dedupeRankedProsConsClaims<
  T extends { item: { displayText?: string; text?: string }; key: string },
>(ranked: T[]): T[] {
  const seen = new Set<string>();
  const deduped: T[] = [];
  for (const entry of ranked) {
    const key = entry.key || normalizeProsConsKey(getClaimDisplayText(entry.item));
    if (!key || seen.has(key)) continue;
    seen.add(key);
    deduped.push(entry);
  }
  return deduped;
}

function promoteUserSignalTopSlots<
  T extends { item: { source_type?: ProsConsSourceType }; index: number; score: number },
>(ranked: T[]): T[] {
  if (ranked.length <= 1) return ranked;
  const firstTwo = ranked.slice(0, 2);
  const hasUserSignalTop2 = firstTwo.some(
    (entry) => entry.item.source_type === 'community' || entry.item.source_type === 'editorial'
  );
  if (hasUserSignalTop2) return ranked;

  const firstUserSignalIndex = ranked.findIndex(
    (entry) => entry.item.source_type === 'community' || entry.item.source_type === 'editorial'
  );
  if (firstUserSignalIndex === -1) return ranked;

  const copy = [...ranked];
  const [userSignalEntry] = copy.splice(firstUserSignalIndex, 1);
  copy.splice(1, 0, userSignalEntry);
  return copy;
}
