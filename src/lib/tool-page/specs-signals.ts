import type { ReviewLens } from '@/lib/tool-page/view-model';

type UserReportedClaim = Record<string, unknown>;

interface UserSignalSummary {
  community_cons?: number;
  community_pros?: number;
  editorial_cons?: number;
  editorial_pros?: number;
  corroborating_community_domains?: number;
  community_domains?: string[];
  reddit_claims?: number;
  forum_claims?: number;
  hn_claims?: number;
  top_user_reported_claims?: Array<{
    text?: string;
    source_type?: 'community' | 'editorial';
    source_domain?: string | null;
    source_channel?: 'reddit' | 'forum' | 'hn' | 'editorial' | 'other';
  }>;
}

interface ToolPageTopUserReportedClaim {
  text: string;
  source_type?: 'community' | 'editorial';
  source_domain?: string | null;
}

interface BuildToolPageSpecsSignalsInput {
  specs: unknown;
  userReportedPros: UserReportedClaim[];
  userReportedCons: UserReportedClaim[];
  activeReviewLens: ReviewLens;
}

function normalizeTopUserReportedClaim(
  claim: UserReportedClaim
): ToolPageTopUserReportedClaim | null {
  const textCandidate = claim.text || claim.claim;
  if (typeof textCandidate !== 'string' || textCandidate.trim().length === 0) return null;
  const sourceType =
    claim.source_type === 'community' || claim.source_type === 'editorial'
      ? claim.source_type
      : claim.sourceType === 'community' || claim.sourceType === 'editorial'
        ? claim.sourceType
        : undefined;
  const sourceDomainCandidate = claim.source_domain || claim.sourceDomain;
  const sourceDomain =
    typeof sourceDomainCandidate === 'string' && sourceDomainCandidate.trim().length > 0
      ? sourceDomainCandidate.trim()
      : null;
  return {
    text: textCandidate.trim(),
    ...(sourceType ? { source_type: sourceType } : {}),
    ...(sourceDomain ? { source_domain: sourceDomain } : {}),
  };
}

function parseUserSignalSummary(specs: unknown): UserSignalSummary | null {
  const summaryRecord =
    specs && typeof specs === 'object'
      ? (specs as Record<string, unknown>).user_signal_summary
      : null;
  return summaryRecord && typeof summaryRecord === 'object'
    ? (summaryRecord as UserSignalSummary)
    : null;
}

function parseLensCoverage(specs: unknown): {
  pricing: Record<'personal' | 'startup' | 'enterprise', number>;
  constraints: Record<'personal' | 'startup' | 'enterprise', number>;
  integrations: Record<'personal' | 'startup' | 'enterprise', number>;
} {
  const canonicalQualityRecord =
    specs && typeof specs === 'object'
      ? (((specs as Record<string, unknown>).canonical as Record<string, unknown> | undefined)
          ?.quality as Record<string, unknown> | undefined)
      : null;
  const pricingCoverage =
    canonicalQualityRecord && typeof canonicalQualityRecord.pricing_lens_coverage === 'object'
      ? (canonicalQualityRecord.pricing_lens_coverage as {
          personal?: number;
          startup?: number;
          enterprise?: number;
        })
      : null;
  const constraintsCoverage =
    canonicalQualityRecord && typeof canonicalQualityRecord.constraints_lens_coverage === 'object'
      ? (canonicalQualityRecord.constraints_lens_coverage as {
          personal?: number;
          startup?: number;
          enterprise?: number;
        })
      : null;
  const integrationsCoverage =
    canonicalQualityRecord && typeof canonicalQualityRecord.integrations_lens_coverage === 'object'
      ? (canonicalQualityRecord.integrations_lens_coverage as {
          personal?: number;
          startup?: number;
          enterprise?: number;
        })
      : null;
  return {
    pricing: {
      personal: Number(pricingCoverage?.personal || 0),
      startup: Number(pricingCoverage?.startup || 0),
      enterprise: Number(pricingCoverage?.enterprise || 0),
    },
    constraints: {
      personal: Number(constraintsCoverage?.personal || 0),
      startup: Number(constraintsCoverage?.startup || 0),
      enterprise: Number(constraintsCoverage?.enterprise || 0),
    },
    integrations: {
      personal: Number(integrationsCoverage?.personal || 0),
      startup: Number(integrationsCoverage?.startup || 0),
      enterprise: Number(integrationsCoverage?.enterprise || 0),
    },
  };
}

export function buildToolPageSpecsSignals(input: BuildToolPageSpecsSignalsInput): {
  userSignalSummary: UserSignalSummary | null;
  topUserReportedClaims: ToolPageTopUserReportedClaim[];
  communityProsCount: number;
  communityConsCount: number;
  activeLensPricingPlanCount: number | null;
  activeLensConstraintCount: number | null;
  activeLensIntegrationCount: number | null;
} {
  const userSignalSummary = parseUserSignalSummary(input.specs);
  const topUserReportedClaimsFromSpecs = [...input.userReportedPros, ...input.userReportedCons]
    .map(normalizeTopUserReportedClaim)
    .filter((claim): claim is ToolPageTopUserReportedClaim => Boolean(claim))
    .slice(0, 2);
  const topUserReportedClaimsFromSummary = Array.isArray(
    userSignalSummary?.top_user_reported_claims
  )
    ? userSignalSummary.top_user_reported_claims
        .filter(
          (claim): claim is ToolPageTopUserReportedClaim =>
            typeof claim?.text === 'string' && claim.text.trim().length > 0
        )
        .slice(0, 2)
    : [];
  const topUserReportedClaims =
    topUserReportedClaimsFromSpecs.length > 0
      ? topUserReportedClaimsFromSpecs
      : topUserReportedClaimsFromSummary;

  const communityProsCount =
    input.userReportedPros.filter(
      (claim) => claim.source_type === 'community' || claim.sourceType === 'community'
    ).length ||
    userSignalSummary?.community_pros ||
    0;
  const communityConsCount =
    input.userReportedCons.filter(
      (claim) => claim.source_type === 'community' || claim.sourceType === 'community'
    ).length ||
    userSignalSummary?.community_cons ||
    0;

  const lensCoverage = parseLensCoverage(input.specs);
  const activeLensPricingPlanCount =
    input.activeReviewLens === 'general' ? null : lensCoverage.pricing[input.activeReviewLens];
  const activeLensConstraintCount =
    input.activeReviewLens === 'general' ? null : lensCoverage.constraints[input.activeReviewLens];
  const activeLensIntegrationCount =
    input.activeReviewLens === 'general' ? null : lensCoverage.integrations[input.activeReviewLens];

  return {
    userSignalSummary,
    topUserReportedClaims,
    communityProsCount,
    communityConsCount,
    activeLensPricingPlanCount,
    activeLensConstraintCount,
    activeLensIntegrationCount,
  };
}
