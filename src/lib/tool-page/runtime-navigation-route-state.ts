import type { buildToolPageDecisionRuntime } from '@/lib/tool-page/decision-runtime';
import type { buildToolPageEvidenceRuntime } from '@/lib/tool-page/evidence-runtime';
import type { buildToolPageQualityState } from '@/lib/tool-page/quality-state';
import type { buildToolPageReviewArtifactsState } from '@/lib/tool-page/review-artifacts-state';
import type { buildToolPageReviewSignalsView } from '@/lib/tool-page/review-signals-view';
import type { buildToolPageRuntimeViewBundle } from '@/lib/tool-page/runtime-view-bundle';
import type { buildToolPageSectionFlags } from '@/lib/tool-page/section-flags';
import type { ReviewLens } from '@/lib/tool-page/view-model';
import { buildToolPageNavigationMediaStateFromRouteContext } from '@/lib/tool-page/navigation-media-state';
import { buildToolPageRuntimeViewBundleFromPageContext } from '@/lib/tool-page/runtime-view-bundle-context';

interface BuildToolPageRuntimeNavigationRouteStateInput {
  pathname: string;
  searchParams: URLSearchParams;
  activeReviewLens: ReviewLens;
  tool: Parameters<typeof buildToolPageRuntimeViewBundleFromPageContext>[0]['tool'] &
    Parameters<typeof buildToolPageNavigationMediaStateFromRouteContext>[0]['media']['tool'];
  primaryOffer: Parameters<typeof buildToolPageRuntimeViewBundleFromPageContext>[0]['primaryOffer'];
  faqSchema: Parameters<typeof buildToolPageRuntimeViewBundleFromPageContext>[0]['faqSchema'];
  toolMeta: Parameters<typeof buildToolPageRuntimeViewBundleFromPageContext>[0]['toolMeta'];
  canonicalHardLimits: Parameters<
    typeof buildToolPageRuntimeViewBundleFromPageContext
  >[0]['canonicalHardLimits'];
  decisionRuntime: ReturnType<typeof buildToolPageDecisionRuntime>;
  sectionFlags: ReturnType<typeof buildToolPageSectionFlags>;
  evidenceRuntime: ReturnType<typeof buildToolPageEvidenceRuntime>;
  qualityState: ReturnType<typeof buildToolPageQualityState>;
  reviewSignalsView: ReturnType<typeof buildToolPageReviewSignalsView>;
  presentationGates: {
    showProceduralVerdict: boolean;
    showProceduralSpecs: boolean;
  };
  evaluationDepth: string | null;
  hasStrengths: boolean;
  faqItems: Array<{ question: string; answer: string; answer_source_url?: string | null }>;
  reviewArtifactsState: Pick<
    ReturnType<typeof buildToolPageReviewArtifactsState>,
    'evidenceBasis' | 'lowConfidenceEvidenceLinks'
  >;
  category: Parameters<
    typeof buildToolPageNavigationMediaStateFromRouteContext
  >[0]['media']['category'];
  knowledgeCard: Parameters<
    typeof buildToolPageNavigationMediaStateFromRouteContext
  >[0]['media']['knowledgeCard'];
  renderVerdictSafe: string | null;
}

export function buildToolPageRuntimeNavigationRouteState(
  input: BuildToolPageRuntimeNavigationRouteStateInput
): {
  runtimeViewBundle: ReturnType<typeof buildToolPageRuntimeViewBundle>;
  navigationState: ReturnType<
    typeof buildToolPageNavigationMediaStateFromRouteContext
  >['navigationState'];
  ctaMediaState: ReturnType<
    typeof buildToolPageNavigationMediaStateFromRouteContext
  >['ctaMediaState'];
} {
  const { runtimeViewBundle } = buildToolPageRuntimeViewBundleFromPageContext({
    pathname: input.pathname,
    searchParams: input.searchParams,
    activeReviewLens: input.activeReviewLens,
    tool: input.tool,
    primaryOffer: input.primaryOffer,
    faqSchema: input.faqSchema,
    toolMeta: input.toolMeta,
    canonicalHardLimits: input.canonicalHardLimits,
    signals: {
      hasVerdict: input.decisionRuntime.hasVerdict,
      showProceduralVerdict: input.presentationGates.showProceduralVerdict,
      showPricingSection: input.evidenceRuntime.showPricingSection,
      hasGettingStarted: input.sectionFlags.hasGettingStarted,
      hasFeatures: input.sectionFlags.hasFeatures,
      hasSpecs: input.sectionFlags.hasSpecs,
      showProceduralSpecs: input.presentationGates.showProceduralSpecs,
      hasPlatform: input.sectionFlags.hasPlatform,
      hasAlternatives: input.sectionFlags.hasAlternatives,
      hasCollectedSources: input.evidenceRuntime.hasCollectedSources,
      hasSecurity: input.sectionFlags.hasSecurity,
      decisionSnapshotBestWhen: input.decisionRuntime.decisionSnapshotBestWhen,
      decisionSnapshotWatchOuts: input.decisionRuntime.decisionSnapshotWatchOuts,
      decisionSnapshotDifferentiators: input.decisionRuntime.decisionSnapshotDifferentiators,
      decisionTradeoffSummary: input.evidenceRuntime.decisionTradeoffSummary,
      baseEvidenceGrade: input.evidenceRuntime.baseEvidenceGrade,
      avoidIfBullet: input.evidenceRuntime.avoidIfBullet,
      tradeoffCons: input.evidenceRuntime.tradeoffCons,
      decisionProofPoints: input.evidenceRuntime.decisionProofPoints,
      contentConfidenceLevel: input.qualityState.contentConfidenceLevel,
      hasPricingCheckedProof: input.evidenceRuntime.hasPricingCheckedProof,
      pricingCheckedLabel: input.evidenceRuntime.pricingCheckedLabel || 'Not confirmed',
      pricingSourceUrl: input.evidenceRuntime.pricingSourceUrl,
      specsVerifiedLabel: input.reviewSignalsView.specsVerifiedLabel || 'Not confirmed',
      officialDocsSourceUrl: input.evidenceRuntime.officialDocsSource?.url || null,
      communityVerifiedLabel: input.reviewSignalsView.communityVerifiedLabel || 'Not confirmed',
      officialPricingSourceUrl: input.evidenceRuntime.officialPricingSource?.url || null,
      gateShouldIndex: input.qualityState.gateShouldIndex,
      isDraftPage: input.qualityState.isDraftPage,
      showReviewInProgressBanner: input.qualityState.showReviewInProgressBanner,
      safeDraftDescription: input.qualityState.safeDraftDescription,
      decisionSnapshotSummary: input.decisionRuntime.decisionSnapshotSummary,
      renderVerdictSafe: input.decisionRuntime.renderVerdictSafe,
      evaluationDepth: input.evaluationDepth,
      hasFAQ: input.sectionFlags.hasFAQ,
      faqSchema: input.faqSchema,
      introLooksSpecSheet: input.decisionRuntime.introLooksSpecSheet,
    },
  });
  const { navigationState, ctaMediaState } = buildToolPageNavigationMediaStateFromRouteContext({
    navigation: {
      hasVerdict: input.decisionRuntime.hasVerdict,
      showProceduralVerdict: input.presentationGates.showProceduralVerdict,
      hasGettingStarted: input.sectionFlags.hasGettingStarted,
      showPricingSection: input.evidenceRuntime.showPricingSection,
      hasStrengths: input.hasStrengths,
      hasFeatures: input.sectionFlags.hasFeatures,
      hasSpecs: input.sectionFlags.hasSpecs,
      showProceduralSpecs: input.presentationGates.showProceduralSpecs,
      hasPlatform: input.sectionFlags.hasPlatform,
      hasFAQ: input.sectionFlags.hasFAQ,
      hasAlternatives: input.sectionFlags.hasAlternatives,
      faqItems: input.faqItems,
      evidenceBasis: input.reviewArtifactsState.evidenceBasis,
      lowConfidenceEvidenceLinks: input.reviewArtifactsState.lowConfidenceEvidenceLinks,
      updateHistoryEntries: runtimeViewBundle.updateHistoryEntries,
    },
    media: {
      tool: input.tool,
      category: input.category,
      knowledgeCard: input.knowledgeCard,
      renderVerdictSafe: input.renderVerdictSafe,
      activeReviewLens: input.activeReviewLens,
    },
  });

  return {
    runtimeViewBundle,
    navigationState,
    ctaMediaState,
  };
}
