import { buildToolPageDataPrepRouteState } from '@/lib/tool-page/data-prep-route-state';
import { buildToolPageDecisionEvidenceRouteState } from '@/lib/tool-page/decision-evidence-route-state';
import { buildToolPageDisplayRouteState } from '@/lib/tool-page/display-route-state';
import { buildToolPageRuntimeMidRouteState } from '@/lib/tool-page/runtime-mid-route-state';

interface BuildToolPageRouteDataPipelineStateFromPageContextInput {
  toolPageData: Parameters<typeof buildToolPageDataPrepRouteState>[0]['toolPageData'];
  isEligibleEvidenceUrl: Parameters<
    typeof buildToolPageDataPrepRouteState
  >[0]['isEligibleEvidenceUrl'];
  activeReviewLens: Parameters<typeof buildToolPageRuntimeMidRouteState>[0]['activeReviewLens'];
  pathname: Parameters<
    typeof buildToolPageRuntimeMidRouteState
  >[0]['runtimeNavigation']['pathname'];
  searchParams: Parameters<
    typeof buildToolPageRuntimeMidRouteState
  >[0]['runtimeNavigation']['searchParams'];
}

export function buildToolPageRouteDataPipelineStateFromPageContext(
  input: BuildToolPageRouteDataPipelineStateFromPageContextInput
): ReturnType<typeof buildToolPageDataPrepRouteState> &
  ReturnType<typeof buildToolPageDecisionEvidenceRouteState> &
  ReturnType<typeof buildToolPageDisplayRouteState> &
  ReturnType<typeof buildToolPageRuntimeMidRouteState> {
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
  const runtimeMidState = buildToolPageRuntimeMidRouteState({
    activeReviewLens: input.activeReviewLens,
    canonicalHardLimits: displayState.canonicalHardLimits,
    specs: dataPrepState.tool.specs,
    userReportedPros: dataPrepState.userReportedPros,
    userReportedCons: dataPrepState.userReportedCons,
    category: dataPrepState.tool.category,
    runtimeNavigation: {
      pathname: input.pathname,
      searchParams: input.searchParams,
      tool: dataPrepState.tool,
      primaryOffer: dataPrepState.primaryOffer,
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
        typeof buildToolPageRuntimeMidRouteState
      >[0]['runtimeNavigation']['faqItems'],
      reviewArtifactsState: decisionEvidenceState.reviewArtifactsState,
      knowledgeCard: dataPrepState.knowledgeCard as Parameters<
        typeof buildToolPageRuntimeMidRouteState
      >[0]['runtimeNavigation']['knowledgeCard'],
      renderVerdictSafe: displayState.renderVerdictSafe,
      laneOutputs: dataPrepState.laneOutputs,
    },
  });

  return {
    ...dataPrepState,
    ...decisionEvidenceState,
    ...displayState,
    ...runtimeMidState,
  };
}
