import { buildToolPageCategoryBreadcrumb } from '@/lib/tool-page/breadcrumbs';
import { buildToolPageFreshnessLabels } from '@/lib/tool-page/freshness-labels';
import { buildToolPageLensPriorityLead } from '@/lib/tool-page/lens-priority-copy';
import { buildToolPageResearchStatusView } from '@/lib/tool-page/research-status';
import { buildToolPageReviewBannerText } from '@/lib/tool-page/review-banner';
import { buildToolPageTrustBarProps } from '@/lib/tool-page/trust-bar-props';
import { buildToolPageVerificationBadgeLabel } from '@/lib/tool-page/verification-badge';
import { buildToolPageWebsiteState } from '@/lib/tool-page/website';
import { buildToolPageWebsiteLabel } from '@/lib/tool-page/website-label';

type ReviewLens = 'general' | 'personal' | 'startup' | 'enterprise';

interface BuildToolPageChromeStateInput {
  toolCategory: { slug: string; name: string } | null;
  hasCollectedSources: boolean;
  evaluationDepth: 'Docs-only' | 'Light hands-on' | 'Deep hands-on';
  collectedSourcesTotal: number;
  trustConfidenceLabel: 'High' | 'Medium' | 'Low';
  pendingVerificationCount: number;
  communityCorroborationCount?: number;
  userSignalCoveragePending?: boolean;
  userSignalNeedsConfirmationCount?: number;
  userSignalChannelCoverageCount?: number;
  communityVerifiedLabel: string | null;
  specsVerifiedLabel: string | null;
  pricingCheckedLabel: string | null;
  pricingVerifiedLabel: string | null;
  trustStatus: 'Source-backed' | 'Needs confirmation';
  website: string | null;
  websiteHostLabel: string | null;
  activeReviewLens: ReviewLens;
  lensLabelMap: Record<ReviewLens, string>;
}

export function buildToolPageChromeState(input: BuildToolPageChromeStateInput): {
  reviewInProgressBannerText: string;
  researchStatusView: ReturnType<typeof buildToolPageResearchStatusView>;
  categoryBreadcrumb: ReturnType<typeof buildToolPageCategoryBreadcrumb>;
  trustBarProps: ReturnType<typeof buildToolPageTrustBarProps>;
  verificationBadgeLabel: string;
  websiteState: ReturnType<typeof buildToolPageWebsiteState>;
  websiteDisplayLabel: string;
  lensPriorityLead: string;
  freshnessLabels: ReturnType<typeof buildToolPageFreshnessLabels>;
} {
  const reviewInProgressBannerText = buildToolPageReviewBannerText({
    hasCollectedSources: input.hasCollectedSources,
  });
  const researchStatusView = buildToolPageResearchStatusView({
    evaluationDepth: input.evaluationDepth,
    collectedSourcesTotal: input.collectedSourcesTotal,
    trustConfidenceLabel: input.trustConfidenceLabel,
    pendingVerificationCount: input.pendingVerificationCount,
    communityCorroborationCount: input.communityCorroborationCount || 0,
    userSignalCoveragePending: input.userSignalCoveragePending || false,
    userSignalNeedsConfirmationCount: input.userSignalNeedsConfirmationCount || 0,
    userSignalChannelCoverageCount: input.userSignalChannelCoverageCount || 0,
    communityVerifiedLabel: input.communityVerifiedLabel,
    specsVerifiedLabel: input.specsVerifiedLabel,
    pricingCheckedLabel: input.pricingCheckedLabel,
  });
  const categoryBreadcrumb = buildToolPageCategoryBreadcrumb({
    category: input.toolCategory,
  });
  const freshnessLabels = buildToolPageFreshnessLabels({
    communityVerifiedLabel: input.communityVerifiedLabel,
    specsVerifiedLabel: input.specsVerifiedLabel,
    pricingVerifiedLabel: input.pricingVerifiedLabel,
    pricingCheckedLabel: input.pricingCheckedLabel,
  });
  const trustBarProps = buildToolPageTrustBarProps({
    status: input.trustStatus,
    pendingCount: input.pendingVerificationCount,
    evaluationDepth: input.evaluationDepth,
    lastChecked: freshnessLabels.trustBarLastCheckedLabel,
    confidence: input.trustConfidenceLabel,
    sourcesCount: input.collectedSourcesTotal,
  });
  const verificationBadgeLabel = buildToolPageVerificationBadgeLabel({
    hasCollectedSources: input.hasCollectedSources,
  });
  const websiteState = buildToolPageWebsiteState({
    website: input.website,
  });
  const websiteDisplayLabel = buildToolPageWebsiteLabel({
    websiteHostLabel: input.websiteHostLabel,
  });
  const lensPriorityLead = buildToolPageLensPriorityLead({
    activeReviewLens: input.activeReviewLens,
    activeLensLabel: input.lensLabelMap[input.activeReviewLens],
  });
  return {
    reviewInProgressBannerText,
    researchStatusView,
    categoryBreadcrumb,
    trustBarProps,
    verificationBadgeLabel,
    websiteState,
    websiteDisplayLabel,
    lensPriorityLead,
    freshnessLabels,
  };
}
