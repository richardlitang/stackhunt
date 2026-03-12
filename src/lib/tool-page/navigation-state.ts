import { buildToolPageFaqItemsView } from '@/lib/tool-page/faq-items-view';
import { buildToolPageLowConfidenceSourcesState } from '@/lib/tool-page/low-confidence-sources';
import { buildToolPageNavigationStateInputFromRoute } from '@/lib/tool-page/navigation-input';
import { buildToolPageQuickJumpLinks } from '@/lib/tool-page/quick-jump-links';
import { buildToolPageSourcesSectionState } from '@/lib/tool-page/sources-section-state';
import { buildToolPageUpdateHistoryState } from '@/lib/tool-page/update-history-state';

interface BuildToolPageNavigationStateInput {
  showVerdict: boolean;
  hasGettingStarted: boolean;
  showPricingSection: boolean;
  hasStrengths: boolean;
  hasFeatures: boolean;
  showSpecs: boolean;
  hasPlatform: boolean;
  hasFaq: boolean;
  hasAlternatives: boolean;
  evidenceBasisCount: number;
  lowConfidenceCount: number;
  faqItems: Array<{ question: string; answer: string; answer_source_url?: string | null }>;
  updateHistoryEntriesCount: number;
}

export function buildToolPageNavigationState(input: BuildToolPageNavigationStateInput): {
  sourcesSectionState: ReturnType<typeof buildToolPageSourcesSectionState>;
  lowConfidenceSourcesState: ReturnType<typeof buildToolPageLowConfidenceSourcesState>;
  faqItemsView: ReturnType<typeof buildToolPageFaqItemsView>;
  updateHistoryState: ReturnType<typeof buildToolPageUpdateHistoryState>;
  quickJumpLinks: ReturnType<typeof buildToolPageQuickJumpLinks>;
} {
  const sourcesSectionState = buildToolPageSourcesSectionState({
    evidenceBasisCount: input.evidenceBasisCount,
  });
  const lowConfidenceSourcesState = buildToolPageLowConfidenceSourcesState({
    count: input.lowConfidenceCount,
  });
  const faqItemsView = buildToolPageFaqItemsView(input.faqItems);
  const updateHistoryState = buildToolPageUpdateHistoryState({
    entriesCount: input.updateHistoryEntriesCount,
  });
  const quickJumpLinks = buildToolPageQuickJumpLinks({
    showVerdict: input.showVerdict,
    hasGettingStarted: input.hasGettingStarted,
    showPricingSection: input.showPricingSection,
    hasStrengths: input.hasStrengths,
    hasFeatures: input.hasFeatures,
    showSpecs: input.showSpecs,
    hasPlatform: input.hasPlatform,
    hasFaq: input.hasFaq,
    hasAlternatives: input.hasAlternatives,
    hasSources: sourcesSectionState.hasSources,
    hasUpdates: updateHistoryState.hasUpdates,
  });

  return {
    sourcesSectionState,
    lowConfidenceSourcesState,
    faqItemsView,
    updateHistoryState,
    quickJumpLinks,
  };
}

export function buildToolPageNavigationStateFromRoute(
  input: Parameters<typeof buildToolPageNavigationStateInputFromRoute>[0]
): ReturnType<typeof buildToolPageNavigationState> {
  return buildToolPageNavigationState(buildToolPageNavigationStateInputFromRoute(input));
}
