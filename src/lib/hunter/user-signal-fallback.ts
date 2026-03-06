import { inferUserSignalChannelFromUrl } from '@/lib/user-signal-channel';

export type UserSignalFallbackLabel = 'pros' | 'cons';

export interface UserSignalFallbackSource {
  url: string;
  title?: string | null;
  snippet?: string | null;
  source_type?:
    | 'official'
    | 'docs'
    | 'support'
    | 'legal'
    | 'editorial'
    | 'community'
    | 'directory'
    | null;
  retrieved_at?: string | null;
}

export interface UserSignalFallbackClaim {
  text: string;
  source_url: string;
  source_type: 'community' | 'editorial';
  claim_type: 'opinion';
  corroborating_source_count: number;
  retrieved_at: string;
  claim_confidence_tier: 'medium' | 'low';
}

const CONTROL_CHARS_REGEX = /[\p{Cc}\u200B-\u200D\u2060\uFEFF]/gu;
const TERMINAL_PUNCTUATION = /[.:;!?…"'`”’)\]]+$/g;
const INCOMPLETE_CLAUSE_ENDING =
  /\b(to|for|with|from|into|onto|on|at|by|of|in|as|than|that|which|who|when|where|if|because|while|and|or|but|via|per)\s*$/i;
const COMMUNITY_HEDGING_PREFIX =
  /^(users report(?: that)?|community (?:reports|mentions|consensus (?:is|suggests)|feedback)|according to (?:reddit|hn|community)|based on user discussions)/i;
const USER_SIGNAL_POSITIVE_TOKENS =
  /\b(helpful|easy|easier|fast|faster|reliable|strong|good|great|love|useful|flexible|productive|accurate)\b/i;
const USER_SIGNAL_NEGATIVE_TOKENS =
  /\b(issue|issues|problem|problems|bug|bugs|slow|slower|limit|limits|limited|expensive|costly|confusing|friction|difficult|unstable|inconsistent|missing)\b/i;
const NEGATIVE_CUES =
  /\b(no|not|lacks|lack|doesn't|cannot|can't|won't|avoid|veto|issue|problem|risk|limit|limited|slow|expensive|broken|bug|fails|failure)\b/i;

function sanitizeNarrativeClaimText(text: string): string {
  return text.normalize('NFKC').replace(CONTROL_CHARS_REGEX, '').replace(/\s+/g, ' ').trim();
}

function stripTerminalPunctuation(text: string): string {
  return text.replace(TERMINAL_PUNCTUATION, '').trim();
}

function isRenderableClaimText(text: string): boolean {
  const cleaned = stripTerminalPunctuation(sanitizeNarrativeClaimText(text));
  if (!cleaned) return false;
  if (cleaned.length < 12) return true;
  return !INCOMPLETE_CLAUSE_ENDING.test(cleaned);
}

function hasCommunityHedgingLanguage(text: string): boolean {
  return COMMUNITY_HEDGING_PREFIX.test(stripTerminalPunctuation(sanitizeNarrativeClaimText(text)));
}

function normalizeSourceUrl(value: string): string | null {
  try {
    const parsed = new URL(value);
    parsed.hash = '';
    for (const key of Array.from(parsed.searchParams.keys())) {
      if (key.startsWith('utm_') || key === 'ref' || key === 'source') {
        parsed.searchParams.delete(key);
      }
    }
    if (parsed.pathname !== '/' && parsed.pathname.endsWith('/')) {
      parsed.pathname = parsed.pathname.slice(0, -1);
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

export function buildFallbackUserSignalClaimsFromSources(input: {
  sources: UserSignalFallbackSource[];
  label: UserSignalFallbackLabel;
  maxItems?: number;
}): UserSignalFallbackClaim[] {
  const maxItems = Math.max(1, Math.min(6, input.maxItems || 3));
  const fallback: UserSignalFallbackClaim[] = [];
  const seen = new Set<string>();

  for (const source of input.sources) {
    const sourceUrl = typeof source.url === 'string' ? normalizeSourceUrl(source.url) : null;
    if (!sourceUrl) continue;

    const channel = inferUserSignalChannelFromUrl(sourceUrl);
    const inferredSourceType: 'community' | 'editorial' | null =
      source.source_type === 'community' || channel !== 'other'
        ? 'community'
        : source.source_type === 'editorial' || source.source_type === 'directory'
          ? 'editorial'
          : null;
    if (!inferredSourceType) continue;

    const rawCandidate = `${source.snippet || ''} ${source.title || ''}`.trim();
    const cleanedCandidate = stripTerminalPunctuation(
      sanitizeNarrativeClaimText(rawCandidate) || rawCandidate
    );
    if (!cleanedCandidate || cleanedCandidate.length < 24) continue;
    if (!isRenderableClaimText(cleanedCandidate)) continue;

    const hasNegativeSignal =
      NEGATIVE_CUES.test(cleanedCandidate) || USER_SIGNAL_NEGATIVE_TOKENS.test(cleanedCandidate);
    const hasPositiveSignal = USER_SIGNAL_POSITIVE_TOKENS.test(cleanedCandidate);
    if (input.label === 'cons' && !hasNegativeSignal) continue;
    if (input.label === 'pros' && (hasNegativeSignal || !hasPositiveSignal)) continue;

    const normalizedText =
      inferredSourceType === 'community' && !hasCommunityHedgingLanguage(cleanedCandidate)
        ? `Users report ${cleanedCandidate.charAt(0).toLowerCase()}${cleanedCandidate.slice(1)}`
        : cleanedCandidate;
    const key = stripTerminalPunctuation(normalizedText).toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);

    fallback.push({
      text: normalizedText,
      source_url: sourceUrl,
      source_type: inferredSourceType,
      claim_type: 'opinion',
      corroborating_source_count: 1,
      retrieved_at: source.retrieved_at || new Date().toISOString(),
      claim_confidence_tier: inferredSourceType === 'editorial' ? 'medium' : 'low',
    });

    if (fallback.length >= maxItems) break;
  }

  return fallback;
}
