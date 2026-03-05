import type { buildToolPageEvidenceRuntime } from '@/lib/tool-page/evidence-runtime';
import type { buildToolPageLensRuntime } from '@/lib/tool-page/lens-runtime';
import type { buildToolPageReviewSignalsView } from '@/lib/tool-page/review-signals-view';
import { buildToolPageChromeLensStateFromRouteContext } from '@/lib/tool-page/chrome-lens-state';

interface BuildToolPageChromeLensStateFromDecisionContextInput {
  lensRuntime: ReturnType<typeof buildToolPageLensRuntime>;
  activeReviewLens: Parameters<
    typeof buildToolPageChromeLensStateFromRouteContext
  >[0]['chrome']['activeReviewLens'];
  toolCategory: Parameters<
    typeof buildToolPageChromeLensStateFromRouteContext
  >[0]['chrome']['toolCategory'];
  tool: Parameters<typeof buildToolPageChromeLensStateFromRouteContext>[0]['chrome']['tool'];
  websiteHostLabel: Parameters<
    typeof buildToolPageChromeLensStateFromRouteContext
  >[0]['chrome']['websiteHostLabel'];
  runtimeViewBundle: {
    trustConfidenceLabel: Parameters<
      typeof buildToolPageChromeLensStateFromRouteContext
    >[0]['chrome']['trustConfidenceLabel'];
    pendingVerificationCount: Parameters<
      typeof buildToolPageChromeLensStateFromRouteContext
    >[0]['chrome']['pendingVerificationCount'];
    trustStatus: Parameters<
      typeof buildToolPageChromeLensStateFromRouteContext
    >[0]['chrome']['trustStatus'];
    lensLabelMap: Parameters<
      typeof buildToolPageChromeLensStateFromRouteContext
    >[0]['chrome']['lensLabelMap'];
  };
  evidenceRuntime: Pick<
    ReturnType<typeof buildToolPageEvidenceRuntime>,
    'hasCollectedSources' | 'collectedSourcesTotal' | 'pricingCheckedLabel'
  >;
  reviewSignalsView: Pick<
    ReturnType<typeof buildToolPageReviewSignalsView>,
    'communityVerifiedLabel' | 'specsVerifiedLabel' | 'pricingVerifiedLabel'
  >;
  evaluationDepth: 'Docs-only' | 'Light hands-on' | 'Deep hands-on';
}

export function buildToolPageChromeLensStateFromDecisionContext(
  input: BuildToolPageChromeLensStateFromDecisionContextInput
): ReturnType<typeof buildToolPageChromeLensStateFromRouteContext> {
  return buildToolPageChromeLensStateFromRouteContext({
    lensRuntime: input.lensRuntime,
    chrome: {
      toolCategory: input.toolCategory,
      hasCollectedSources: input.evidenceRuntime.hasCollectedSources,
      evaluationDepth: input.evaluationDepth,
      collectedSourcesTotal: input.evidenceRuntime.collectedSourcesTotal,
      trustConfidenceLabel: input.runtimeViewBundle.trustConfidenceLabel,
      pendingVerificationCount: input.runtimeViewBundle.pendingVerificationCount,
      communityVerifiedLabel: input.reviewSignalsView.communityVerifiedLabel,
      specsVerifiedLabel: input.reviewSignalsView.specsVerifiedLabel,
      pricingCheckedLabel: input.evidenceRuntime.pricingCheckedLabel,
      pricingVerifiedLabel: input.reviewSignalsView.pricingVerifiedLabel,
      trustStatus: input.runtimeViewBundle.trustStatus,
      activeReviewLens: input.activeReviewLens,
      lensLabelMap: input.runtimeViewBundle.lensLabelMap,
      tool: input.tool,
      websiteHostLabel: input.websiteHostLabel,
    },
  });
}
