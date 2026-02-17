import { evaluateIndexReadiness } from '@/lib/quality-gate';
import { normalizeTextContent as normalizeText } from '@/lib/utils/content-sanitizer';
import type { Review, Tool } from '@/types/database';

const AUTHORITATIVE_SOURCE_TYPES = new Set(['official', 'docs', 'support', 'legal']);
const RISKY_ABSOLUTE_TERMS =
  /\b(always|never|broken|scam|unreliable|guaranteed|everyone|nobody)\b/i;
const NEGATIVE_CLAIM_TERMS =
  /\b(no|not|lacks|lack|cannot|can't|does not|doesn't|won't|avoid|risk|limit|limited|missing|unavailable)\b/i;
const PRICING_CLAIM_TERMS =
  /\b(price|pricing|cost|costs|fee|fees|billing|billed|monthly|annual|yearly|enterprise|pro\b|max\b|plan|seat)\b/i;
const PRICING_NUMERIC_TERMS = /\$|\/\s*(mo|month|yr|year)|\b\d+(?:\.\d+)?\s*(?:usd|dollars?)\b/i;
const COMPARATOR_TERMS =
  /\b(vs\.?|versus|compared to|more than|less than|faster than|slower than|better than|worse than|double|doubles|doubling|half|halve)\b/i;
const OFFICIAL_PRICING_PATH = /\/(pricing|plans?|subscription)/i;
const OFFICIAL_DOC_PATH =
  /\/(docs?|help|support|developers?|api|changelog|release|updates|status)/i;
const CLAIM_SOURCE_FALLBACK_PATH =
  /\/(pricing|plans?|docs?|help|support|developers?|api|security|trust|legal)/i;

type SourceRow = {
  url?: string;
  domain?: string;
  source_type?: string;
  type?: string;
};

type ParsedClaim = {
  text: string;
  sourceUrl: string | null;
};


type PublishableItemFields = Pick<
  Tool,
  | 'id'
  | 'metadata'
  | 'specs'
  | 'pricing_verified_at'
  | 'short_description'
  | 'verdict'
  | 'updated_at'
> & {
  pricing_confidence?: string | number | null;
};

type PublishableReviewFields = Pick<Review, 'summary_markdown' | 'cons' | 'sources'>;

export interface StrictPublishGateResult {
  pass: boolean;
  blockers: string[];
  evidenceGrade: 'A' | 'B' | 'C';
  metrics: {
    requiredSourcingMissingCount: number;
    riskFlagsCount: number;
    pricingConfidence: 'high' | 'medium' | 'low' | 'unknown';
  };
}

function normalizeDomain(input?: string): string | null {
  if (!input) return null;
  const trimmed = input
    .trim()
    .toLowerCase()
    .replace(/^www\./, '');
  return trimmed || null;
}

function extractDomainFromUrl(url?: string): string | null {
  if (!url) return null;
  try {
    return normalizeDomain(new URL(url).hostname);
  } catch {
    return null;
  }
}

function toSources(raw: unknown): SourceRow[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((entry): entry is SourceRow => Boolean(entry && typeof entry === 'object'));
}

function parseClaim(raw: unknown): ParsedClaim | null {
  if (typeof raw === 'string') {
    const text = normalizeText(raw);
    if (!text) return null;
    return { text, sourceUrl: null };
  }
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Record<string, unknown>;
  const text = typeof value.text === 'string' ? normalizeText(value.text) : '';
  const sourceUrl = typeof value.source_url === 'string' ? value.source_url.trim() : '';
  if (!text) return null;
  return { text, sourceUrl: sourceUrl || null };
}

function toClaimArray(raw: unknown): ParsedClaim[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(parseClaim).filter((entry): entry is ParsedClaim => Boolean(entry));
}

function toPricingConfidence(
  raw: string | number | null | undefined
): 'high' | 'medium' | 'low' | 'unknown' {
  if (typeof raw === 'string') {
    const normalized = raw.toLowerCase();
    if (normalized === 'high' || normalized === 'medium' || normalized === 'low') return normalized;
    return 'unknown';
  }
  if (typeof raw === 'number') {
    if (raw >= 0.75) return 'high';
    if (raw >= 0.5) return 'medium';
    return 'low';
  }
  return 'unknown';
}

export function evaluateStrictPublishGate(
  item: PublishableItemFields,
  review: PublishableReviewFields
): StrictPublishGateResult {
  const blockers: string[] = [];
  const readiness = evaluateIndexReadiness(item as Tool, review as Review);
  blockers.push(...readiness.reasons.map((reason) => `quality_gate:${reason}`));

  const sources = toSources(review.sources);
  const authoritativeDomains = new Set<string>();
  let hasOfficialPricingSource = false;
  let hasOfficialDocOrHelpSource = false;

  for (const source of sources) {
    const domain = normalizeDomain(source.domain) || extractDomainFromUrl(source.url);
    const sourceType = (source.source_type || source.type || '').toLowerCase();
    const lowerUrl = (source.url || '').toLowerCase();
    if (AUTHORITATIVE_SOURCE_TYPES.has(sourceType) && domain) {
      authoritativeDomains.add(domain);
    }
    if (AUTHORITATIVE_SOURCE_TYPES.has(sourceType) || CLAIM_SOURCE_FALLBACK_PATH.test(lowerUrl)) {
      if (OFFICIAL_PRICING_PATH.test(lowerUrl)) hasOfficialPricingSource = true;
      if (OFFICIAL_DOC_PATH.test(lowerUrl)) hasOfficialDocOrHelpSource = true;
    }
  }

  const evidenceGrade: 'A' | 'B' | 'C' =
    authoritativeDomains.size >= 2 &&
    hasOfficialPricingSource &&
    hasOfficialDocOrHelpSource &&
    sources.length >= 3
      ? 'A'
      : authoritativeDomains.size >= 1 && (hasOfficialPricingSource || hasOfficialDocOrHelpSource)
        ? 'B'
        : 'C';
  if (evidenceGrade !== 'A') blockers.push(`strict:evidence_grade_${evidenceGrade.toLowerCase()}`);

  const consClaims = toClaimArray(review.cons);
  const requiredSourcingMissingCount = consClaims.filter((claim) => {
    const required = NEGATIVE_CLAIM_TERMS.test(claim.text) || PRICING_CLAIM_TERMS.test(claim.text);
    if (!required) return false;
    return !claim.sourceUrl;
  }).length;
  if (requiredSourcingMissingCount > 0) {
    blockers.push(`strict:required_sourcing_missing:${requiredSourcingMissingCount}`);
  }

  const summaryText = normalizeText(review.summary_markdown || '');
  let riskFlagsCount = 0;
  if (RISKY_ABSOLUTE_TERMS.test(summaryText)) riskFlagsCount += 1;
  if (COMPARATOR_TERMS.test(summaryText) && sources.length < 2) riskFlagsCount += 1;
  for (const claim of consClaims) {
    if (RISKY_ABSOLUTE_TERMS.test(claim.text)) riskFlagsCount += 1;
    if (COMPARATOR_TERMS.test(claim.text) && !claim.sourceUrl) riskFlagsCount += 1;
  }
  if (riskFlagsCount > 0) blockers.push(`strict:risk_flags:${riskFlagsCount}`);

  const pricingConfidence = toPricingConfidence(item.pricing_confidence);
  const hasNumericPricingClaims =
    PRICING_NUMERIC_TERMS.test(summaryText) ||
    consClaims.some((claim) => PRICING_NUMERIC_TERMS.test(claim.text));
  if (!['high', 'medium'].includes(pricingConfidence) && hasNumericPricingClaims) {
    blockers.push('strict:pricing_confidence_low_or_unknown_with_numeric_claims');
  }

  return {
    pass: blockers.length === 0,
    blockers: Array.from(new Set(blockers)),
    evidenceGrade,
    metrics: {
      requiredSourcingMissingCount,
      riskFlagsCount,
      pricingConfidence,
    },
  };
}
