export const BLOCKED_EVIDENCE_DOMAINS = new Set([
  'reddit.com',
  'ycombinator.com',
  'g2.com',
  'capterra.com',
  'trustpilot.com',
  'stackexchange.com',
  'stackoverflow.com',
]);

export function isBlockedEvidenceDomain(hostname: string): boolean {
  const normalized = hostname
    .trim()
    .toLowerCase()
    .replace(/^www\./, '');
  if (!normalized) return true;
  return Array.from(BLOCKED_EVIDENCE_DOMAINS).some(
    (blockedDomain) => normalized === blockedDomain || normalized.endsWith(`.${blockedDomain}`)
  );
}

export function isEligibleEvidenceUrl(url?: string | null): boolean {
  if (!url) return false;
  try {
    const hostname = new URL(url).hostname;
    return !isBlockedEvidenceDomain(hostname);
  } catch {
    return false;
  }
}

export function countEligibleEvidenceDomains(domains: Iterable<string>): number {
  let count = 0;
  for (const domain of domains) {
    if (!isBlockedEvidenceDomain(domain)) {
      count += 1;
    }
  }
  return count;
}
