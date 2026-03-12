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

interface BuildToolPageNavigationStateInputFromRouteContextInput {
  hasVerdict: BuildToolPageNavigationStateInputFromRouteInput['hasVerdict'];
  showProceduralVerdict: BuildToolPageNavigationStateInputFromRouteInput['showProceduralVerdict'];
  hasGettingStarted: BuildToolPageNavigationStateInputFromRouteInput['hasGettingStarted'];
  showPricingSection: BuildToolPageNavigationStateInputFromRouteInput['showPricingSection'];
  hasStrengths: BuildToolPageNavigationStateInputFromRouteInput['hasStrengths'];
  hasFeatures: BuildToolPageNavigationStateInputFromRouteInput['hasFeatures'];
  hasSpecs: BuildToolPageNavigationStateInputFromRouteInput['hasSpecs'];
  showProceduralSpecs: BuildToolPageNavigationStateInputFromRouteInput['showProceduralSpecs'];
  hasPlatform: BuildToolPageNavigationStateInputFromRouteInput['hasPlatform'];
  hasFAQ: BuildToolPageNavigationStateInputFromRouteInput['hasFAQ'];
  hasAlternatives: BuildToolPageNavigationStateInputFromRouteInput['hasAlternatives'];
  faqItems: BuildToolPageNavigationStateInputFromRouteInput['faqItems'];
  evidenceBasis: unknown[];
  lowConfidenceEvidenceLinks: unknown[];
  updateHistoryEntries: unknown[];
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

export function buildToolPageNavigationStateInputFromRouteContext(
  input: BuildToolPageNavigationStateInputFromRouteContextInput
): ReturnType<typeof buildToolPageNavigationStateInputFromRoute> {
  return buildToolPageNavigationStateInputFromRoute({
    hasVerdict: input.hasVerdict,
    showProceduralVerdict: input.showProceduralVerdict,
    hasGettingStarted: input.hasGettingStarted,
    showPricingSection: input.showPricingSection,
    hasStrengths: input.hasStrengths,
    hasFeatures: input.hasFeatures,
    hasSpecs: input.hasSpecs,
    showProceduralSpecs: input.showProceduralSpecs,
    hasPlatform: input.hasPlatform,
    hasFAQ: input.hasFAQ,
    hasAlternatives: input.hasAlternatives,
    evidenceBasisCount: input.evidenceBasis.length,
    lowConfidenceCount: input.lowConfidenceEvidenceLinks.length,
    faqItems: input.faqItems,
    updateHistoryEntriesCount: input.updateHistoryEntries.length,
  });
}
