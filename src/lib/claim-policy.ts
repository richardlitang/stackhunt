export type ClaimVolatility = 'high' | 'medium' | 'low';
export type ClaimVerificationMethod = 'source_presence' | 'cross_source' | 'manual_review';

export const CLAIM_VOLATILITY_TTL_DAYS: Record<ClaimVolatility, number> = {
  high: 30,
  medium: 90,
  low: 180,
};

const HIGH_VOLATILITY_TERMS =
  /\b(price|pricing|cost|billing|plan|tier|trial|free tier|free trial|seat|availability|deprecated|model|version|quota|limit|token|security|compliance|soc ?2|hipaa|gdpr|sso)\b/i;
const MEDIUM_VOLATILITY_TERMS =
  /\b(feature|integration|api|support|export|import|performance|latency|uptime|setup)\b/i;
const SCOPE_TERMS =
  /\b(as of|self-serve|public pricing|enterprise|business|team|starter|pro|region|country|us|eu|uk|usd|eur|gbp|monthly|annual|per seat|per user)\b/i;

const RISKY_COPY_PATTERNS: Array<{ key: string; pattern: RegExp }> = [
  { key: 'verified', pattern: /\bverified\b/i },
  { key: 'guaranteed', pattern: /\bguaranteed\b/i },
  { key: 'accurate', pattern: /\baccurate\b/i },
  { key: 'best', pattern: /\bbest\b/i },
  { key: 'no_free_tier', pattern: /\bno free tier\b/i },
];

export function classifyClaimVolatility(
  text: string,
  claimType: 'fact' | 'opinion' = 'opinion'
): ClaimVolatility {
  if (HIGH_VOLATILITY_TERMS.test(text)) return 'high';
  if (MEDIUM_VOLATILITY_TERMS.test(text)) return 'medium';
  return claimType === 'fact' ? 'medium' : 'low';
}

export function computeClaimRecheckBy(
  checkedAt: string | null | undefined,
  volatility: ClaimVolatility
): string | null {
  if (!checkedAt) return null;
  const parsed = new Date(checkedAt);
  if (Number.isNaN(parsed.getTime())) return null;
  const next = new Date(parsed.getTime() + CLAIM_VOLATILITY_TTL_DAYS[volatility] * 86400000);
  return next.toISOString();
}

export function isClaimStale(
  checkedAt: string | null | undefined,
  volatility: ClaimVolatility
): boolean {
  if (!checkedAt) return true;
  const recheckBy = computeClaimRecheckBy(checkedAt, volatility);
  if (!recheckBy) return true;
  return new Date(recheckBy).getTime() < Date.now();
}

export function hasScopeQualifier(text: string): boolean {
  return SCOPE_TERMS.test(text);
}

export function inferClaimScope(text: string, sourceUrl?: string | null): string | null {
  const hints: string[] = [];
  if (/\benterprise|business|team|starter|pro\b/i.test(text)) hints.push('plan');
  if (/\bmonthly|annual|per seat|per user|billing\b/i.test(text)) hints.push('billing cadence');
  if (/\busd|eur|gbp|us|eu|uk|region|country\b/i.test(text)) hints.push('region/currency');
  if (sourceUrl && /\/(pricing|plans?|subscription)/i.test(sourceUrl)) hints.push('pricing page');
  if (hints.length === 0) return null;
  return Array.from(new Set(hints)).join(', ');
}

export function detectRiskyCopyTerms(text: string): string[] {
  const hits = RISKY_COPY_PATTERNS.filter((entry) => entry.pattern.test(text)).map(
    (entry) => entry.key
  );
  if (hits.includes('best') && /\bbest for\b/i.test(text)) {
    return hits.filter((hit) => hit !== 'best');
  }
  if (hits.includes('no_free_tier') && hasScopeQualifier(text)) {
    return hits.filter((hit) => hit !== 'no_free_tier');
  }
  return hits;
}
