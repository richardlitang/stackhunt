interface ToolPageEvidenceBulletLike {
  text: string;
  sourceUrl: string | null;
}

export interface ToolPageProsConsEntry {
  text: string;
  source_url: string | null;
  source_type?: 'official' | 'editorial' | 'community';
  claim_type?: 'fact' | 'opinion';
  corroborating_source_count?: number;
  claim_confidence_tier?: 'high' | 'medium' | 'low';
  claim_confidence_score?: number;
}

interface BuildToolPageProsConsViewInput {
  pros: Array<
    ToolPageEvidenceBulletLike & {
      sourceType?: 'official' | 'editorial' | 'community';
      claimType?: 'fact' | 'opinion';
      corroboratingSourceCount?: number;
      claimConfidenceTier?: 'high' | 'medium' | 'low';
      claimConfidenceScore?: number;
    }
  >;
  cons: Array<
    ToolPageEvidenceBulletLike & {
      sourceType?: 'official' | 'editorial' | 'community';
      claimType?: 'fact' | 'opinion';
      corroboratingSourceCount?: number;
      claimConfidenceTier?: 'high' | 'medium' | 'low';
      claimConfidenceScore?: number;
    }
  >;
  userReportedPros?: Array<Record<string, unknown>>;
  userReportedCons?: Array<Record<string, unknown>>;
}

function toNonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function toSourceType(value: unknown): 'official' | 'editorial' | 'community' | undefined {
  return value === 'official' || value === 'editorial' || value === 'community' ? value : undefined;
}

function normalizeUserReportedEntry(value: Record<string, unknown>): ToolPageProsConsEntry | null {
  const text = toNonEmptyString(value.text || value.claim);
  if (!text) return null;
  const sourceUrl = toNonEmptyString(value.source_url || value.sourceUrl);
  const sourceType =
    toSourceType(value.source_type || value.sourceType) ||
    (toNonEmptyString(value.source_domain || value.sourceDomain) ? 'community' : undefined);
  const claimType =
    value.claim_type === 'fact' || value.claim_type === 'opinion' ? value.claim_type : undefined;
  const corroboratingSourceCount =
    typeof value.corroborating_source_count === 'number'
      ? value.corroborating_source_count
      : typeof value.corroboratingSourceCount === 'number'
        ? value.corroboratingSourceCount
        : undefined;
  const claimConfidenceTier =
    value.claim_confidence_tier === 'high' ||
    value.claim_confidence_tier === 'medium' ||
    value.claim_confidence_tier === 'low'
      ? value.claim_confidence_tier
      : value.claimConfidenceTier === 'high' ||
          value.claimConfidenceTier === 'medium' ||
          value.claimConfidenceTier === 'low'
        ? value.claimConfidenceTier
        : undefined;

  return {
    text,
    source_url: sourceUrl,
    ...(sourceType ? { source_type: sourceType } : {}),
    ...(claimType ? { claim_type: claimType } : {}),
    ...(typeof corroboratingSourceCount === 'number'
      ? { corroborating_source_count: corroboratingSourceCount }
      : {}),
    ...(claimConfidenceTier ? { claim_confidence_tier: claimConfidenceTier } : {}),
  };
}

export function buildToolPageProsConsView(input: BuildToolPageProsConsViewInput): {
  pros: ToolPageProsConsEntry[];
  cons: ToolPageProsConsEntry[];
} {
  const userReportedPros = (input.userReportedPros || [])
    .map(normalizeUserReportedEntry)
    .filter((entry): entry is ToolPageProsConsEntry => Boolean(entry));
  const userReportedCons = (input.userReportedCons || [])
    .map(normalizeUserReportedEntry)
    .filter((entry): entry is ToolPageProsConsEntry => Boolean(entry));

  return {
    pros: [
      ...input.pros.map((entry) => ({
        text: entry.text,
        source_url: entry.sourceUrl,
        ...(entry.sourceType ? { source_type: entry.sourceType } : {}),
        ...(entry.claimType ? { claim_type: entry.claimType } : {}),
        ...(typeof entry.corroboratingSourceCount === 'number'
          ? { corroborating_source_count: entry.corroboratingSourceCount }
          : {}),
        ...(entry.claimConfidenceTier ? { claim_confidence_tier: entry.claimConfidenceTier } : {}),
        ...(typeof entry.claimConfidenceScore === 'number'
          ? { claim_confidence_score: entry.claimConfidenceScore }
          : {}),
      })),
      ...userReportedPros,
    ],
    cons: [
      ...input.cons.map((entry) => ({
        text: entry.text,
        source_url: entry.sourceUrl,
        ...(entry.sourceType ? { source_type: entry.sourceType } : {}),
        ...(entry.claimType ? { claim_type: entry.claimType } : {}),
        ...(typeof entry.corroboratingSourceCount === 'number'
          ? { corroborating_source_count: entry.corroboratingSourceCount }
          : {}),
        ...(entry.claimConfidenceTier ? { claim_confidence_tier: entry.claimConfidenceTier } : {}),
        ...(typeof entry.claimConfidenceScore === 'number'
          ? { claim_confidence_score: entry.claimConfidenceScore }
          : {}),
      })),
      ...userReportedCons,
    ],
  };
}
