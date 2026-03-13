import { buildToolPageDecisionEvidenceRouteState } from '@/lib/tool-page/decision-evidence-route-state';
import { buildToolPageDisplayRouteState } from '@/lib/tool-page/display-route-state';
import { buildToolPageRuntimeMidRouteStateFromRouteContext } from '@/lib/tool-page/runtime-mid-route-state';

interface BuildToolPageRoutePipelineStateFromDataPrepContextInput {
  decisionSectionState: Parameters<
    typeof buildToolPageDecisionEvidenceRouteState
  >[0]['decisionSectionState'];
  decisionReviewArtifactsState: Parameters<
    typeof buildToolPageDecisionEvidenceRouteState
  >[0]['reviewArtifactsState'];
  evidenceSignalsState: Parameters<
    typeof buildToolPageDecisionEvidenceRouteState
  >[0]['evidenceSignalsState'];
  prepState: Parameters<typeof buildToolPageDisplayRouteState>[0]['prepState'];
  activeReviewLens: Parameters<
    typeof buildToolPageRuntimeMidRouteStateFromRouteContext
  >[0]['activeReviewLens'];
  tool: Parameters<typeof buildToolPageRuntimeMidRouteStateFromRouteContext>[0]['tool'];
  primaryOffer: Parameters<
    typeof buildToolPageRuntimeMidRouteStateFromRouteContext
  >[0]['primaryOffer'];
  knowledgeCard: Parameters<
    typeof buildToolPageRuntimeMidRouteStateFromRouteContext
  >[0]['knowledgeCard'];
  userReportedPros: Parameters<
    typeof buildToolPageRuntimeMidRouteStateFromRouteContext
  >[0]['userReportedPros'];
  userReportedCons: Parameters<
    typeof buildToolPageRuntimeMidRouteStateFromRouteContext
  >[0]['userReportedCons'];
  pathname: Parameters<typeof buildToolPageRuntimeMidRouteStateFromRouteContext>[0]['pathname'];
  searchParams: Parameters<
    typeof buildToolPageRuntimeMidRouteStateFromRouteContext
  >[0]['searchParams'];
}

export function buildToolPageRoutePipelineStateFromDataPrepContext(
  input: BuildToolPageRoutePipelineStateFromDataPrepContextInput
): ReturnType<typeof buildToolPageDecisionEvidenceRouteState> &
  ReturnType<typeof buildToolPageDisplayRouteState> &
  ReturnType<typeof buildToolPageRuntimeMidRouteStateFromRouteContext> {
  const decisionEvidenceState = buildToolPageDecisionEvidenceRouteState({
    decisionSectionState: input.decisionSectionState,
    reviewArtifactsState: input.decisionReviewArtifactsState,
    evidenceSignalsState: input.evidenceSignalsState,
  });
  const displayState = buildToolPageDisplayRouteState({
    prepState: input.prepState,
    qualityState: decisionEvidenceState.qualityState,
    decisionRuntime: decisionEvidenceState.decisionRuntime,
    sectionFlags: decisionEvidenceState.sectionFlags,
    presentationGates: decisionEvidenceState.presentationGates,
    reviewArtifactsState: decisionEvidenceState.reviewArtifactsState,
    reviewSignalsView: decisionEvidenceState.reviewSignalsView,
    evidenceRuntime: decisionEvidenceState.evidenceRuntime,
  });
  const runtimeMidState = buildToolPageRuntimeMidRouteStateFromRouteContext({
    activeReviewLens: input.activeReviewLens,
    canonicalHardLimits: displayState.canonicalHardLimits,
    specs: input.tool.specs,
    userReportedPros: input.userReportedPros,
    userReportedCons: input.userReportedCons,
    category: input.tool.category,
    pathname: input.pathname,
    searchParams: input.searchParams,
    tool: input.tool,
    primaryOffer: input.primaryOffer,
    faqSchema: decisionEvidenceState.faqSchema,
    decisionRuntime: decisionEvidenceState.decisionRuntime,
    sectionFlags: decisionEvidenceState.sectionFlags,
    evidenceRuntime: decisionEvidenceState.evidenceRuntime,
    qualityState: decisionEvidenceState.qualityState,
    reviewSignalsView: decisionEvidenceState.reviewSignalsView,
    presentationGates: {
      showProceduralVerdict: displayState.showProceduralVerdict,
      showProceduralSpecs: displayState.showProceduralSpecs,
    },
    evaluationDepth: displayState.evaluationDepth,
    hasStrengths: displayState.hasStrengths,
    faqItems: decisionEvidenceState.faqItems as Parameters<
      typeof buildToolPageRuntimeMidRouteStateFromRouteContext
    >[0]['faqItems'],
    reviewArtifactsState: decisionEvidenceState.reviewArtifactsState,
    knowledgeCard: input.knowledgeCard,
    renderVerdictSafe: displayState.renderVerdictSafe,
  });

  return {
    ...decisionEvidenceState,
    ...displayState,
    ...runtimeMidState,
  };
}
