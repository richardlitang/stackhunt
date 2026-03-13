import type { buildToolPageQualityState } from '@/lib/tool-page/quality-state';
import type { buildToolPageReviewArtifactsState } from '@/lib/tool-page/review-artifacts-state';
import type { buildToolPageReviewSignalsView } from '@/lib/tool-page/review-signals-view';
import { buildToolPageChromeRouteStateFromDecisionContext } from '@/lib/tool-page/chrome-route-state';
import type { buildToolPageDecisionRuntime } from '@/lib/tool-page/decision-runtime';
import type { buildToolPageSectionFlags } from '@/lib/tool-page/section-flags';
import type { buildToolPageEvidenceRuntime } from '@/lib/tool-page/evidence-runtime';
import type { ToolPageReviewContextSignals } from '@/lib/tool-page/review-context';
import type { ReviewLens } from '@/lib/tool-page/view-model';

interface BuildToolPageChromeAssemblyRouteStateInput {
  activeReviewLens: ReviewLens;
  alternativesLabel: Parameters<
    typeof buildToolPageChromeRouteStateFromDecisionContext
  >[0]['contentAlternatives']['alternativesLabel'];
  toolCategoryRef: Parameters<
    typeof buildToolPageChromeRouteStateFromDecisionContext
  >[0]['contentAlternatives']['toolCategoryRef'];
  orderedAlternatives: Parameters<
    typeof buildToolPageChromeRouteStateFromDecisionContext
  >[0]['contentAlternatives']['orderedAlternatives'];
  comparableAlternatives: Parameters<
    typeof buildToolPageChromeRouteStateFromDecisionContext
  >[0]['contentAlternatives']['comparableAlternatives'];
  canCompareByAlternativeSlug: Parameters<
    typeof buildToolPageChromeRouteStateFromDecisionContext
  >[0]['contentAlternatives']['canCompareByAlternativeSlug'];
  tool: Parameters<
    typeof buildToolPageChromeRouteStateFromDecisionContext
  >[0]['contentAlternatives']['tool'];
  knowledgeCard: Parameters<
    typeof buildToolPageChromeRouteStateFromDecisionContext
  >[0]['contentAlternatives']['knowledgeCard'];
  parentTool: Parameters<
    typeof buildToolPageChromeRouteStateFromDecisionContext
  >[0]['contentAlternatives']['parentTool'];
  setupTracks: Parameters<
    typeof buildToolPageChromeRouteStateFromDecisionContext
  >[0]['contentAlternatives']['setupTracks'];
  displayCategorySpecificData: Parameters<
    typeof buildToolPageChromeRouteStateFromDecisionContext
  >[0]['contentAlternatives']['displayCategorySpecificData'];
  vipSpecifics: Parameters<
    typeof buildToolPageChromeRouteStateFromDecisionContext
  >[0]['contentAlternatives']['vipSpecifics'];
  userReportedPros: Parameters<
    typeof buildToolPageChromeRouteStateFromDecisionContext
  >[0]['contentAlternatives']['userReportedPros'];
  userReportedCons: Parameters<
    typeof buildToolPageChromeRouteStateFromDecisionContext
  >[0]['contentAlternatives']['userReportedCons'];
  laneOutputs: Parameters<
    typeof buildToolPageChromeRouteStateFromDecisionContext
  >[0]['contentAlternatives']['laneOutputs'];
  decisionRuntime: ReturnType<typeof buildToolPageDecisionRuntime>;
  sectionFlags: ReturnType<typeof buildToolPageSectionFlags>;
  evidenceRuntime: ReturnType<typeof buildToolPageEvidenceRuntime>;
  reviewArtifactsState: ReturnType<typeof buildToolPageReviewArtifactsState>;
  reviewSignalsView: ReturnType<typeof buildToolPageReviewSignalsView>;
  reviewContextSignals: ToolPageReviewContextSignals;
  qualityState: ReturnType<typeof buildToolPageQualityState>;
  lensRuntime: Parameters<
    typeof buildToolPageChromeRouteStateFromDecisionContext
  >[0]['chromeLens']['lensRuntime'];
  websiteHostLabel: string;
  runtimeViewBundle: Parameters<
    typeof buildToolPageChromeRouteStateFromDecisionContext
  >[0]['chromeLens']['runtimeViewBundle'];
  evaluationDepth: Parameters<
    typeof buildToolPageChromeRouteStateFromDecisionContext
  >[0]['chromeLens']['evaluationDepth'];
}

export function buildToolPageChromeAssemblyRouteState(
  input: BuildToolPageChromeAssemblyRouteStateInput
): ReturnType<typeof buildToolPageChromeRouteStateFromDecisionContext> {
  return buildToolPageChromeRouteStateFromDecisionContext({
    chromeLens: {
      lensRuntime: input.lensRuntime,
      activeReviewLens: input.activeReviewLens,
      toolCategory: input.toolCategoryRef,
      tool: input.tool,
      websiteHostLabel: input.websiteHostLabel,
      runtimeViewBundle: input.runtimeViewBundle,
      evidenceRuntime: input.evidenceRuntime,
      reviewSignalsView: input.reviewSignalsView,
      evaluationDepth: input.evaluationDepth,
      qualityState: input.qualityState,
    },
    contentAlternatives: {
      activeReviewLens: input.activeReviewLens,
      alternativesLabel: input.alternativesLabel,
      toolCategoryRef: input.toolCategoryRef,
      orderedAlternatives: input.orderedAlternatives,
      comparableAlternatives: input.comparableAlternatives,
      canCompareByAlternativeSlug: input.canCompareByAlternativeSlug,
      tool: input.tool,
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
    },
  });
}
