import { buildToolPageDataPrepRouteState } from '@/lib/tool-page/data-prep-route-state';
import { buildToolPageDecisionEvidenceRouteState } from '@/lib/tool-page/decision-evidence-route-state';
import { buildToolPageDisplayRouteState } from '@/lib/tool-page/display-route-state';
import { buildToolPageRuntimeMidRouteStateFromRouteContext } from '@/lib/tool-page/runtime-mid-route-state';

interface BuildToolPageRouteDataPipelineStateFromPageContextInput {
  toolPageData: Parameters<typeof buildToolPageDataPrepRouteState>[0]['toolPageData'];
  isEligibleEvidenceUrl: Parameters<
    typeof buildToolPageDataPrepRouteState
  >[0]['isEligibleEvidenceUrl'];
  activeReviewLens: Parameters<
    typeof buildToolPageRuntimeMidRouteStateFromRouteContext
  >[0]['activeReviewLens'];
  pathname: Parameters<typeof buildToolPageRuntimeMidRouteStateFromRouteContext>[0]['pathname'];
  searchParams: Parameters<typeof buildToolPageRuntimeMidRouteStateFromRouteContext>[0]['searchParams'];
}

export function buildToolPageRouteDataPipelineStateFromPageContext(
  input: BuildToolPageRouteDataPipelineStateFromPageContextInput
): ReturnType<typeof buildToolPageDataPrepRouteState> &
  ReturnType<typeof buildToolPageDecisionEvidenceRouteState> &
  ReturnType<typeof buildToolPageDisplayRouteState> &
  ReturnType<typeof buildToolPageRuntimeMidRouteStateFromRouteContext> {
  const dataPrepState = buildToolPageDataPrepRouteState({
    toolPageData: input.toolPageData,
    isEligibleEvidenceUrl: input.isEligibleEvidenceUrl,
  });

  const decisionEvidenceState = buildToolPageDecisionEvidenceRouteState({
    decisionSectionState: dataPrepState.decisionSectionState,
    reviewArtifactsState: dataPrepState.reviewArtifactsState,
    evidenceSignalsState: dataPrepState.evidenceSignalsState,
  });
  const displayState = buildToolPageDisplayRouteState({
    prepState: dataPrepState.prepState,
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
    tool: dataPrepState.tool,
    primaryOffer: dataPrepState.primaryOffer,
    knowledgeCard: dataPrepState.knowledgeCard as Parameters<
      typeof buildToolPageRuntimeMidRouteStateFromRouteContext
    >[0]['knowledgeCard'],
    userReportedPros: dataPrepState.userReportedPros,
    userReportedCons: dataPrepState.userReportedCons,
    canonicalHardLimits: displayState.canonicalHardLimits,
    specs: dataPrepState.tool.specs,
    category: dataPrepState.tool.category,
    pathname: input.pathname,
    searchParams: input.searchParams,
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
    renderVerdictSafe: displayState.renderVerdictSafe,
  });

  return {
    ...dataPrepState,
    ...decisionEvidenceState,
    ...displayState,
    ...runtimeMidState,
  };
}
