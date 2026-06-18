import type { buildToolPageLensRuntime } from '@/lib/tool-page/presentation/lens-runtime';

export function buildToolPageLensViewFields(
  lensRuntime: ReturnType<typeof buildToolPageLensRuntime>
): {
  lensHrefs: ReturnType<typeof buildToolPageLensRuntime>['lensHrefs'];
  focusSwitchOptions: ReturnType<typeof buildToolPageLensRuntime>['focusSwitchOptions'];
  lensDefaultFocus: ReturnType<typeof buildToolPageLensRuntime>['lensDefaultFocus'];
  showFocusSwitch: ReturnType<typeof buildToolPageLensRuntime>['showFocusSwitch'];
  lensPriorityLinks: ReturnType<typeof buildToolPageLensRuntime>['lensPriorityLinks'];
  verdictLabelRationale: ReturnType<typeof buildToolPageLensRuntime>['verdictLabelRationale'];
  reviewDek: ReturnType<typeof buildToolPageLensRuntime>['reviewDek'];
  readerFocusNote: ReturnType<typeof buildToolPageLensRuntime>['readerFocusNote'];
  lensBestFitLine: ReturnType<typeof buildToolPageLensRuntime>['lensBestFitLine'];
  lensWeakFitLine: ReturnType<typeof buildToolPageLensRuntime>['lensWeakFitLine'];
  lensTradeoffLine: ReturnType<typeof buildToolPageLensRuntime>['lensTradeoffLine'];
  scoreDrivers: ReturnType<typeof buildToolPageLensRuntime>['scoreDrivers'];
  workflowFitHighlights: ReturnType<typeof buildToolPageLensRuntime>['workflowFitHighlights'];
  workflowFitCards: ReturnType<typeof buildToolPageLensRuntime>['workflowFitCards'];
} {
  return {
    lensHrefs: lensRuntime.lensHrefs,
    focusSwitchOptions: lensRuntime.focusSwitchOptions,
    lensDefaultFocus: lensRuntime.lensDefaultFocus,
    showFocusSwitch: lensRuntime.showFocusSwitch,
    lensPriorityLinks: lensRuntime.lensPriorityLinks,
    verdictLabelRationale: lensRuntime.verdictLabelRationale,
    reviewDek: lensRuntime.reviewDek,
    readerFocusNote: lensRuntime.readerFocusNote,
    lensBestFitLine: lensRuntime.lensBestFitLine,
    lensWeakFitLine: lensRuntime.lensWeakFitLine,
    lensTradeoffLine: lensRuntime.lensTradeoffLine,
    scoreDrivers: lensRuntime.scoreDrivers,
    workflowFitHighlights: lensRuntime.workflowFitHighlights,
    workflowFitCards: lensRuntime.workflowFitCards,
  };
}
