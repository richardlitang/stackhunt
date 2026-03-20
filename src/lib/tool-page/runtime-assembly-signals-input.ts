import type { buildToolPageRuntimeAssemblyInputBundleFromPageContext } from '@/lib/tool-page/runtime-assembly-route-input';

type ToolPageRuntimeAssemblyPageContextInput = Parameters<
  typeof buildToolPageRuntimeAssemblyInputBundleFromPageContext
>[0];

interface BuildToolPageRuntimeAssemblySignalsInputFromRouteInput {
  hasVerdict: boolean;
  showProceduralVerdict: boolean;
  showPricingSection: boolean;
  hasGettingStarted: boolean;
  hasFeatures: boolean;
  hasSpecs: boolean;
  showProceduralSpecs: boolean;
  hasPlatform: boolean;
  hasAlternatives: boolean;
  hasCollectedSources: boolean;
  hasSecurity: boolean;
  decisionSnapshotBestWhen: string[];
  decisionSnapshotWatchOuts: string[];
  decisionSnapshotDifferentiators: string[];
  decisionTradeoffSummary: string | null;
  baseEvidenceGrade: ToolPageRuntimeAssemblyPageContextInput['trust']['baseEvidenceGrade'];
  avoidIfBullet: ToolPageRuntimeAssemblyPageContextInput['trust']['avoidIfBullet'];
  tradeoffCons: ToolPageRuntimeAssemblyPageContextInput['trust']['tradeoffCons'];
  decisionProofPoints: ToolPageRuntimeAssemblyPageContextInput['trust']['decisionProofPoints'];
  contentConfidenceLevel: ToolPageRuntimeAssemblyPageContextInput['trust']['contentConfidenceLevel'];
  hasPricingCheckedProof: ToolPageRuntimeAssemblyPageContextInput['trust']['hasPricingCheckedProof'];
  pricingCheckedLabel: ToolPageRuntimeAssemblyPageContextInput['updateHistory']['pricingCheckedLabel'];
  pricingSourceUrl: string | null;
  specsVerifiedLabel: ToolPageRuntimeAssemblyPageContextInput['updateHistory']['specsVerifiedLabel'];
  officialDocsSourceUrl: string | null;
  communityVerifiedLabel: ToolPageRuntimeAssemblyPageContextInput['updateHistory']['communityVerifiedLabel'];
  officialPricingSourceUrl: string | null;
  gateShouldIndex: boolean;
  isDraftPage: boolean;
  showReviewInProgressBanner: boolean;
  safeDraftDescription: string;
  decisionSnapshotSummary: string | null;
  renderVerdictSafe: string | null;
  evaluationDepth: string | null;
  hasFAQ: boolean;
  faqSchema: ToolPageRuntimeAssemblyPageContextInput['metaSignals']['faqSchema'];
  introLooksSpecSheet: boolean;
  hasSourceBackedMainRiskSignal?: boolean;
  hasSourceBackedUpgradeTriggerSignal?: boolean;
  hasSourceBackedImplementationFrictionSignal?: boolean;
  hasSourceBackedFitMatrixSignal?: boolean;
  hasSourceBackedTestBeforeBuySignal?: boolean;
}

export function buildToolPageRuntimeAssemblySignalsInputFromRoute(
  input: BuildToolPageRuntimeAssemblySignalsInputFromRouteInput
): Pick<
  ToolPageRuntimeAssemblyPageContextInput,
  'viewModel' | 'lensContent' | 'trust' | 'metaSignals' | 'updateHistory'
> {
  return {
    viewModel: {
      hasVerdict: input.hasVerdict,
      showProceduralVerdict: input.showProceduralVerdict,
      showPricingSection: input.showPricingSection,
      hasGettingStarted: input.hasGettingStarted,
      hasFeatures: input.hasFeatures,
      hasSpecs: input.hasSpecs,
      showProceduralSpecs: input.showProceduralSpecs,
      hasPlatform: input.hasPlatform,
      hasAlternatives: input.hasAlternatives,
    },
    lensContent: {
      hasCollectedSources: input.hasCollectedSources,
      hasGettingStarted: input.hasGettingStarted,
      showPricingSection: input.showPricingSection,
      hasSecurity: input.hasSecurity,
      decisionSnapshotBestWhen: input.decisionSnapshotBestWhen,
      decisionSnapshotWatchOuts: input.decisionSnapshotWatchOuts,
      decisionSnapshotDifferentiators: input.decisionSnapshotDifferentiators,
      decisionTradeoffSummary: input.decisionTradeoffSummary,
    },
    trust: {
      baseEvidenceGrade: input.baseEvidenceGrade,
      avoidIfBullet: input.avoidIfBullet,
      tradeoffCons: input.tradeoffCons,
      decisionProofPoints: input.decisionProofPoints,
      hasCollectedSources: input.hasCollectedSources,
      contentConfidenceLevel: input.contentConfidenceLevel,
      hasPricingCheckedProof: input.hasPricingCheckedProof,
      pricingCheckedLabel: input.pricingCheckedLabel,
      pricingSourceUrl: input.pricingSourceUrl,
      specsVerifiedLabel: input.specsVerifiedLabel,
      officialDocsSourceUrl: input.officialDocsSourceUrl,
      communityVerifiedLabel: input.communityVerifiedLabel,
      officialPricingSourceUrl: input.officialPricingSourceUrl,
    },
    metaSignals: {
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
      hasSourceBackedImplementationFrictionSignal:
        Boolean(input.hasSourceBackedImplementationFrictionSignal),
      hasSourceBackedFitMatrixSignal: Boolean(input.hasSourceBackedFitMatrixSignal),
      hasSourceBackedTestBeforeBuySignal: Boolean(input.hasSourceBackedTestBeforeBuySignal),
    },
    updateHistory: {
      communityVerifiedLabel: input.communityVerifiedLabel,
      specsVerifiedLabel: input.specsVerifiedLabel,
      pricingCheckedLabel: input.pricingCheckedLabel,
    },
  };
}
