import { buildToolPageDataPrepRouteState } from '@/lib/tool-page/data-prep-route-state';
import { buildToolPageRoutePipelineStateFromDataPrepContext } from '@/lib/tool-page/route-pipeline-state';

interface BuildToolPageRouteDataPipelineStateFromPageContextInput {
  toolPageData: Parameters<typeof buildToolPageDataPrepRouteState>[0]['toolPageData'];
  isEligibleEvidenceUrl: Parameters<
    typeof buildToolPageDataPrepRouteState
  >[0]['isEligibleEvidenceUrl'];
  activeReviewLens: Parameters<
    typeof buildToolPageRoutePipelineStateFromDataPrepContext
  >[0]['activeReviewLens'];
  pathname: Parameters<typeof buildToolPageRoutePipelineStateFromDataPrepContext>[0]['pathname'];
  searchParams: Parameters<
    typeof buildToolPageRoutePipelineStateFromDataPrepContext
  >[0]['searchParams'];
}

export function buildToolPageRouteDataPipelineStateFromPageContext(
  input: BuildToolPageRouteDataPipelineStateFromPageContextInput
): ReturnType<typeof buildToolPageDataPrepRouteState> &
  ReturnType<typeof buildToolPageRoutePipelineStateFromDataPrepContext> {
  const dataPrepState = buildToolPageDataPrepRouteState({
    toolPageData: input.toolPageData,
    isEligibleEvidenceUrl: input.isEligibleEvidenceUrl,
  });
  const pipelineState = buildToolPageRoutePipelineStateFromDataPrepContext({
    decisionSectionState: dataPrepState.decisionSectionState,
    decisionReviewArtifactsState: dataPrepState.reviewArtifactsState,
    evidenceSignalsState: dataPrepState.evidenceSignalsState,
    prepState: dataPrepState.prepState,
    activeReviewLens: input.activeReviewLens,
    tool: dataPrepState.tool,
    primaryOffer: dataPrepState.primaryOffer,
    knowledgeCard: dataPrepState.knowledgeCard as Parameters<
      typeof buildToolPageRoutePipelineStateFromDataPrepContext
    >[0]['knowledgeCard'],
    userReportedPros: dataPrepState.userReportedPros,
    userReportedCons: dataPrepState.userReportedCons,
    pathname: input.pathname,
    searchParams: input.searchParams,
  });

  return {
    ...dataPrepState,
    ...pipelineState,
  };
}
