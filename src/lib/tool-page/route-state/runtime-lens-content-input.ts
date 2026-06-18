import type { BuildToolPageRuntimeParamsInput } from '@/lib/tool-page/runtime/runtime-params';

interface BuildToolPageRuntimeLensContentInputFromRouteInput {
  toolName: string;
  hasCollectedSources: boolean;
  hasGettingStarted: boolean;
  showPricingSection: boolean;
  hasSecurity: boolean;
  decisionSnapshotBestWhen: string[];
  decisionSnapshotWatchOuts: string[];
  decisionSnapshotDifferentiators: string[];
  decisionTradeoffSummary: string | null;
}

export function buildToolPageRuntimeLensContentInputFromRoute(
  input: BuildToolPageRuntimeLensContentInputFromRouteInput
): BuildToolPageRuntimeParamsInput['lens']['contentInput'] {
  return {
    toolName: input.toolName,
    hasCollectedSources: input.hasCollectedSources,
    hasGettingStarted: input.hasGettingStarted,
    showPricingSection: input.showPricingSection,
    hasSecurity: input.hasSecurity,
    decisionSnapshotBestWhen: input.decisionSnapshotBestWhen,
    decisionSnapshotWatchOuts: input.decisionSnapshotWatchOuts,
    decisionSnapshotDifferentiators: input.decisionSnapshotDifferentiators,
    decisionTradeoffSummary: input.decisionTradeoffSummary || 'Tradeoff not confirmed yet.',
  };
}
