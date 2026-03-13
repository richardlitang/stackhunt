import type { buildToolPageDecisionRuntime } from '@/lib/tool-page/decision-runtime';
import type { buildToolPageEvidenceRuntime } from '@/lib/tool-page/evidence-runtime';
import type { buildToolPageQualityState } from '@/lib/tool-page/quality-state';
import type { buildToolPageReviewArtifactsState } from '@/lib/tool-page/review-artifacts-state';
import type { buildToolPageReviewSignalsView } from '@/lib/tool-page/review-signals-view';
import type { buildToolPageRuntimeViewBundle } from '@/lib/tool-page/runtime-view-bundle';
import type { buildToolPageSectionFlags } from '@/lib/tool-page/section-flags';
import type { ReviewLens } from '@/lib/tool-page/view-model';
import { buildToolPageRuntimeNavigationStateFromDecisionContext } from '@/lib/tool-page/runtime-navigation-decision-context';

interface BuildToolPageRuntimeNavigationRouteStateInput {
  pathname: string;
  searchParams: URLSearchParams;
  activeReviewLens: ReviewLens;
  tool: Parameters<
    typeof buildToolPageRuntimeNavigationStateFromDecisionContext
  >[0]['runtime']['tool'] &
    Parameters<typeof buildToolPageRuntimeNavigationStateFromDecisionContext>[0]['navigation']['media']['tool'];
  primaryOffer: Parameters<
    typeof buildToolPageRuntimeNavigationStateFromDecisionContext
  >[0]['runtime']['primaryOffer'];
  faqSchema: Parameters<
    typeof buildToolPageRuntimeNavigationStateFromDecisionContext
  >[0]['runtime']['faqSchema'];
  toolMeta: Parameters<typeof buildToolPageRuntimeNavigationStateFromDecisionContext>[0]['runtime']['toolMeta'];
  canonicalHardLimits: Parameters<
    typeof buildToolPageRuntimeNavigationStateFromDecisionContext
  >[0]['runtime']['canonicalHardLimits'];
  decisionRuntime: ReturnType<typeof buildToolPageDecisionRuntime>;
  sectionFlags: ReturnType<typeof buildToolPageSectionFlags>;
  evidenceRuntime: ReturnType<typeof buildToolPageEvidenceRuntime>;
  qualityState: ReturnType<typeof buildToolPageQualityState>;
  reviewSignalsView: ReturnType<typeof buildToolPageReviewSignalsView>;
  presentationGates: {
    showProceduralVerdict: boolean;
    showProceduralSpecs: boolean;
  };
  evaluationDepth: string | null;
  hasStrengths: boolean;
  faqItems: Array<{ question: string; answer: string; answer_source_url?: string | null }>;
  reviewArtifactsState: Pick<
    ReturnType<typeof buildToolPageReviewArtifactsState>,
    'evidenceBasis' | 'lowConfidenceEvidenceLinks'
  >;
  category: Parameters<
    typeof buildToolPageRuntimeNavigationStateFromDecisionContext
  >[0]['navigation']['media']['category'];
  knowledgeCard: Parameters<
    typeof buildToolPageRuntimeNavigationStateFromDecisionContext
  >[0]['navigation']['media']['knowledgeCard'];
  renderVerdictSafe: string | null;
}

export function buildToolPageRuntimeNavigationRouteState(
  input: BuildToolPageRuntimeNavigationRouteStateInput
): {
  runtimeViewBundle: ReturnType<typeof buildToolPageRuntimeViewBundle>;
  navigationState: ReturnType<typeof buildToolPageRuntimeNavigationStateFromDecisionContext>['navigationState'];
  ctaMediaState: ReturnType<typeof buildToolPageRuntimeNavigationStateFromDecisionContext>['ctaMediaState'];
} {
  return buildToolPageRuntimeNavigationStateFromDecisionContext({
    runtime: {
      pathname: input.pathname,
      searchParams: input.searchParams,
      activeReviewLens: input.activeReviewLens,
      tool: input.tool,
      primaryOffer: input.primaryOffer,
      faqSchema: input.faqSchema,
      toolMeta: input.toolMeta,
      canonicalHardLimits: input.canonicalHardLimits,
      decisionRuntime: input.decisionRuntime,
      sectionFlags: input.sectionFlags,
      evidenceRuntime: input.evidenceRuntime,
      qualityState: input.qualityState,
      reviewSignalsView: input.reviewSignalsView,
      presentationGates: input.presentationGates,
      evaluationDepth: input.evaluationDepth,
    },
    navigation: {
      decisionRuntime: input.decisionRuntime,
      sectionFlags: input.sectionFlags,
      presentationGates: input.presentationGates,
      evidenceSignals: {
        showPricingSection: input.evidenceRuntime.showPricingSection,
        hasStrengths: input.hasStrengths,
      },
      faqItems: input.faqItems,
      reviewArtifactsState: input.reviewArtifactsState,
      media: {
        tool: input.tool,
        category: input.category,
        knowledgeCard: input.knowledgeCard,
        renderVerdictSafe: input.renderVerdictSafe,
        activeReviewLens: input.activeReviewLens,
      },
    },
  });
}
