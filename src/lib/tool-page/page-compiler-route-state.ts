import { buildToolPagePageAssemblyStateFromRouteDataContext } from '@/lib/tool-page/page-assembly-from-route-data-state';
import { buildToolPageRouteDataPipelineStateFromPageContext } from '@/lib/tool-page/route-data-pipeline-state';

interface BuildToolPagePageCompilerRouteStateFromPageContextInput {
  toolPageData: Parameters<typeof buildToolPageRouteDataPipelineStateFromPageContext>[0]['toolPageData'];
  isEligibleEvidenceUrl: Parameters<
    typeof buildToolPageRouteDataPipelineStateFromPageContext
  >[0]['isEligibleEvidenceUrl'];
  activeReviewLens: Parameters<
    typeof buildToolPageRouteDataPipelineStateFromPageContext
  >[0]['activeReviewLens'];
  pathname: Parameters<typeof buildToolPageRouteDataPipelineStateFromPageContext>[0]['pathname'];
  searchParams: Parameters<
    typeof buildToolPageRouteDataPipelineStateFromPageContext
  >[0]['searchParams'];
}

export function buildToolPagePageCompilerRouteStateFromPageContext(
  input: BuildToolPagePageCompilerRouteStateFromPageContextInput
): {
  routeDataState: ReturnType<typeof buildToolPageRouteDataPipelineStateFromPageContext>;
  pageAssemblyState: ReturnType<typeof buildToolPagePageAssemblyStateFromRouteDataContext>;
} {
  const routeDataState = buildToolPageRouteDataPipelineStateFromPageContext({
    toolPageData: input.toolPageData,
    isEligibleEvidenceUrl: input.isEligibleEvidenceUrl,
    activeReviewLens: input.activeReviewLens,
    pathname: input.pathname,
    searchParams: input.searchParams,
  });
  const pageAssemblyState = buildToolPagePageAssemblyStateFromRouteDataContext({
    routeDataState,
    activeReviewLens: input.activeReviewLens,
  });

  return {
    routeDataState,
    pageAssemblyState,
  };
}
