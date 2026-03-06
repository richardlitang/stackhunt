import { isLikelyIncompleteToolPageClause, stripToolPageControlChars } from '@/lib/tool-page/text';

export type ToolPageEvidenceBullet = {
  text: string;
  sourceUrl: string;
  sourceType?: 'official' | 'editorial' | 'community';
  claimType?: 'fact' | 'opinion';
  corroboratingSourceCount?: number;
  claimConfidenceTier?: 'high' | 'medium' | 'low';
  claimConfidenceScore?: number;
  works_for_lenses?: Array<'personal' | 'startup' | 'enterprise'>;
};

export type ToolPageEvidenceSource = {
  url: string;
  label?: string;
  retrievedAt?: string;
};

export type ToolPageEvidenceBulletV2 = {
  text: string;
  sources: ToolPageEvidenceSource[];
  confidence?: 'high' | 'medium' | 'low';
  kind: 'pro' | 'con' | 'tradeoff' | 'limit' | 'claim';
  requiredSourcing: boolean;
  unverified?: boolean;
};

export function toToolPageEvidenceBullet(
  claim: unknown,
  isEligibleEvidenceUrl: (url?: string | null) => boolean
): ToolPageEvidenceBullet | null {
  if (!claim || typeof claim !== 'object') return null;
  const value = claim as Record<string, unknown>;
  const rawText = typeof value.text === 'string' ? value.text : '';
  let text = rawText ? stripToolPageControlChars(rawText) : '';
  let sourceUrl = typeof value.source_url === 'string' ? value.source_url.trim() : '';
  if (rawText && rawText.includes('"text"')) {
    try {
      const nested = JSON.parse(rawText) as Record<string, unknown>;
      if (typeof nested.text === 'string') {
        text = stripToolPageControlChars(nested.text);
      }
      if (!sourceUrl && typeof nested.source_url === 'string') {
        sourceUrl = nested.source_url.trim();
      }
    } catch {
      // Keep original text/source fallback when nested payload is not valid JSON.
    }
  }
  if (
    !text ||
    isLikelyIncompleteToolPageClause(text) ||
    !sourceUrl ||
    !isEligibleEvidenceUrl(sourceUrl)
  ) {
    return null;
  }
  const sourceType =
    value.source_type === 'official' ||
    value.source_type === 'editorial' ||
    value.source_type === 'community'
      ? value.source_type
      : undefined;
  const claimType =
    value.claim_type === 'fact' || value.claim_type === 'opinion' ? value.claim_type : undefined;
  const corroboratingFromUrls = Array.isArray(value.source_urls)
    ? new Set(
        value.source_urls
          .filter((entry): entry is string => typeof entry === 'string')
          .map((entry) => entry.trim())
          .filter((entry) => entry.length > 0)
      ).size
    : 0;
  const corroboratingFromField =
    typeof value.corroborating_source_count === 'number' &&
    Number.isFinite(value.corroborating_source_count)
      ? value.corroborating_source_count
      : 0;
  const corroboratingSourceCount = Math.max(1, corroboratingFromUrls, corroboratingFromField);
  const claimConfidenceTier =
    value.claim_confidence_tier === 'high' ||
    value.claim_confidence_tier === 'medium' ||
    value.claim_confidence_tier === 'low'
      ? value.claim_confidence_tier
      : undefined;
  const claimConfidenceScore =
    typeof value.claim_confidence_score === 'number' &&
    Number.isFinite(value.claim_confidence_score)
      ? value.claim_confidence_score
      : undefined;
  const worksForLenses = Array.isArray(value.works_for_lenses)
    ? value.works_for_lenses.filter(
        (lens): lens is 'personal' | 'startup' | 'enterprise' =>
          lens === 'personal' || lens === 'startup' || lens === 'enterprise'
      )
    : undefined;
  return {
    text,
    sourceUrl,
    sourceType,
    claimType,
    corroboratingSourceCount,
    claimConfidenceTier,
    claimConfidenceScore,
    ...(worksForLenses && worksForLenses.length > 0 ? { works_for_lenses: worksForLenses } : {}),
  };
}

export function buildToolPageEvidenceBulletV2({
  text,
  kind,
  sourceUrl,
  sourceLabel,
  retrievedAt,
  requiredSourcing,
  isEligibleEvidenceUrl,
}: {
  text: string;
  kind: ToolPageEvidenceBulletV2['kind'];
  sourceUrl?: string | null;
  sourceLabel?: string;
  retrievedAt?: string;
  requiredSourcing: boolean;
  isEligibleEvidenceUrl: (url?: string | null) => boolean;
}): ToolPageEvidenceBulletV2 | null {
  const cleaned = stripToolPageControlChars(text);
  if (!cleaned || isLikelyIncompleteToolPageClause(cleaned)) return null;
  const sources: ToolPageEvidenceSource[] =
    sourceUrl && isEligibleEvidenceUrl(sourceUrl)
      ? [{ url: sourceUrl, label: sourceLabel, retrievedAt }]
      : [];
  if (requiredSourcing && sources.length === 0) {
    const checkedAt = retrievedAt || 'the latest verification date';
    return {
      text: `We couldn't confirm this claim in official docs as of ${checkedAt}. Verify with the vendor before purchase.`,
      sources: [],
      confidence: 'low',
      kind,
      requiredSourcing,
      unverified: true,
    };
  }
  return {
    text: cleaned,
    sources,
    confidence: sources.length > 0 ? 'high' : 'medium',
    kind,
    requiredSourcing,
    unverified: false,
  };
}
