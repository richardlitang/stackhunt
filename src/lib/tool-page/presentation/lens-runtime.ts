import {
  buildToolPageViewModel,
  type ReviewLens,
  type ToolPageViewModelInput,
} from '@/lib/tool-page/presentation/view-model';
import {
  buildToolPageLensHrefs,
  type ToolPageReviewLens,
} from '@/lib/tool-page/navigation/lens-hrefs';
import {
  buildToolPageLensContent,
  type BuildToolPageLensContentInput,
} from '@/lib/tool-page/presentation/lens';

export interface BuildToolPageLensRuntimeInput {
  pathname: string;
  searchParams: URLSearchParams;
  activeReviewLens: ReviewLens;
  viewModelInput: Omit<ToolPageViewModelInput, 'activeReviewLens'>;
  lensContentInput: Omit<BuildToolPageLensContentInput, 'activeReviewLens'>;
}

export interface ToolPageLensRuntime {
  lensHrefs: Record<ToolPageReviewLens, string>;
  focusSwitchOptions: ReturnType<typeof buildToolPageViewModel>['focusSwitchOptions'];
  lensDefaultFocus: ReturnType<typeof buildToolPageViewModel>['lensDefaultFocus'];
  showFocusSwitch: ReturnType<typeof buildToolPageViewModel>['showFocusSwitch'];
  lensPriorityLinks: ReturnType<typeof buildToolPageViewModel>['lensPriorityLinks'];
  verdictLabelRationale: ReturnType<typeof buildToolPageLensContent>['verdictLabelRationale'];
  reviewDek: ReturnType<typeof buildToolPageLensContent>['reviewDek'];
  readerFocusNote: ReturnType<typeof buildToolPageLensContent>['readerFocusNote'];
  lensBestFitLine: ReturnType<typeof buildToolPageLensContent>['lensBestFitLine'];
  lensWeakFitLine: ReturnType<typeof buildToolPageLensContent>['lensWeakFitLine'];
  lensTradeoffLine: ReturnType<typeof buildToolPageLensContent>['lensTradeoffLine'];
  scoreDrivers: ReturnType<typeof buildToolPageLensContent>['scoreDrivers'];
  workflowFitHighlights: ReturnType<typeof buildToolPageLensContent>['workflowFitHighlights'];
  workflowFitCards: ReturnType<typeof buildToolPageLensContent>['workflowFitCards'];
}

export function buildToolPageLensRuntime(
  input: BuildToolPageLensRuntimeInput
): ToolPageLensRuntime {
  const viewModel = buildToolPageViewModel({
    activeReviewLens: input.activeReviewLens,
    ...input.viewModelInput,
  });
  const lensContent = buildToolPageLensContent({
    activeReviewLens: input.activeReviewLens,
    ...input.lensContentInput,
  });

  return {
    lensHrefs: buildToolPageLensHrefs(input.pathname, input.searchParams),
    focusSwitchOptions: viewModel.focusSwitchOptions,
    lensDefaultFocus: viewModel.lensDefaultFocus,
    showFocusSwitch: viewModel.showFocusSwitch,
    lensPriorityLinks: viewModel.lensPriorityLinks,
    verdictLabelRationale: lensContent.verdictLabelRationale,
    reviewDek: lensContent.reviewDek,
    readerFocusNote: lensContent.readerFocusNote,
    lensBestFitLine: lensContent.lensBestFitLine,
    lensWeakFitLine: lensContent.lensWeakFitLine,
    lensTradeoffLine: lensContent.lensTradeoffLine,
    scoreDrivers: lensContent.scoreDrivers,
    workflowFitHighlights: lensContent.workflowFitHighlights,
    workflowFitCards: lensContent.workflowFitCards,
  };
}
