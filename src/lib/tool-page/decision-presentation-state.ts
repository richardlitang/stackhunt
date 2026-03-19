import { buildToolPageQuickJumpLinksView } from '@/lib/tool-page/quick-jump-links-view';
import { buildToolPageWorkflowFitVisibility } from '@/lib/tool-page/workflow-fit-visibility';
import type { buildToolPageDecisionUtilityState } from '@/lib/tool-page/decision-utility';
import type { buildToolPageProsConsView } from '@/lib/tool-page/pros-cons-view';
import type { buildToolPageNavigationState } from '@/lib/tool-page/navigation-state';

interface BuildToolPageDecisionPresentationStateInput {
  categorySlug: string | null;
  hasGettingStarted: boolean;
  workflowFitCardsCount: number;
  workflowFitHighlightsCount: number;
  decisionUtilityState: ReturnType<typeof buildToolPageDecisionUtilityState>;
  prosConsView: ReturnType<typeof buildToolPageProsConsView>;
  quickJumpLinks: ReturnType<typeof buildToolPageNavigationState>['quickJumpLinks'];
}

export function buildToolPageDecisionPresentationState(
  input: BuildToolPageDecisionPresentationStateInput
): {
  showWorkflowFitSection: boolean;
  shouldShowDecisionUtilitySection: boolean;
  shouldShowPracticalOutcomes: boolean;
  hasUserSignalProsCons: boolean;
  quickJumpLinksView: ReturnType<typeof buildToolPageQuickJumpLinksView>;
} {
  const { showWorkflowFitSection } = buildToolPageWorkflowFitVisibility({
    categorySlug: input.categorySlug,
    hasWorkflowCards: input.workflowFitCardsCount > 0,
    hasWorkflowHighlights: input.workflowFitHighlightsCount > 0,
  });
  // Keep one rollout orientation block near the top. If a full setup section exists,
  // suppress the extra decision utility block to avoid duplicate orientation content.
  const shouldShowDecisionUtilitySection =
    !input.hasGettingStarted &&
    input.decisionUtilityState.hasEvidenceAnchoredUtility &&
    (input.decisionUtilityState.testChecklistItems.length > 0 ||
      input.decisionUtilityState.commonSetups.length > 0);
  const shouldShowPracticalOutcomes = input.decisionUtilityState.practicalOutcomes.length > 0;
  const hasUserSignalProsCons =
    input.prosConsView.userSignalPros.length > 0 || input.prosConsView.userSignalCons.length > 0;
  const quickJumpLinksView = buildToolPageQuickJumpLinksView({
    links: input.quickJumpLinks,
    showWorkflowFitSection,
  });

  return {
    showWorkflowFitSection,
    shouldShowDecisionUtilitySection,
    shouldShowPracticalOutcomes,
    hasUserSignalProsCons,
    quickJumpLinksView,
  };
}
