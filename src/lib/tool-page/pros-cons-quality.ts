const TERMINAL_PUNCTUATION = /[.:;!?…"'`”’)\]]+$/g;
const CONTROL_CHARS_REGEX = /[\p{Cc}\u200B-\u200D\u2060\uFEFF]/gu;

const LOW_SIGNAL_PATTERNS = [
  /\bsupports?\s+core\s+workflows?\b/i,
  /\bhelps?\s+teams?\s+work\s+better\b/i,
  /\bimproves?\s+productivity\b/i,
  /\beasy\s+to\s+use\b/i,
  /\bmodern\s+interface\b/i,
];

const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'by',
  'for',
  'from',
  'in',
  'is',
  'it',
  'of',
  'on',
  'or',
  'the',
  'to',
  'with',
]);

export function stripProsConsControlChars(value: string): string {
  return value.normalize('NFKC').replace(CONTROL_CHARS_REGEX, '').replace(/\s+/g, ' ').trim();
}

export function normalizeProsConsClaimKey(value: string): string {
  return stripProsConsControlChars(value)
    .replace(TERMINAL_PUNCTUATION, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizeClaim(value: string): Set<string> {
  return new Set(
    normalizeProsConsClaimKey(value)
      .split(' ')
      .map((token) => token.trim())
      .filter((token) => token.length > 2 && !STOP_WORDS.has(token))
  );
}

function hasNearDuplicate(existing: string[], candidate: string): boolean {
  const candidateTokens = tokenizeClaim(candidate);
  if (candidateTokens.size === 0) return false;

  return existing.some((value) => {
    const existingTokens = tokenizeClaim(value);
    if (existingTokens.size === 0) return false;
    let overlap = 0;
    for (const token of candidateTokens) {
      if (existingTokens.has(token)) overlap++;
    }
    const denominator = Math.min(existingTokens.size, candidateTokens.size);
    return denominator > 0 && overlap / denominator >= 0.75;
  });
}

export function isLowSignalProsConsClaim(text: string): boolean {
  const normalized = normalizeProsConsClaimKey(text);
  if (!normalized) return true;
  return LOW_SIGNAL_PATTERNS.some((pattern) => pattern.test(normalized));
}

export interface FinalizeProsConsClaimsResult<T> {
  items: T[];
  droppedDuplicates: number;
  droppedLowSignal: number;
}

export function finalizeProsConsClaims<T extends { displayText: string }>(
  items: T[]
): FinalizeProsConsClaimsResult<T> {
  const seen = new Set<string>();
  const acceptedDisplayTexts: string[] = [];
  const unique: T[] = [];
  let droppedDuplicates = 0;
  let droppedLowSignal = 0;

  for (const item of items) {
    const key = normalizeProsConsClaimKey(item.displayText);
    if (!key) continue;
    if (seen.has(key) || hasNearDuplicate(acceptedDisplayTexts, item.displayText)) {
      droppedDuplicates++;
      continue;
    }
    seen.add(key);
    if (isLowSignalProsConsClaim(item.displayText)) {
      droppedLowSignal++;
      continue;
    }
    acceptedDisplayTexts.push(item.displayText);
    unique.push(item);
  }

  return { items: unique, droppedDuplicates, droppedLowSignal };
}
