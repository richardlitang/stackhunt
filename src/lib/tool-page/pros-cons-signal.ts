type ProsConsSourceType = 'official' | 'editorial' | 'community';
type ProsConsClaimType = 'fact' | 'opinion';

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
  return hostname.includes('forum') || hostname.includes('community') || hostname.includes('discourse');
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
  claimType?: ProsConsClaimType | null;
  text?: string;
  corroboratingSourceCount?: number;
}): number {
  const sourceWeight =
    input.sourceType === 'community' ? 320 : input.sourceType === 'editorial' ? 220 : 120;
  const corroborationCount = Math.max(1, input.corroboratingSourceCount || 1);
  const corroborationWeight = Math.min(120, (corroborationCount - 1) * 40);
  const claimWeight = input.claimType === 'opinion' ? 12 : 0;
  const textWeight = (input.text || '').length;
  return sourceWeight + corroborationWeight + claimWeight + textWeight;
}

export function prioritizeProsConsClaims<
  T extends {
    source_type?: ProsConsSourceType;
    claim_type?: ProsConsClaimType;
    corroborating_source_count?: number;
    displayText: string;
  },
>(items: T[]): T[] {
  return [...items]
    .map((item, index) => ({
      item,
      index,
      score: scoreProsConsClaimSignal({
        sourceType: item.source_type || 'official',
        claimType: item.claim_type,
        text: item.displayText,
        corroboratingSourceCount: item.corroborating_source_count,
      }),
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((entry) => entry.item);
}
