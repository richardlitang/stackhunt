const LOW_SIGNAL_USER_CLAIM_PATTERNS: RegExp[] = [
  /\bsupports core workflows?\b/i,
  /\bimproves day[- ]to[- ]day execution\b/i,
  /\bhelpful for teams?\b/i,
  /\bgood for teams?\b/i,
  /\bstrong option for\b/i,
  /\bworks well for\b/i,
  /\boffers flexibility\b/i,
  /\bpowerful platform\b/i,
];

const USER_VOICE_MARKERS = [
  /\b(i|we|my|our)\b/i,
  /\busers report\b/i,
  /\breviewers (?:say|note|mention|report)\b/i,
  /\baccording to (?:reddit|hn|community)\b/i,
  /\bon reddit\b/i,
  /\bon hacker news\b/i,
  /\bcommunity (?:feedback|reports|mentions)\b/i,
];

const USER_EXPERIENCE_MARKERS = [
  /\bfriction\b/i,
  /\bworkflow\b/i,
  /\bonboarding\b/i,
  /\bdedupe\b/i,
  /\bpermissions?\b/i,
  /\breporting\b/i,
  /\bsetup\b/i,
  /\bseat(?:s)?\b/i,
  /\bpricing\b/i,
  /\bupgrade\b/i,
  /\bbug(?:s)?\b/i,
  /\bslow\b/i,
];

function normalizeUserSignalText(value: string): string {
  return value.normalize('NFKC').replace(/\s+/g, ' ').trim();
}

export function isLowSignalUserClaimText(value?: string | null): boolean {
  if (!value) return true;
  const text = normalizeUserSignalText(value);
  if (text.length < 12) return true;
  return LOW_SIGNAL_USER_CLAIM_PATTERNS.some((pattern) => pattern.test(text));
}

export function hasUserVoiceEvidence(value?: string | null): boolean {
  if (!value) return false;
  const text = normalizeUserSignalText(value);
  return USER_VOICE_MARKERS.some((pattern) => pattern.test(text));
}

export function scoreUserVoiceStrength(value?: string | null): number {
  if (!value) return 0;
  const text = normalizeUserSignalText(value);
  let score = 0;
  if (hasUserVoiceEvidence(text)) score += 18;
  const markerHits = USER_EXPERIENCE_MARKERS.filter((pattern) => pattern.test(text)).length;
  score += Math.min(12, markerHits * 3);
  if (isLowSignalUserClaimText(text)) score -= 16;
  return score;
}
