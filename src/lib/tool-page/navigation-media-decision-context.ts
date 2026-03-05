import type { buildToolPageDecisionRuntime } from '@/lib/tool-page/decision-runtime';
import type { buildToolPageReviewArtifactsState } from '@/lib/tool-page/review-artifacts-state';
import type { buildToolPageSectionFlags } from '@/lib/tool-page/section-flags';
import type { buildToolPageRuntimeViewBundle } from '@/lib/tool-page/runtime-view-bundle';
import { buildToolPageNavigationMediaStateFromRouteContext } from '@/lib/tool-page/navigation-media-state';

interface BuildToolPageNavigationMediaStateFromDecisionContextInput {
  decisionRuntime: ReturnType<typeof buildToolPageDecisionRuntime>;
  sectionFlags: ReturnType<typeof buildToolPageSectionFlags>;
  presentationGates: {
    showProceduralVerdict: boolean;
    showProceduralSpecs: boolean;
  };
  evidenceSignals: {
    showPricingSection: boolean;
  };
  faqItems: Array<{ question: string; answer: string; answer_source_url?: string | null }>;
  reviewArtifactsState: Pick<
    ReturnType<typeof buildToolPageReviewArtifactsState>,
    'evidenceBasis' | 'lowConfidenceEvidenceLinks'
  >;
  updateHistoryEntries: ReturnType<typeof buildToolPageRuntimeViewBundle>['updateHistoryEntries'];
  media: Parameters<typeof buildToolPageNavigationMediaStateFromRouteContext>[0]['media'];
}

export function buildToolPageNavigationMediaStateFromDecisionContext(
  input: BuildToolPageNavigationMediaStateFromDecisionContextInput
): ReturnType<typeof buildToolPageNavigationMediaStateFromRouteContext> {
  return buildToolPageNavigationMediaStateFromRouteContext({
    navigation: {
      hasVerdict: input.decisionRuntime.hasVerdict,
      showProceduralVerdict: input.presentationGates.showProceduralVerdict,
      hasGettingStarted: input.sectionFlags.hasGettingStarted,
      showPricingSection: input.evidenceSignals.showPricingSection,
      hasFeatures: input.sectionFlags.hasFeatures,
      hasSpecs: input.sectionFlags.hasSpecs,
      showProceduralSpecs: input.presentationGates.showProceduralSpecs,
      hasPlatform: input.sectionFlags.hasPlatform,
      hasFAQ: input.sectionFlags.hasFAQ,
      hasAlternatives: input.sectionFlags.hasAlternatives,
      faqItems: input.faqItems,
      evidenceBasis: input.reviewArtifactsState.evidenceBasis,
      lowConfidenceEvidenceLinks: input.reviewArtifactsState.lowConfidenceEvidenceLinks,
      updateHistoryEntries: input.updateHistoryEntries,
    },
    media: input.media,
  });
}
