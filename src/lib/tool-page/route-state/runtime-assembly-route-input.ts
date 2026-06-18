import { buildToolPageRuntimeAssemblyBaseInputFromRoute } from '@/lib/tool-page/route-state/runtime-assembly-base-input';
import { buildToolPageRuntimeAssemblyInputFromRoute } from '@/lib/tool-page/route-state/runtime-assembly-input';
import { buildToolPageRuntimeLensContentInputFromRoute } from '@/lib/tool-page/route-state/runtime-lens-content-input';
import { buildToolPageRuntimeMetaSignalsInputFromRoute } from '@/lib/tool-page/route-state/runtime-meta-signals-input';
import { buildToolPageRuntimeSchemasInputFromRoute } from '@/lib/tool-page/route-state/runtime-schema-history-input';
import { buildToolPageRuntimeUpdateHistoryInputFromRoute } from '@/lib/tool-page/route-state/runtime-schema-history-input';
import { buildToolPageRuntimeTrustInputFromRoute } from '@/lib/tool-page/route-state/runtime-trust-input';
import { buildToolPageRuntimeViewModelInputFromRoute } from '@/lib/tool-page/route-state/runtime-viewmodel-input';
import type { BuildToolPageRuntimeParamsInput } from '@/lib/tool-page/runtime/runtime-params';

interface BuildToolPageRuntimeAssemblyInputBundleFromRouteInput {
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
  canonicalHardLimits: BuildToolPageRuntimeParamsInput['lens']['canonicalHardLimits'];
  viewModel: {
    hasVerdict: boolean;
    showProceduralVerdict: boolean;
    showPricingSection: boolean;
    hasGettingStarted: boolean;
    hasFeatures: boolean;
    hasSpecs: boolean;
    showProceduralSpecs: boolean;
    hasPlatform: boolean;
    hasAlternatives: boolean;
  };
  lensContent: {
    hasCollectedSources: boolean;
    hasGettingStarted: boolean;
    showPricingSection: boolean;
    hasSecurity: boolean;
    decisionSnapshotBestWhen: string[];
    decisionSnapshotWatchOuts: string[];
    decisionSnapshotDifferentiators: string[];
    decisionTradeoffSummary: string | null;
  };
  trust: {
    baseEvidenceGrade: BuildToolPageRuntimeParamsInput['trust']['baseEvidenceGrade'];
    avoidIfBullet: BuildToolPageRuntimeParamsInput['trust']['avoidIfBullet'];
    tradeoffCons: BuildToolPageRuntimeParamsInput['trust']['tradeoffCons'];
    decisionProofPoints: BuildToolPageRuntimeParamsInput['trust']['decisionProofPoints'];
    hasCollectedSources: BuildToolPageRuntimeParamsInput['trust']['hasCollectedSources'];
    contentConfidenceLevel: BuildToolPageRuntimeParamsInput['trust']['contentConfidenceLevel'];
    hasPricingCheckedProof: BuildToolPageRuntimeParamsInput['trust']['hasPricingCheckedProof'];
    pricingCheckedLabel: BuildToolPageRuntimeParamsInput['trust']['pricingCheckedLabel'];
    pricingSourceUrl: string | null;
    specsVerifiedLabel: BuildToolPageRuntimeParamsInput['trust']['specsVerifiedLabel'];
    officialDocsSourceUrl: string | null;
    communityVerifiedLabel: BuildToolPageRuntimeParamsInput['trust']['communityVerifiedLabel'];
    officialPricingSourceUrl: string | null;
  };
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
    hasMalformedDecisionLayerSignal?: boolean;
    hasDuplicatePricingRealitySignal?: boolean;
    hasDuplicateFitMatrixRowsSignal?: boolean;
    hasEnterpriseFitContradictionSignal?: boolean;
    hasUnsupportedGenerationModeSignal?: boolean;
  };
  schemas: {
    tool: BuildToolPageRuntimeParamsInput['schemas']['tool'];
    primaryOffer: BuildToolPageRuntimeParamsInput['schemas']['primaryOffer'];
    reviewCount: number;
    faqSchema: BuildToolPageRuntimeParamsInput['schemas']['faqSchema'];
  };
  updateHistory: {
    communityVerifiedLabel: string;
    specsVerifiedLabel: string;
    pricingCheckedLabel: string;
  };
}

interface BuildToolPageRuntimeAssemblyInputBundleFromPageContextInput {
  pathname: string;
  searchParams: URLSearchParams;
  activeReviewLens: BuildToolPageRuntimeParamsInput['request']['activeReviewLens'];
  tool: BuildToolPageRuntimeAssemblyInputBundleFromRouteInput['schemas']['tool'];
  primaryOffer: BuildToolPageRuntimeAssemblyInputBundleFromRouteInput['schemas']['primaryOffer'];
  faqSchema: BuildToolPageRuntimeAssemblyInputBundleFromRouteInput['schemas']['faqSchema'];
  toolMeta: BuildToolPageRuntimeAssemblyInputBundleFromRouteInput['toolMeta'];
  canonicalHardLimits: BuildToolPageRuntimeAssemblyInputBundleFromRouteInput['canonicalHardLimits'];
  viewModel: BuildToolPageRuntimeAssemblyInputBundleFromRouteInput['viewModel'];
  lensContent: BuildToolPageRuntimeAssemblyInputBundleFromRouteInput['lensContent'];
  trust: BuildToolPageRuntimeAssemblyInputBundleFromRouteInput['trust'];
  metaSignals: BuildToolPageRuntimeAssemblyInputBundleFromRouteInput['metaSignals'];
  updateHistory: BuildToolPageRuntimeAssemblyInputBundleFromRouteInput['updateHistory'];
}

export function buildToolPageRuntimeAssemblyInputBundleFromRoute(
  input: BuildToolPageRuntimeAssemblyInputBundleFromRouteInput
): ReturnType<typeof buildToolPageRuntimeAssemblyInputFromRoute> {
  return buildToolPageRuntimeAssemblyInputFromRoute({
    ...buildToolPageRuntimeAssemblyBaseInputFromRoute({
      pathname: input.pathname,
      searchParams: input.searchParams,
      activeReviewLens: input.activeReviewLens,
      toolName: input.toolName,
      toolVerdict: input.toolVerdict,
      toolMeta: input.toolMeta,
      canonicalHardLimits: input.canonicalHardLimits,
    }),
    viewModelInput: buildToolPageRuntimeViewModelInputFromRoute(input.viewModel),
    lensContentInput: buildToolPageRuntimeLensContentInputFromRoute({
      toolName: input.toolName,
      ...input.lensContent,
    }),
    trust: buildToolPageRuntimeTrustInputFromRoute(input.trust),
    metaSignals: buildToolPageRuntimeMetaSignalsInputFromRoute(input.metaSignals),
    schemasInput: buildToolPageRuntimeSchemasInputFromRoute(input.schemas),
    updateHistoryInput: buildToolPageRuntimeUpdateHistoryInputFromRoute(input.updateHistory),
  });
}

export function buildToolPageRuntimeAssemblyInputBundleFromPageContext(
  input: BuildToolPageRuntimeAssemblyInputBundleFromPageContextInput
): ReturnType<typeof buildToolPageRuntimeAssemblyInputFromRoute> {
  const toolVerdict = typeof input.tool.verdict === 'string' ? input.tool.verdict : null;
  return buildToolPageRuntimeAssemblyInputBundleFromRoute({
    pathname: input.pathname,
    searchParams: input.searchParams,
    activeReviewLens: input.activeReviewLens,
    toolName: input.tool.name,
    toolVerdict,
    toolMeta: input.toolMeta,
    canonicalHardLimits: input.canonicalHardLimits,
    viewModel: input.viewModel,
    lensContent: input.lensContent,
    trust: input.trust,
    metaSignals: input.metaSignals,
    schemas: {
      tool: input.tool,
      primaryOffer: input.primaryOffer,
      reviewCount: input.tool.review_count,
      faqSchema: input.faqSchema,
    },
    updateHistory: input.updateHistory,
  });
}
