import { buildToolPagePageAssemblyRouteStateFromPageContext } from '@/lib/tool-page/page-assembly-route-context';
import type { buildToolPageRouteDataPipelineStateFromPageContext } from '@/lib/tool-page/route-data-pipeline-state';

interface BuildToolPagePageAssemblyStateFromRouteDataContextInput {
  routeDataState: ReturnType<typeof buildToolPageRouteDataPipelineStateFromPageContext>;
  activeReviewLens: Parameters<
    typeof buildToolPagePageAssemblyRouteStateFromPageContext
  >[0]['activeReviewLens'];
}

export function buildToolPagePageAssemblyStateFromRouteDataContext(
  input: BuildToolPagePageAssemblyStateFromRouteDataContextInput
): ReturnType<typeof buildToolPagePageAssemblyRouteStateFromPageContext> {
  const { routeDataState } = input;

  return buildToolPagePageAssemblyRouteStateFromPageContext({
    runtimeViewBundle: routeDataState.runtimeViewBundle,
    firstReview: routeDataState.firstReview as Parameters<
      typeof buildToolPagePageAssemblyRouteStateFromPageContext
    >[0]['firstReview'],
    tool: routeDataState.tool,
    activeReviewLens: input.activeReviewLens,
    alternativesLabel: routeDataState.alternativesLabel,
    toolCategoryRef: routeDataState.toolCategoryRef,
    orderedAlternatives: routeDataState.orderedAlternatives,
    comparableAlternatives: routeDataState.comparableAlternatives,
    canCompareByAlternativeSlug: routeDataState.canCompareByAlternativeSlug,
    knowledgeCard: routeDataState.knowledgeCard,
    parentTool: routeDataState.parentTool,
    setupTracks: routeDataState.setupTracks,
    displayCategorySpecificData: routeDataState.displayCategorySpecificData || null,
    vipSpecifics: routeDataState.vipSpecifics || null,
    userReportedPros: routeDataState.userReportedPros,
    userReportedCons: routeDataState.userReportedCons,
    laneOutputs: routeDataState.laneOutputs as Parameters<
      typeof buildToolPagePageAssemblyRouteStateFromPageContext
    >[0]['laneOutputs'],
    decisionRuntime: routeDataState.decisionRuntime,
    sectionFlags: routeDataState.sectionFlags,
    evidenceRuntime: routeDataState.evidenceRuntime,
    reviewArtifactsState: routeDataState.reviewArtifactsState,
    reviewSignalsView: routeDataState.reviewSignalsView,
    reviewContextSignals: routeDataState.reviewContextSignals,
    qualityState: routeDataState.qualityState,
    websiteHostLabel: routeDataState.websiteHostLabel || '',
    evaluationDepth: routeDataState.evaluationDepth,
    resolvedSubject: {
      subjectType: routeDataState.resolvedSubject?.subjectType || null,
      entityScope: routeDataState.resolvedSubject?.entityScope || null,
    },
    audiences: routeDataState.tags.audiences,
    topLensHardLimit: routeDataState.topLensHardLimit as Parameters<
      typeof buildToolPagePageAssemblyRouteStateFromPageContext
    >[0]['topLensHardLimit'],
    pricingEvidenceLinks: routeDataState.pricingEvidenceLinks,
    officialPricingSourceUrl: routeDataState.officialPricingSource?.url || null,
    navigationState: routeDataState.navigationState,
    ctaMediaState: routeDataState.ctaMediaState,
  });
}
