import { evaluateContentConfidence, getConfidenceLevel } from '@/lib/confidence';
import { evaluateIndexReadiness } from '@/lib/quality-gate';
import { deriveToolPageReviewProgress } from '@/lib/tool-page/review-progress';
import type { Review, Tool } from '@/types/database';

type SectionStatus = 'show' | 'hide' | 'procedural';

interface PersistedQualityLike {
  should_index?: boolean;
  noindex_reasons?: string[];
  section_publishability?: Record<string, boolean>;
  section_status?: Record<string, SectionStatus>;
  evidence_counts?: Record<string, number>;
}

interface ReviewSelectionLike {
  hasPublishedReview: boolean;
  hasDraftReview: boolean;
}

type ToolPageFirstReview = Parameters<typeof deriveToolPageReviewProgress>[0]['firstReview'];

interface BuildToolPageQualityStateInput {
  tool: Tool;
  firstReview: ToolPageFirstReview;
  reviewSelection: ReviewSelectionLike;
  persistedQuality: PersistedQualityLike | undefined;
}

export interface ToolPageQualityState {
  contentConfidenceLevel: 'low' | 'medium' | 'high';
  sectionPublishability: Record<string, boolean>;
  sectionStatus: Record<string, SectionStatus | undefined>;
  gateShouldIndex: boolean;
  gateReasons: string[];
  hasProceduralGuidance: boolean;
  isDraftPage: boolean;
  safeDraftDescription: string;
  showReviewInProgressBanner: boolean;
  communityCorroborationCount: number;
  userSignalClaimsCount: number;
  userSignalCoveragePending: boolean;
  userSignalNeedsConfirmationCount: number;
  userSignalChannelCoverageCount: number;
}

export function buildToolPageQualityState(
  input: BuildToolPageQualityStateInput
): ToolPageQualityState {
  const confidence = evaluateContentConfidence(
    input.tool,
    input.firstReview as Review | null | undefined
  );
  const contentConfidenceLevelRaw = getConfidenceLevel(confidence.score);
  const indexReadiness = evaluateIndexReadiness(
    input.tool,
    input.firstReview as Review | null | undefined
  );

  const sectionPublishability = {
    ...indexReadiness.signals.section_publishability,
    ...(input.persistedQuality?.section_publishability || {}),
  };
  const sectionStatus = {
    ...indexReadiness.signals.section_status,
    ...(input.persistedQuality?.section_status || {}),
  };
  const hasProceduralSignals =
    sectionStatus.verdict === 'procedural' ||
    sectionStatus.pricing === 'procedural' ||
    sectionStatus.community === 'procedural' ||
    sectionStatus.specs === 'procedural';

  const isDraftPage =
    !input.reviewSelection.hasPublishedReview && input.reviewSelection.hasDraftReview;
  const gateShouldIndex =
    typeof input.persistedQuality?.should_index === 'boolean'
      ? input.persistedQuality.should_index
      : indexReadiness.shouldIndex;
  const gateReasons =
    Array.isArray(input.persistedQuality?.noindex_reasons) &&
    input.persistedQuality.noindex_reasons.length > 0
      ? input.persistedQuality.noindex_reasons
      : indexReadiness.reasons;
  const gateBlocksFoundations =
    gateReasons.includes('missing_required_sections') || gateReasons.includes('mvup_incomplete');
  const hasProceduralGuidance = hasProceduralSignals && !gateBlocksFoundations;
  const contentConfidenceLevel = gateBlocksFoundations ? 'low' : contentConfidenceLevelRaw;
  const safeDraftDescription = `${input.tool.name} is currently in editorial verification. This page is not finalized yet.`;
  const reviewProgress = deriveToolPageReviewProgress({
    tool: input.tool,
    firstReview: input.firstReview,
    gateReasons,
  });
  const communityCorroborationCount = Math.max(
    0,
    Number(
      input.persistedQuality?.evidence_counts?.community_domains ??
        indexReadiness.signals.evidence_counts.community_domains ??
        0
    ) || 0
  );
  const userSignalSummary =
    input.tool?.specs && typeof input.tool.specs === 'object'
      ? ((input.tool.specs as Record<string, unknown>).user_signal_summary as
          | {
              top_user_reported_claims?: unknown[];
              needs_confirmation_claims?: number;
              reddit_claims?: number;
              forum_claims?: number;
              hn_claims?: number;
            }
          | undefined)
      : undefined;
  const canonicalQuality =
    input.tool?.specs && typeof input.tool.specs === 'object'
      ? ((((input.tool.specs as Record<string, unknown>).canonical as Record<string, unknown>)
          ?.quality || {}) as {
          user_signal_coverage_pending?: boolean;
        })
      : undefined;
  const explicitUserPros =
    input.tool?.specs && typeof input.tool.specs === 'object'
      ? (input.tool.specs as Record<string, unknown>).user_reported_pros
      : undefined;
  const explicitUserCons =
    input.tool?.specs && typeof input.tool.specs === 'object'
      ? (input.tool.specs as Record<string, unknown>).user_reported_cons
      : undefined;
  const explicitUserClaimsCount =
    (Array.isArray(explicitUserPros) ? explicitUserPros.length : 0) +
    (Array.isArray(explicitUserCons) ? explicitUserCons.length : 0);
  const summarizedUserClaimsCount = Array.isArray(userSignalSummary?.top_user_reported_claims)
    ? userSignalSummary.top_user_reported_claims.length
    : 0;
  const userSignalClaimsCount = Math.max(explicitUserClaimsCount, summarizedUserClaimsCount);
  const userSignalCoveragePending =
    Boolean(canonicalQuality?.user_signal_coverage_pending) ||
    (communityCorroborationCount > 0 && userSignalClaimsCount === 0);
  const userSignalNeedsConfirmationCount = Math.max(
    0,
    Number(userSignalSummary?.needs_confirmation_claims || 0) || 0
  );
  const userSignalChannelCoverageCount = [
    Number(userSignalSummary?.reddit_claims || 0) > 0,
    Number(userSignalSummary?.forum_claims || 0) > 0,
    Number(userSignalSummary?.hn_claims || 0) > 0,
  ].filter(Boolean).length;

  return {
    contentConfidenceLevel,
    sectionPublishability,
    sectionStatus,
    gateShouldIndex,
    gateReasons,
    hasProceduralGuidance,
    isDraftPage,
    safeDraftDescription,
    showReviewInProgressBanner: reviewProgress.showReviewInProgressBanner,
    communityCorroborationCount,
    userSignalClaimsCount,
    userSignalCoveragePending,
    userSignalNeedsConfirmationCount,
    userSignalChannelCoverageCount,
  };
}
