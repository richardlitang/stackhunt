import { buildToolPagePageAssemblyRouteStateFromRouteData } from '@/lib/tool-page/page-assembly-route-state';
import type { buildToolPageRouteDataPipelineStateFromPageContext } from '@/lib/tool-page/route-data-pipeline-state';

interface BuildToolPagePageAssemblyStateFromRouteDataContextInput {
  routeDataState: ReturnType<typeof buildToolPageRouteDataPipelineStateFromPageContext>;
  activeReviewLens: Parameters<
    typeof buildToolPagePageAssemblyRouteStateFromRouteData
  >[0]['decision']['activeReviewLens'];
}

function toDecisionConfidenceLabel(level: string): string {
  if (level === 'low') return 'Low';
  if (level === 'medium') return 'Medium';
  if (level === 'high') return 'High';
  return level;
}

export function buildToolPagePageAssemblyStateFromRouteDataContext(
  input: BuildToolPagePageAssemblyStateFromRouteDataContextInput
): ReturnType<typeof buildToolPagePageAssemblyRouteStateFromRouteData> {
  const { routeDataState } = input;
  const hasApi = Boolean(routeDataState.knowledgeCard?.integrations?.has_api);

  return buildToolPagePageAssemblyRouteStateFromRouteData({
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
    },
    ctaMediaState: routeDataState.ctaMediaState,
  });
}
