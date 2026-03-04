const TERMINAL_PUNCTUATION = /[.:;!?…"'`”’)\]]+$/g;
const CONTROL_CHARS_REGEX = /[\p{Cc}\u200B-\u200D\u2060\uFEFF]/gu;

export function stripToolPageControlChars(value: string): string {
  return value.normalize('NFKC').replace(CONTROL_CHARS_REGEX, '').replace(/\s+/g, ' ').trim();
}

export function isLikelyIncompleteToolPageClause(value: string): boolean {
  const text = stripToolPageControlChars(value).replace(TERMINAL_PUNCTUATION, '').trim();
  if (!text) return true;
  const lower = text.toLowerCase();
  if (lower.length < 12) return false;
  if (/\b(price increase|cost increase)\b/.test(lower) && !/\d/.test(lower)) return true;
  if (
    /\b(approximately|about|around)\b/.test(lower) &&
    !/\b(approximately|about|around)\s*(?:\$|€|£)?\d/.test(lower)
  ) {
    return true;
  }
  return /\b(to|for|with|from|into|onto|on|at|by|of|in|as|than|that|which|who|when|where|if|because|while|and|or|but|via|per)\s*$/.test(
    lower
  );
}

export function extractToolPageClaimText(claim: unknown): string {
  if (typeof claim === 'string') {
    const cleaned = stripToolPageControlChars(claim);
    return isLikelyIncompleteToolPageClause(cleaned) ? '' : cleaned;
  }
  if (
    claim &&
    typeof claim === 'object' &&
    typeof (claim as Record<string, unknown>).text === 'string'
  ) {
    const cleaned = stripToolPageControlChars((claim as Record<string, unknown>).text as string);
    return isLikelyIncompleteToolPageClause(cleaned) ? '' : cleaned;
  }
  return '';
}

export function cleanToolPageDecisionText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const cleaned = stripToolPageControlChars(
    value
      .trim()
      .replace(/^[-\u2022]\s*/, '')
      .replace(/^avoid if\s*/i, '')
      .replace(/^not for\s*/i, '')
      .replace(/^weak fit:\s*/i, '')
      .replace(/^best fit:\s*/i, '')
      .replace(/^best when\s*/i, '')
      .replace(/\s+/g, ' ')
  );
  if (!cleaned || isLikelyIncompleteToolPageClause(cleaned)) return null;
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

export function cleanToolPageNarrativeText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const cleaned = stripToolPageControlChars(
    value
      .trim()
      .replace(/^[-\u2022]\s*/, '')
      .replace(/\s+/g, ' ')
  );
  if (!cleaned || isLikelyIncompleteToolPageClause(cleaned)) return null;
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

export function cleanToolPageDecisionSlotText(
  value: unknown,
  slot: 'best_fit' | 'weak_fit' | 'tradeoff'
): string | null {
  if (typeof value !== 'string') return null;
  const stripped = value
    .trim()
    .replace(/^[-\u2022]\s*/, '')
    .replace(/^best fit:\s*/i, '')
    .replace(/^weak fit:\s*/i, '')
    .replace(/^tradeoff:\s*/i, '')
    .replace(/^best for(?:\s+teams?)?(?:\s+where)?\s*/i, '')
    .replace(/^not for(?:\s+teams?)?(?:\s+where)?\s*/i, '')
    .replace(/^avoid if\s*/i, '')
    .replace(/^main tradeoff:\s*/i, '')
    .replace(/\s+/g, ' ');
  const cleaned = stripToolPageControlChars(stripped);
  if (!cleaned || isLikelyIncompleteToolPageClause(cleaned)) return null;
  if (slot === 'tradeoff' && cleaned.length < 10) return null;
  if (slot !== 'tradeoff' && cleaned.length < 8) return null;
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

export function uniqueToolPageDecisionText(items: Array<unknown>): string[] {
  const seen = new Set<string>();
  return items
    .map((item) => cleanToolPageDecisionText(item))
    .filter((item): item is string => Boolean(item))
    .filter((item) => {
      const key = item.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}
