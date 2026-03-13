interface BuildToolPageNavigationStateInputFromRouteInput {
  hasVerdict: boolean;
  showProceduralVerdict: boolean;
  hasGettingStarted: boolean;
  showPricingSection: boolean;
  hasStrengths: boolean;
  hasFeatures: boolean;
  hasSpecs: boolean;
  showProceduralSpecs: boolean;
  hasPlatform: boolean;
  hasFAQ: boolean;
  hasAlternatives: boolean;
  evidenceBasisCount: number;
  lowConfidenceCount: number;
  faqItems: Array<{ question: string; answer: string; answer_source_url?: string | null }>;
  updateHistoryEntriesCount: number;
}

export function buildToolPageNavigationStateInputFromRoute(
  input: BuildToolPageNavigationStateInputFromRouteInput
): {
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
} {
  return {
    showVerdict: input.hasVerdict || input.showProceduralVerdict,
    hasGettingStarted: input.hasGettingStarted,
    showPricingSection: input.showPricingSection,
    hasStrengths: input.hasStrengths,
    hasFeatures: input.hasFeatures,
    showSpecs: input.hasSpecs || input.showProceduralSpecs,
    hasPlatform: input.hasPlatform,
    hasFaq: input.hasFAQ,
    hasAlternatives: input.hasAlternatives,
    evidenceBasisCount: input.evidenceBasisCount,
    lowConfidenceCount: input.lowConfidenceCount,
    faqItems: input.faqItems,
    updateHistoryEntriesCount: input.updateHistoryEntriesCount,
  };
}
