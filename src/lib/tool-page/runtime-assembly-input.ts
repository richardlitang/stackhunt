import type { BuildToolPageRuntimeParamsInput } from '@/lib/tool-page/runtime-params';

interface BuildToolPageRuntimeAssemblyInputFromRouteInput {
  pathname: string;
  searchParams: URLSearchParams;
  activeReviewLens: BuildToolPageRuntimeParamsInput['request']['activeReviewLens'];
  toolName: string;
  toolVerdict: string | null;
  toolMeta: {
    title: string;
    description: string;
    canonical: string;
    ogImage?: string;
    ogType?: 'website' | 'article';
  };
  viewModelInput: BuildToolPageRuntimeParamsInput['lens']['viewModelInput'];
  lensContentInput: BuildToolPageRuntimeParamsInput['lens']['contentInput'];
  canonicalHardLimits: BuildToolPageRuntimeParamsInput['lens']['canonicalHardLimits'];
  trust: BuildToolPageRuntimeParamsInput['trust'];
  metaSignals: {
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
  };
  schemasInput: BuildToolPageRuntimeParamsInput['schemas'];
  updateHistoryInput: BuildToolPageRuntimeParamsInput['updateHistory'];
}

export function buildToolPageRuntimeAssemblyInputFromRoute(
  input: BuildToolPageRuntimeAssemblyInputFromRouteInput
): {
  pathname: string;
  searchParams: URLSearchParams;
  activeReviewLens: BuildToolPageRuntimeParamsInput['request']['activeReviewLens'];
  viewModelInput: BuildToolPageRuntimeParamsInput['lens']['viewModelInput'];
  lensContentInput: BuildToolPageRuntimeParamsInput['lens']['contentInput'];
  canonicalHardLimits: BuildToolPageRuntimeParamsInput['lens']['canonicalHardLimits'];
  trust: BuildToolPageRuntimeParamsInput['trust'];
  meta: BuildToolPageRuntimeParamsInput['meta'];
  schemas: BuildToolPageRuntimeParamsInput['schemas'];
  updateHistory: BuildToolPageRuntimeParamsInput['updateHistory'];
  runtimeView: {
    toolName: string;
    toolMeta: {
      title: string;
      description: string;
      canonical: string;
      ogImage?: string;
      ogType?: 'website' | 'article';
    };
  };
} {
  return {
    pathname: input.pathname,
    searchParams: input.searchParams,
    activeReviewLens: input.activeReviewLens,
    viewModelInput: input.viewModelInput,
    lensContentInput: input.lensContentInput,
    canonicalHardLimits: input.canonicalHardLimits,
    trust: input.trust,
    meta: {
      toolName: input.toolName,
      toolVerdict: input.toolVerdict,
      toolMeta: input.toolMeta,
      gateShouldIndex: input.metaSignals.gateShouldIndex,
      isDraftPage: input.metaSignals.isDraftPage,
      showReviewInProgressBanner: input.metaSignals.showReviewInProgressBanner,
      safeDraftDescription: input.metaSignals.safeDraftDescription,
      decisionSnapshotSummary: input.metaSignals.decisionSnapshotSummary || '',
      renderVerdictSafe: input.metaSignals.renderVerdictSafe,
      evaluationDepth: input.metaSignals.evaluationDepth || 'Docs-only',
      showPricingSection: input.metaSignals.showPricingSection,
      hasPricingCheckedProof: input.metaSignals.hasPricingCheckedProof,
      hasFAQ: input.metaSignals.hasFAQ,
      faqSchema: input.metaSignals.faqSchema,
      decisionSnapshotBestWhen: input.metaSignals.decisionSnapshotBestWhen,
      decisionSnapshotWatchOuts: input.metaSignals.decisionSnapshotWatchOuts,
      decisionTradeoffSummary:
        input.metaSignals.decisionTradeoffSummary || 'Tradeoff not confirmed yet.',
      introLooksSpecSheet: input.metaSignals.introLooksSpecSheet,
      hasSourceBackedMainRiskSignal: Boolean(input.metaSignals.hasSourceBackedMainRiskSignal),
      hasSourceBackedUpgradeTriggerSignal: Boolean(
        input.metaSignals.hasSourceBackedUpgradeTriggerSignal
      ),
      hasSourceBackedImplementationFrictionSignal:
        Boolean(input.metaSignals.hasSourceBackedImplementationFrictionSignal),
      hasSourceBackedFitMatrixSignal: Boolean(input.metaSignals.hasSourceBackedFitMatrixSignal),
      hasSourceBackedTestBeforeBuySignal: Boolean(
        input.metaSignals.hasSourceBackedTestBeforeBuySignal
      ),
    },
    schemas: input.schemasInput,
    updateHistory: input.updateHistoryInput,
    runtimeView: {
      toolName: input.toolName,
      toolMeta: input.toolMeta,
    },
  };
}
