import type { buildToolPageDecisionRuntime } from '@/lib/tool-page/decision-runtime';
import type { buildToolPageEvidenceRuntime } from '@/lib/tool-page/evidence-runtime';
import type { buildToolPageQualityState } from '@/lib/tool-page/quality-state';
import type { buildToolPageReviewArtifactsState } from '@/lib/tool-page/review-artifacts-state';
import type { buildToolPageReviewSignalsView } from '@/lib/tool-page/review-signals-view';
import type { buildToolPageRuntimeViewBundle } from '@/lib/tool-page/runtime-view-bundle';
import type { buildToolPageSectionFlags } from '@/lib/tool-page/section-flags';
import type { ReviewLens } from '@/lib/tool-page/view-model';
import {
  buildToolPageCtaMediaStateInputFromTool,
  buildToolPageCtaMediaToolFromRouteTool,
} from '@/lib/tool-page/cta-media-input';
import { buildToolPageCtaMediaState } from '@/lib/tool-page/cta-media-state';
import { buildToolPageNavigationStateInputFromRoute } from '@/lib/tool-page/navigation-input';
import { buildToolPageNavigationState } from '@/lib/tool-page/navigation-state';
import { buildToolPageRuntimeAssembly } from '@/lib/tool-page/runtime-assembly';
import { buildToolPageRuntimeAssemblyInputBundleFromPageContext } from '@/lib/tool-page/runtime-assembly-route-input';
import { buildToolPageRuntimeAssemblySignalsInputFromRoute } from '@/lib/tool-page/runtime-assembly-signals-input';
import { deriveToolPageDecisionLayerConsistencySignals } from '@/lib/tool-page/decision-layer-consistency-signals';
import { deriveToolPageLaneDecisionEvidenceSignals } from '@/lib/tool-page/lane-decision-signals';
import type { ToolPageLaneOutputs } from '@/lib/tool-page/lane-outputs';

interface BuildToolPageRuntimeNavigationRouteStateInput {
  pathname: string;
  searchParams: URLSearchParams;
  activeReviewLens: ReviewLens;
  tool: Parameters<typeof buildToolPageRuntimeAssemblyInputBundleFromPageContext>[0]['tool'] &
    Parameters<typeof buildToolPageCtaMediaToolFromRouteTool>[0];
  primaryOffer: Parameters<
    typeof buildToolPageRuntimeAssemblyInputBundleFromPageContext
  >[0]['primaryOffer'];
  faqSchema: Parameters<
    typeof buildToolPageRuntimeAssemblyInputBundleFromPageContext
  >[0]['faqSchema'];
  toolMeta: Parameters<
    typeof buildToolPageRuntimeAssemblyInputBundleFromPageContext
  >[0]['toolMeta'];
  canonicalHardLimits: Parameters<
    typeof buildToolPageRuntimeAssemblyInputBundleFromPageContext
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
  category: Parameters<typeof buildToolPageCtaMediaToolFromRouteTool>[1];
  knowledgeCard: Parameters<typeof buildToolPageCtaMediaStateInputFromTool>[0]['knowledgeCard'];
  renderVerdictSafe: string | null;
  laneOutputs: ToolPageLaneOutputs | null;
}

export function buildToolPageRuntimeNavigationRouteState(
  input: BuildToolPageRuntimeNavigationRouteStateInput
): {
  runtimeViewBundle: ReturnType<typeof buildToolPageRuntimeViewBundle>;
  navigationState: ReturnType<typeof buildToolPageNavigationState>;
  ctaMediaState: ReturnType<typeof buildToolPageCtaMediaState>;
} {
  const laneDecisionSignals = deriveToolPageLaneDecisionEvidenceSignals(input.laneOutputs);
  const decisionLayerConsistencySignals = deriveToolPageDecisionLayerConsistencySignals({
    decisionSnapshotBestWhen: input.decisionRuntime.decisionSnapshotBestWhen,
    decisionSnapshotWatchOuts: input.decisionRuntime.decisionSnapshotWatchOuts,
    decisionTradeoffSummary: input.evidenceRuntime.decisionTradeoffSummary,
    laneOutputs: input.laneOutputs,
  });
  const runtimeAssemblySignals = buildToolPageRuntimeAssemblySignalsInputFromRoute({
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
    hasSourceBackedMainRiskSignal: laneDecisionSignals.hasSourceBackedMainRiskSignal,
    hasSourceBackedUpgradeTriggerSignal: laneDecisionSignals.hasSourceBackedUpgradeTriggerSignal,
    hasSourceBackedImplementationFrictionSignal:
      laneDecisionSignals.hasSourceBackedImplementationFrictionSignal,
    hasSourceBackedFitMatrixSignal: laneDecisionSignals.hasSourceBackedFitMatrixSignal,
    hasSourceBackedTestBeforeBuySignal: laneDecisionSignals.hasSourceBackedTestBeforeBuySignal,
    hasMalformedDecisionLayerSignal:
      decisionLayerConsistencySignals.hasMalformedDecisionLayerSignal,
    hasDuplicatePricingRealitySignal:
      decisionLayerConsistencySignals.hasDuplicatePricingRealitySignal,
    hasDuplicateFitMatrixRowsSignal:
      decisionLayerConsistencySignals.hasDuplicateFitMatrixRowsSignal,
    hasEnterpriseFitContradictionSignal:
      decisionLayerConsistencySignals.hasEnterpriseFitContradictionSignal,
    hasUnsupportedGenerationModeSignal:
      decisionLayerConsistencySignals.hasUnsupportedGenerationModeSignal,
  });
  const { runtimeViewBundle } = buildToolPageRuntimeAssembly(
    buildToolPageRuntimeAssemblyInputBundleFromPageContext({
      pathname: input.pathname,
      searchParams: input.searchParams,
      activeReviewLens: input.activeReviewLens,
      tool: input.tool,
      primaryOffer: input.primaryOffer,
      faqSchema: input.faqSchema,
      toolMeta: input.toolMeta,
      canonicalHardLimits: input.canonicalHardLimits,
      ...runtimeAssemblySignals,
    })
  );
  const navigationState = buildToolPageNavigationState(
    buildToolPageNavigationStateInputFromRoute({
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
      evidenceBasisCount: input.reviewArtifactsState.evidenceBasis.length,
      lowConfidenceCount: input.reviewArtifactsState.lowConfidenceEvidenceLinks.length,
      faqItems: input.faqItems,
      updateHistoryEntriesCount: runtimeViewBundle.updateHistoryEntries.length,
    })
  );
  const ctaMediaState = buildToolPageCtaMediaState(
    buildToolPageCtaMediaStateInputFromTool({
      tool: buildToolPageCtaMediaToolFromRouteTool(input.tool, input.category),
      knowledgeCard: input.knowledgeCard,
      renderVerdictSafe: input.renderVerdictSafe,
      activeReviewLens: input.activeReviewLens,
    })
  );

  return {
    runtimeViewBundle,
    navigationState,
    ctaMediaState,
  };
}
