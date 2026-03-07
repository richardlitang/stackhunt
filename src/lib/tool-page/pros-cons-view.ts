import { inferUserSignalChannelFromUrl } from '@/lib/user-signal-channel';

interface ToolPageEvidenceBulletLike {
  text: string;
  sourceUrl: string | null;
}

export interface ToolPageProsConsEntry {
  text: string;
  source_url: string | null;
  source_type?: 'official' | 'editorial' | 'community';
  source_channel?: 'reddit' | 'forum' | 'hn' | 'editorial' | 'other';
  claim_type?: 'fact' | 'opinion';
  corroborating_source_count?: number;
  claim_confidence_tier?: 'high' | 'medium' | 'low';
  claim_confidence_score?: number;
}

interface BuildToolPageProsConsViewInput {
  pros: Array<
    ToolPageEvidenceBulletLike & {
      sourceType?: 'official' | 'editorial' | 'community';
      sourceChannel?: 'reddit' | 'forum' | 'hn' | 'editorial' | 'other';
      claimType?: 'fact' | 'opinion';
      corroboratingSourceCount?: number;
      claimConfidenceTier?: 'high' | 'medium' | 'low';
      claimConfidenceScore?: number;
    }
  >;
  cons: Array<
    ToolPageEvidenceBulletLike & {
      sourceType?: 'official' | 'editorial' | 'community';
      sourceChannel?: 'reddit' | 'forum' | 'hn' | 'editorial' | 'other';
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

function deriveSourceChannelFromUrl(
  sourceType: 'official' | 'editorial' | 'community' | undefined,
  sourceUrl: string | null,
  sourceUrls?: string[]
): 'reddit' | 'forum' | 'hn' | 'editorial' | 'other' | undefined {
  if (sourceType === 'editorial') return 'editorial';
  if (sourceType === 'community') {
    if (Array.isArray(sourceUrls) && sourceUrls.length > 0) {
      for (const candidate of sourceUrls) {
        const channel = inferUserSignalChannelFromUrl(candidate);
        if (channel !== 'other') return channel;
      }
    }
    return inferUserSignalChannelFromUrl(sourceUrl);
  }
  return undefined;
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
  const sourceChannel =
    value.source_channel === 'reddit' ||
    value.source_channel === 'forum' ||
    value.source_channel === 'hn' ||
    value.source_channel === 'editorial' ||
    value.source_channel === 'other'
      ? value.source_channel
      : value.sourceChannel === 'reddit' ||
          value.sourceChannel === 'forum' ||
          value.sourceChannel === 'hn' ||
          value.sourceChannel === 'editorial' ||
          value.sourceChannel === 'other'
        ? value.sourceChannel
        : undefined;
  const sourceUrls = Array.isArray(value.source_urls)
    ? value.source_urls.filter((entry): entry is string => typeof entry === 'string')
    : Array.isArray(value.sourceUrls)
      ? value.sourceUrls.filter((entry): entry is string => typeof entry === 'string')
      : [];
  const corroboratingSourceCount =
    typeof value.corroborating_source_count === 'number'
      ? value.corroborating_source_count
      : typeof value.corroboratingSourceCount === 'number'
        ? value.corroboratingSourceCount
        : sourceUrls.length > 0
          ? sourceUrls.length
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
  const claimConfidenceScore =
    typeof value.claim_confidence_score === 'number'
      ? value.claim_confidence_score
      : typeof value.claimConfidenceScore === 'number'
        ? value.claimConfidenceScore
        : undefined;

  return {
    text,
    source_url: sourceUrl,
    ...(sourceType ? { source_type: sourceType } : {}),
    ...(sourceChannel || deriveSourceChannelFromUrl(sourceType, sourceUrl, sourceUrls)
      ? {
          source_channel:
            sourceChannel || deriveSourceChannelFromUrl(sourceType, sourceUrl, sourceUrls),
        }
      : {}),
    ...(claimType ? { claim_type: claimType } : {}),
    ...(typeof corroboratingSourceCount === 'number'
      ? { corroborating_source_count: corroboratingSourceCount }
      : {}),
    ...(claimConfidenceTier ? { claim_confidence_tier: claimConfidenceTier } : {}),
    ...(typeof claimConfidenceScore === 'number'
      ? { claim_confidence_score: claimConfidenceScore }
      : {}),
  };
}

export function buildToolPageProsConsView(input: BuildToolPageProsConsViewInput): {
  pros: ToolPageProsConsEntry[];
  cons: ToolPageProsConsEntry[];
  userSignalPros: ToolPageProsConsEntry[];
  userSignalCons: ToolPageProsConsEntry[];
} {
  const userReportedPros = (input.userReportedPros || [])
    .map(normalizeUserReportedEntry)
    .filter((entry): entry is ToolPageProsConsEntry => Boolean(entry));
  const userReportedCons = (input.userReportedCons || [])
    .map(normalizeUserReportedEntry)
    .filter((entry): entry is ToolPageProsConsEntry => Boolean(entry));

  return {
    pros: input.pros.map((entry) => ({
      text: entry.text,
      source_url: entry.sourceUrl,
      ...(entry.sourceType ? { source_type: entry.sourceType } : {}),
      ...(entry.sourceChannel || deriveSourceChannelFromUrl(entry.sourceType, entry.sourceUrl)
        ? {
            source_channel:
              entry.sourceChannel || deriveSourceChannelFromUrl(entry.sourceType, entry.sourceUrl),
          }
        : {}),
      ...(entry.claimType ? { claim_type: entry.claimType } : {}),
      ...(typeof entry.corroboratingSourceCount === 'number'
        ? { corroborating_source_count: entry.corroboratingSourceCount }
        : {}),
      ...(entry.claimConfidenceTier ? { claim_confidence_tier: entry.claimConfidenceTier } : {}),
      ...(typeof entry.claimConfidenceScore === 'number'
        ? { claim_confidence_score: entry.claimConfidenceScore }
        : {}),
    })),
    cons: input.cons.map((entry) => ({
      text: entry.text,
      source_url: entry.sourceUrl,
      ...(entry.sourceType ? { source_type: entry.sourceType } : {}),
      ...(entry.sourceChannel || deriveSourceChannelFromUrl(entry.sourceType, entry.sourceUrl)
        ? {
            source_channel:
              entry.sourceChannel || deriveSourceChannelFromUrl(entry.sourceType, entry.sourceUrl),
          }
        : {}),
      ...(entry.claimType ? { claim_type: entry.claimType } : {}),
      ...(typeof entry.corroboratingSourceCount === 'number'
        ? { corroborating_source_count: entry.corroboratingSourceCount }
        : {}),
      ...(entry.claimConfidenceTier ? { claim_confidence_tier: entry.claimConfidenceTier } : {}),
      ...(typeof entry.claimConfidenceScore === 'number'
        ? { claim_confidence_score: entry.claimConfidenceScore }
        : {}),
    })),
    userSignalPros: userReportedPros,
    userSignalCons: userReportedCons,
  };
}
