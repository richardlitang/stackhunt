import { generateToolMeta } from '@/lib/seo';
import { buildToolPageLensHardLimitRouteState } from '@/lib/tool-page/lens-hard-limit-route-state';
import { buildToolPageRuntimeNavigationRouteState } from '@/lib/tool-page/runtime-navigation-route-state';
import { buildToolPageSpecsCategoryRouteState } from '@/lib/tool-page/specs-category-route-state';

interface BuildToolPageRuntimeMidRouteStateInput {
  activeReviewLens: Parameters<
    typeof buildToolPageRuntimeNavigationRouteState
  >[0]['activeReviewLens'];
  canonicalHardLimits: Parameters<
    typeof buildToolPageLensHardLimitRouteState
  >[0]['canonicalHardLimits'];
  specs: Parameters<typeof buildToolPageSpecsCategoryRouteState>[0]['specs'];
  userReportedPros: Parameters<typeof buildToolPageSpecsCategoryRouteState>[0]['userReportedPros'];
  userReportedCons: Parameters<typeof buildToolPageSpecsCategoryRouteState>[0]['userReportedCons'];
  category: Parameters<typeof buildToolPageSpecsCategoryRouteState>[0]['category'];
  runtimeNavigation: Omit<
    Parameters<typeof buildToolPageRuntimeNavigationRouteState>[0],
    'activeReviewLens' | 'canonicalHardLimits' | 'toolMeta' | 'category'
  >;
}

interface BuildToolPageRuntimeMidRouteStateFromRouteContextInput {
  activeReviewLens: BuildToolPageRuntimeMidRouteStateInput['activeReviewLens'];
  canonicalHardLimits: BuildToolPageRuntimeMidRouteStateInput['canonicalHardLimits'];
  specs: BuildToolPageRuntimeMidRouteStateInput['specs'];
  userReportedPros: BuildToolPageRuntimeMidRouteStateInput['userReportedPros'];
  userReportedCons: BuildToolPageRuntimeMidRouteStateInput['userReportedCons'];
  category: BuildToolPageRuntimeMidRouteStateInput['category'];
  pathname: BuildToolPageRuntimeMidRouteStateInput['runtimeNavigation']['pathname'];
  searchParams: BuildToolPageRuntimeMidRouteStateInput['runtimeNavigation']['searchParams'];
  tool: BuildToolPageRuntimeMidRouteStateInput['runtimeNavigation']['tool'];
  primaryOffer: BuildToolPageRuntimeMidRouteStateInput['runtimeNavigation']['primaryOffer'];
  faqSchema: BuildToolPageRuntimeMidRouteStateInput['runtimeNavigation']['faqSchema'];
  decisionRuntime: BuildToolPageRuntimeMidRouteStateInput['runtimeNavigation']['decisionRuntime'];
  sectionFlags: BuildToolPageRuntimeMidRouteStateInput['runtimeNavigation']['sectionFlags'];
  evidenceRuntime: BuildToolPageRuntimeMidRouteStateInput['runtimeNavigation']['evidenceRuntime'];
  qualityState: BuildToolPageRuntimeMidRouteStateInput['runtimeNavigation']['qualityState'];
  reviewSignalsView: BuildToolPageRuntimeMidRouteStateInput['runtimeNavigation']['reviewSignalsView'];
  presentationGates: BuildToolPageRuntimeMidRouteStateInput['runtimeNavigation']['presentationGates'];
  evaluationDepth: BuildToolPageRuntimeMidRouteStateInput['runtimeNavigation']['evaluationDepth'];
  hasStrengths: BuildToolPageRuntimeMidRouteStateInput['runtimeNavigation']['hasStrengths'];
  faqItems: BuildToolPageRuntimeMidRouteStateInput['runtimeNavigation']['faqItems'];
  reviewArtifactsState: BuildToolPageRuntimeMidRouteStateInput['runtimeNavigation']['reviewArtifactsState'];
  knowledgeCard: BuildToolPageRuntimeMidRouteStateInput['runtimeNavigation']['knowledgeCard'];
  renderVerdictSafe: BuildToolPageRuntimeMidRouteStateInput['runtimeNavigation']['renderVerdictSafe'];
}

export function buildToolPageRuntimeMidRouteState(
  input: BuildToolPageRuntimeMidRouteStateInput
): ReturnType<typeof buildToolPageLensHardLimitRouteState> &
  ReturnType<typeof buildToolPageSpecsCategoryRouteState> &
  ReturnType<typeof buildToolPageRuntimeNavigationRouteState> {
  const lensHardLimitState = buildToolPageLensHardLimitRouteState({
    canonicalHardLimits: input.canonicalHardLimits,
    activeReviewLens: input.activeReviewLens,
  });
  const specsCategoryState = buildToolPageSpecsCategoryRouteState({
    specs: input.specs,
    userReportedPros: input.userReportedPros,
    userReportedCons: input.userReportedCons,
    activeReviewLens: input.activeReviewLens,
    category: input.category,
  });
  const toolMeta = generateToolMeta(
    input.runtimeNavigation.tool,
    input.runtimeNavigation.tool.review_count
  );
  const runtimeNavigationState = buildToolPageRuntimeNavigationRouteState({
    ...input.runtimeNavigation,
    activeReviewLens: input.activeReviewLens,
    canonicalHardLimits: input.canonicalHardLimits,
    toolMeta,
    category: specsCategoryState.toolCategoryRef,
  });

  return {
    ...lensHardLimitState,
    ...specsCategoryState,
    ...runtimeNavigationState,
  };
}

export function buildToolPageRuntimeMidRouteStateFromRouteContext(
  input: BuildToolPageRuntimeMidRouteStateFromRouteContextInput
): ReturnType<typeof buildToolPageRuntimeMidRouteState> {
  return buildToolPageRuntimeMidRouteState({
    activeReviewLens: input.activeReviewLens,
    canonicalHardLimits: input.canonicalHardLimits,
    specs: input.specs,
    userReportedPros: input.userReportedPros,
    userReportedCons: input.userReportedCons,
    category: input.category,
    runtimeNavigation: {
      pathname: input.pathname,
      searchParams: input.searchParams,
      tool: input.tool,
      primaryOffer: input.primaryOffer,
      faqSchema: input.faqSchema,
      decisionRuntime: input.decisionRuntime,
      sectionFlags: input.sectionFlags,
      evidenceRuntime: input.evidenceRuntime,
      qualityState: input.qualityState,
      reviewSignalsView: input.reviewSignalsView,
      presentationGates: input.presentationGates,
      evaluationDepth: input.evaluationDepth,
      hasStrengths: input.hasStrengths,
      faqItems: input.faqItems,
      reviewArtifactsState: input.reviewArtifactsState,
      knowledgeCard: input.knowledgeCard,
      renderVerdictSafe: input.renderVerdictSafe,
    },
  });
}
