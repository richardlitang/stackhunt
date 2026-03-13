import type { buildToolPagePageAssemblyRouteStateFromRouteContext } from '@/lib/tool-page/page-assembly-route-state';
import type { buildToolPageRuntimeMidRouteState } from '@/lib/tool-page/runtime-mid-route-state';

interface BuildToolPagePageAssemblyRouteStateInputFromRouteContextInput {
  runtimeViewBundle: ReturnType<typeof buildToolPageRuntimeMidRouteState>['runtimeViewBundle'];
  firstReview: Parameters<
    typeof buildToolPagePageAssemblyRouteStateFromRouteContext
  >[0]['runtime']['firstReview'];
  tool: {
    name: string;
    category?: { slug?: string | null; name?: string | null } | null;
    pricing_type?: string | null;
  } & Record<string, unknown>;
  activeReviewLens: Parameters<
    typeof buildToolPagePageAssemblyRouteStateFromRouteContext
  >[0]['chrome']['activeReviewLens'];
  alternativesLabel: Parameters<
    typeof buildToolPagePageAssemblyRouteStateFromRouteContext
  >[0]['chrome']['alternativesLabel'];
  toolCategoryRef: Parameters<
    typeof buildToolPagePageAssemblyRouteStateFromRouteContext
  >[0]['chrome']['toolCategoryRef'];
  orderedAlternatives: Parameters<
    typeof buildToolPagePageAssemblyRouteStateFromRouteContext
  >[0]['chrome']['orderedAlternatives'];
  comparableAlternatives: Parameters<
    typeof buildToolPagePageAssemblyRouteStateFromRouteContext
  >[0]['chrome']['comparableAlternatives'];
  canCompareByAlternativeSlug: Parameters<
    typeof buildToolPagePageAssemblyRouteStateFromRouteContext
  >[0]['chrome']['canCompareByAlternativeSlug'];
  knowledgeCard: Parameters<
    typeof buildToolPagePageAssemblyRouteStateFromRouteContext
  >[0]['chrome']['knowledgeCard'];
  parentTool: Parameters<
    typeof buildToolPagePageAssemblyRouteStateFromRouteContext
  >[0]['chrome']['parentTool'];
  setupTracks: Parameters<
    typeof buildToolPagePageAssemblyRouteStateFromRouteContext
  >[0]['chrome']['setupTracks'];
  displayCategorySpecificData: Parameters<
    typeof buildToolPagePageAssemblyRouteStateFromRouteContext
  >[0]['chrome']['displayCategorySpecificData'];
  vipSpecifics: Parameters<
    typeof buildToolPagePageAssemblyRouteStateFromRouteContext
  >[0]['chrome']['vipSpecifics'];
  userReportedPros: Parameters<
    typeof buildToolPagePageAssemblyRouteStateFromRouteContext
  >[0]['chrome']['userReportedPros'];
  userReportedCons: Parameters<
    typeof buildToolPagePageAssemblyRouteStateFromRouteContext
  >[0]['chrome']['userReportedCons'];
  laneOutputs: Parameters<
    typeof buildToolPagePageAssemblyRouteStateFromRouteContext
  >[0]['chrome']['laneOutputs'];
  decisionRuntime: Parameters<
    typeof buildToolPagePageAssemblyRouteStateFromRouteContext
  >[0]['chrome']['decisionRuntime'];
  sectionFlags: Parameters<
    typeof buildToolPagePageAssemblyRouteStateFromRouteContext
  >[0]['chrome']['sectionFlags'];
  evidenceRuntime: Parameters<
    typeof buildToolPagePageAssemblyRouteStateFromRouteContext
  >[0]['chrome']['evidenceRuntime'];
  reviewArtifactsState: Parameters<
    typeof buildToolPagePageAssemblyRouteStateFromRouteContext
  >[0]['chrome']['reviewArtifactsState'];
  reviewSignalsView: Parameters<
    typeof buildToolPagePageAssemblyRouteStateFromRouteContext
  >[0]['chrome']['reviewSignalsView'];
  reviewContextSignals: Parameters<
    typeof buildToolPagePageAssemblyRouteStateFromRouteContext
  >[0]['chrome']['reviewContextSignals'];
  qualityState: Parameters<
    typeof buildToolPagePageAssemblyRouteStateFromRouteContext
  >[0]['chrome']['qualityState'];
  websiteHostLabel: Parameters<
    typeof buildToolPagePageAssemblyRouteStateFromRouteContext
  >[0]['chrome']['websiteHostLabel'];
  evaluationDepth: Parameters<
    typeof buildToolPagePageAssemblyRouteStateFromRouteContext
  >[0]['chrome']['evaluationDepth'];
  resolvedSubject: Parameters<
    typeof buildToolPagePageAssemblyRouteStateFromRouteContext
  >[0]['decision']['resolvedSubject'];
  audiences: Parameters<
    typeof buildToolPagePageAssemblyRouteStateFromRouteContext
  >[0]['decision']['audiences'];
  topLensHardLimit: Parameters<
    typeof buildToolPagePageAssemblyRouteStateFromRouteContext
  >[0]['decision']['topLensHardLimit'];
  pricingEvidenceLinks: Parameters<
    typeof buildToolPagePageAssemblyRouteStateFromRouteContext
  >[0]['decision']['pricingEvidenceLinks'];
  officialPricingSourceUrl: Parameters<
    typeof buildToolPagePageAssemblyRouteStateFromRouteContext
  >[0]['decision']['officialPricingSourceUrl'];
  navigationState: Parameters<
    typeof buildToolPagePageAssemblyRouteStateFromRouteContext
  >[0]['navigation']['navigationState'];
  ctaMediaState: Parameters<
    typeof buildToolPagePageAssemblyRouteStateFromRouteContext
  >[0]['ctaMediaState'];
}

function toDecisionConfidenceLabel(level: string): string {
  if (level === 'low') return 'Low';
  if (level === 'medium') return 'Medium';
  if (level === 'high') return 'High';
  return level;
}

export function buildToolPagePageAssemblyRouteStateInputFromRouteContext(
  input: BuildToolPagePageAssemblyRouteStateInputFromRouteContextInput
): Parameters<typeof buildToolPagePageAssemblyRouteStateFromRouteContext>[0] {
  const hasApi = Boolean(
    (
      input.knowledgeCard as {
        integrations?: { has_api?: boolean | null } | null;
      } | null
    )?.integrations?.has_api
  );

  return {
    runtime: {
      runtimeViewBundle: input.runtimeViewBundle,
      firstReview: input.firstReview,
      tool: input.tool as unknown as Parameters<
        typeof buildToolPagePageAssemblyRouteStateFromRouteContext
      >[0]['runtime']['tool'],
      categoryName: input.tool.category?.name || null,
    },
    chrome: {
      activeReviewLens: input.activeReviewLens,
      alternativesLabel: input.alternativesLabel,
      toolCategoryRef: input.toolCategoryRef,
      orderedAlternatives: input.orderedAlternatives,
      comparableAlternatives: input.comparableAlternatives,
      canCompareByAlternativeSlug: input.canCompareByAlternativeSlug,
      tool: input.tool as unknown as Parameters<
        typeof buildToolPagePageAssemblyRouteStateFromRouteContext
      >[0]['chrome']['tool'],
      knowledgeCard: input.knowledgeCard,
      parentTool: input.parentTool,
      setupTracks: input.setupTracks,
      displayCategorySpecificData: input.displayCategorySpecificData,
      vipSpecifics: input.vipSpecifics,
      userReportedPros: input.userReportedPros,
      userReportedCons: input.userReportedCons,
      laneOutputs: input.laneOutputs,
      decisionRuntime: input.decisionRuntime,
      sectionFlags: input.sectionFlags,
      evidenceRuntime: input.evidenceRuntime,
      reviewArtifactsState: input.reviewArtifactsState,
      reviewSignalsView: input.reviewSignalsView,
      reviewContextSignals: input.reviewContextSignals,
      qualityState: input.qualityState,
      lensRuntime: input.runtimeViewBundle.lensRuntime,
      websiteHostLabel: input.websiteHostLabel,
      runtimeViewBundle: input.runtimeViewBundle as Parameters<
        typeof buildToolPagePageAssemblyRouteStateFromRouteContext
      >[0]['chrome']['runtimeViewBundle'],
      evaluationDepth: input.evaluationDepth,
    },
    decision: {
      tool: {
        name: input.tool.name,
        categorySlug: input.tool.category?.slug || null,
        pricingType: input.tool.pricing_type || null,
      },
      resolvedSubject: input.resolvedSubject,
      activeReviewLens: input.activeReviewLens,
      hasApi,
      hasParentTool: Boolean(input.parentTool),
      audiences: input.audiences,
      topLensHardLimit: input.topLensHardLimit,
      pricingEvidenceLinks: input.pricingEvidenceLinks,
      officialPricingSourceUrl: input.officialPricingSourceUrl,
      contentConfidenceLabel: toDecisionConfidenceLabel(input.qualityState.contentConfidenceLevel),
    },
    navigation: {
      navigationState: input.navigationState,
      categorySlug: input.tool.category?.slug || null,
    },
    ctaMediaState: input.ctaMediaState,
  };
}
