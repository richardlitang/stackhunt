import { buildToolPagePageAssemblyRouteStateFromRouteData } from '@/lib/tool-page/page-assembly-route-state';
import { buildToolPageRouteDataPipelineStateFromPageContext } from '@/lib/tool-page/route-data-pipeline-state';

interface BuildToolPagePageCompilerRouteStateFromPageContextInput {
  toolPageData: Parameters<
    typeof buildToolPageRouteDataPipelineStateFromPageContext
  >[0]['toolPageData'];
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

function toDecisionConfidenceLabel(level: string): string {
  if (level === 'low') return 'Low';
  if (level === 'medium') return 'Medium';
  if (level === 'high') return 'High';
  return level;
}

export function buildToolPagePageCompilerRouteStateFromPageContext(
  input: BuildToolPagePageCompilerRouteStateFromPageContextInput
): {
  routeDataState: ReturnType<typeof buildToolPageRouteDataPipelineStateFromPageContext>;
  pageAssemblyState: ReturnType<typeof buildToolPagePageAssemblyRouteStateFromRouteData>;
} {
  const routeDataState = buildToolPageRouteDataPipelineStateFromPageContext({
    toolPageData: input.toolPageData,
    isEligibleEvidenceUrl: input.isEligibleEvidenceUrl,
    activeReviewLens: input.activeReviewLens,
    pathname: input.pathname,
    searchParams: input.searchParams,
  });
  const hasApi = Boolean(routeDataState.knowledgeCard?.integrations?.has_api);

  const pageAssemblyState = buildToolPagePageAssemblyRouteStateFromRouteData({
    runtime: {
      runtimeViewBundle: routeDataState.runtimeViewBundle,
      firstReview: routeDataState.firstReview as Parameters<
        typeof buildToolPagePageAssemblyRouteStateFromRouteData
      >[0]['runtime']['firstReview'],
      tool: routeDataState.tool as Parameters<
        typeof buildToolPagePageAssemblyRouteStateFromRouteData
      >[0]['runtime']['tool'],
      categoryName: routeDataState.tool.category?.name || null,
    },
    chrome: {
      chromeLens: {
        lensRuntime: routeDataState.runtimeViewBundle.lensRuntime,
        activeReviewLens: input.activeReviewLens,
        toolCategory: routeDataState.toolCategoryRef,
        tool: routeDataState.tool as Parameters<
          typeof buildToolPagePageAssemblyRouteStateFromRouteData
        >[0]['chrome']['chromeLens']['tool'],
        websiteHostLabel: routeDataState.websiteHostLabel || '',
        runtimeViewBundle: routeDataState.runtimeViewBundle as Parameters<
          typeof buildToolPagePageAssemblyRouteStateFromRouteData
        >[0]['chrome']['chromeLens']['runtimeViewBundle'],
        evidenceRuntime: routeDataState.evidenceRuntime,
        reviewSignalsView: routeDataState.reviewSignalsView,
        evaluationDepth: routeDataState.evaluationDepth,
        qualityState: routeDataState.qualityState,
      },
      contentAlternatives: {
        activeReviewLens: input.activeReviewLens,
        alternativesLabel: routeDataState.alternativesLabel,
        toolCategoryRef: routeDataState.toolCategoryRef,
        orderedAlternatives: routeDataState.orderedAlternatives,
        comparableAlternatives: routeDataState.comparableAlternatives,
        canCompareByAlternativeSlug: routeDataState.canCompareByAlternativeSlug,
        tool: routeDataState.tool,
        knowledgeCard: routeDataState.knowledgeCard as Parameters<
          typeof buildToolPagePageAssemblyRouteStateFromRouteData
        >[0]['chrome']['contentAlternatives']['knowledgeCard'],
        parentTool: routeDataState.parentTool,
        setupTracks: routeDataState.setupTracks,
        displayCategorySpecificData: routeDataState.displayCategorySpecificData || null,
        vipSpecifics: routeDataState.vipSpecifics || null,
        userReportedPros: routeDataState.userReportedPros,
        userReportedCons: routeDataState.userReportedCons,
        laneOutputs: routeDataState.laneOutputs as Parameters<
          typeof buildToolPagePageAssemblyRouteStateFromRouteData
        >[0]['chrome']['contentAlternatives']['laneOutputs'],
        decisionRuntime: routeDataState.decisionRuntime,
        sectionFlags: routeDataState.sectionFlags,
        evidenceRuntime: routeDataState.evidenceRuntime,
        reviewArtifactsState: routeDataState.reviewArtifactsState,
        reviewSignalsView: routeDataState.reviewSignalsView,
        reviewContextSignals: routeDataState.reviewContextSignals,
        qualityState: routeDataState.qualityState,
      },
    },
    decision: {
      tool: {
        name: routeDataState.tool.name,
        categorySlug: routeDataState.tool.category?.slug || null,
        pricingType: routeDataState.tool.pricing_type || null,
      },
      resolvedSubject: {
        subjectType: routeDataState.resolvedSubject?.subjectType || null,
        entityScope: routeDataState.resolvedSubject?.entityScope || null,
      },
      activeReviewLens: input.activeReviewLens,
      hasApi,
      hasParentTool: Boolean(routeDataState.parentTool),
      audiences: routeDataState.tags.audiences,
      topLensHardLimit: routeDataState.topLensHardLimit as Parameters<
        typeof buildToolPagePageAssemblyRouteStateFromRouteData
      >[0]['decision']['topLensHardLimit'],
      pricingEvidenceLinks: routeDataState.pricingEvidenceLinks,
      officialPricingSourceUrl: routeDataState.officialPricingSource?.url || null,
      contentConfidenceLabel: toDecisionConfidenceLabel(
        routeDataState.qualityState.contentConfidenceLevel
      ),
    },
    navigation: {
      navigationState: routeDataState.navigationState,
      categorySlug: routeDataState.tool.category?.slug || null,
      hasGettingStarted: routeDataState.hasGettingStarted,
    },
    ctaMediaState: routeDataState.ctaMediaState,
    activeReviewLens: input.activeReviewLens,
    laneOutputs: routeDataState.laneOutputs,
  });

  return {
    routeDataState,
    pageAssemblyState,
  };
}
