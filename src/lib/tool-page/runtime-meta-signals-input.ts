import type { BuildToolPageRuntimeParamsInput } from '@/lib/tool-page/runtime-params';

interface BuildToolPageRuntimeMetaSignalsInputFromRouteInput {
  gateShouldIndex: boolean;
  isDraftPage: boolean;
  showReviewInProgressBanner: boolean;
  safeDraftDescription: string;
  decisionSnapshotSummary: string | null;
  renderVerdictSafe: string | null;
  evaluationDepth: string | null;
  showPricingSection: boolean;
  hasPricingCheckedProof: boolean;
  hasFAQ: boolean;
  faqSchema: BuildToolPageRuntimeParamsInput['meta']['faqSchema'];
  decisionSnapshotBestWhen: string[];
  decisionSnapshotWatchOuts: string[];
  decisionTradeoffSummary: string | null;
  introLooksSpecSheet: boolean;
  hasSourceBackedMainRiskSignal?: boolean;
  hasSourceBackedUpgradeTriggerSignal?: boolean;
  hasSourceBackedImplementationFrictionSignal?: boolean;
  hasSourceBackedFitMatrixSignal?: boolean;
  hasSourceBackedTestBeforeBuySignal?: boolean;
  hasMalformedDecisionLayerSignal?: boolean;
  hasDuplicatePricingRealitySignal?: boolean;
  hasDuplicateFitMatrixRowsSignal?: boolean;
  hasEnterpriseFitContradictionSignal?: boolean;
}

export function buildToolPageRuntimeMetaSignalsInputFromRoute(
  input: BuildToolPageRuntimeMetaSignalsInputFromRouteInput
): BuildToolPageRuntimeMetaSignalsInputFromRouteInput {
  return {
    gateShouldIndex: input.gateShouldIndex,
    isDraftPage: input.isDraftPage,
    showReviewInProgressBanner: input.showReviewInProgressBanner,
    safeDraftDescription: input.safeDraftDescription,
    decisionSnapshotSummary: input.decisionSnapshotSummary,
    renderVerdictSafe: input.renderVerdictSafe,
    evaluationDepth: input.evaluationDepth,
    showPricingSection: input.showPricingSection,
    hasPricingCheckedProof: input.hasPricingCheckedProof,
    hasFAQ: input.hasFAQ,
    faqSchema: input.faqSchema,
    decisionSnapshotBestWhen: input.decisionSnapshotBestWhen,
    decisionSnapshotWatchOuts: input.decisionSnapshotWatchOuts,
    decisionTradeoffSummary: input.decisionTradeoffSummary,
    introLooksSpecSheet: input.introLooksSpecSheet,
    hasSourceBackedMainRiskSignal: Boolean(input.hasSourceBackedMainRiskSignal),
    hasSourceBackedUpgradeTriggerSignal: Boolean(input.hasSourceBackedUpgradeTriggerSignal),
    hasSourceBackedImplementationFrictionSignal: Boolean(
      input.hasSourceBackedImplementationFrictionSignal
    ),
    hasSourceBackedFitMatrixSignal: Boolean(input.hasSourceBackedFitMatrixSignal),
    hasSourceBackedTestBeforeBuySignal: Boolean(input.hasSourceBackedTestBeforeBuySignal),
    hasMalformedDecisionLayerSignal: Boolean(input.hasMalformedDecisionLayerSignal),
    hasDuplicatePricingRealitySignal: Boolean(input.hasDuplicatePricingRealitySignal),
    hasDuplicateFitMatrixRowsSignal: Boolean(input.hasDuplicateFitMatrixRowsSignal),
    hasEnterpriseFitContradictionSignal: Boolean(input.hasEnterpriseFitContradictionSignal),
  };
}
