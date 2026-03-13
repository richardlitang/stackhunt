import type { buildToolPagePrepState } from '@/lib/tool-page/prep-state';
import type { buildToolPageQualityState } from '@/lib/tool-page/quality-state';
import type { buildToolPageDecisionRuntime } from '@/lib/tool-page/decision-runtime';
import type { buildToolPageSectionFlags } from '@/lib/tool-page/section-flags';
import type { buildToolPageReviewArtifactsState } from '@/lib/tool-page/review-artifacts-state';
import type { buildToolPageReviewSignalsView } from '@/lib/tool-page/review-signals-view';
import type { buildToolPageEvidenceRuntime } from '@/lib/tool-page/evidence-runtime';

interface BuildToolPageDisplayRouteStateInput {
  prepState: ReturnType<typeof buildToolPagePrepState>;
  qualityState: ReturnType<typeof buildToolPageQualityState>;
  decisionRuntime: ReturnType<typeof buildToolPageDecisionRuntime>;
  sectionFlags: ReturnType<typeof buildToolPageSectionFlags>;
  presentationGates: {
    showProceduralVerdict: boolean;
    showProceduralSpecs: boolean;
  };
  reviewArtifactsState: ReturnType<typeof buildToolPageReviewArtifactsState>;
  reviewSignalsView: ReturnType<typeof buildToolPageReviewSignalsView>;
  evidenceRuntime: ReturnType<typeof buildToolPageEvidenceRuntime>;
}

export function buildToolPageDisplayRouteState(input: BuildToolPageDisplayRouteStateInput): Pick<
  BuildToolPageDisplayRouteStateInput['prepState'],
  'comparableAlternatives' | 'hasComparableAlternatives' | 'canCompareByAlternativeSlug'
> & {
  showReviewInProgressBanner: boolean;
} & Pick<
    BuildToolPageDisplayRouteStateInput['decisionRuntime'],
    | 'hasAbout'
    | 'comparativeFeaturePeerCount'
    | 'hasPricing'
    | 'renderVerdictSafe'
    | 'hasVerdict'
    | 'decisionSnapshotSummary'
  > &
  Pick<
    BuildToolPageDisplayRouteStateInput['sectionFlags'],
    | 'hasFeatures'
    | 'hasAlternatives'
    | 'hasFAQ'
    | 'hasGettingStarted'
    | 'hasSpecs'
    | 'hasCommunity'
    | 'hasOperationalDetails'
  > &
  BuildToolPageDisplayRouteStateInput['presentationGates'] &
  Pick<
    BuildToolPageDisplayRouteStateInput['reviewArtifactsState'],
    | 'handsOnTestEnvironment'
    | 'handsOnTestSteps'
    | 'handsOnTestFindings'
    | 'handsOnTestedAtLabel'
    | 'evaluationDepth'
    | 'testedItems'
    | 'notTestedItems'
    | 'showWeTestedIt'
  > &
  Pick<BuildToolPageDisplayRouteStateInput['reviewSignalsView'], 'communityVerifiedLabel'> &
  Pick<
    BuildToolPageDisplayRouteStateInput['evidenceRuntime'],
    | 'hasStrengths'
    | 'canonicalHardLimits'
    | 'officialPricingSource'
    | 'pricingEvidenceLinks'
    | 'showPricingSection'
    | 'pricingNarrativeLead'
    | 'pricingNarrativeLabel'
    | 'hasCollectedSources'
  > {
  const { prepState, qualityState, decisionRuntime, sectionFlags, presentationGates } = input;
  const {
    handsOnTestEnvironment,
    handsOnTestSteps,
    handsOnTestFindings,
    handsOnTestedAtLabel,
    evaluationDepth,
    testedItems,
    notTestedItems,
    showWeTestedIt,
  } = input.reviewArtifactsState;

  return {
    comparableAlternatives: prepState.comparableAlternatives,
    hasComparableAlternatives: prepState.hasComparableAlternatives,
    canCompareByAlternativeSlug: prepState.canCompareByAlternativeSlug,
    showReviewInProgressBanner: qualityState.showReviewInProgressBanner,
    hasAbout: decisionRuntime.hasAbout,
    comparativeFeaturePeerCount: decisionRuntime.comparativeFeaturePeerCount,
    hasPricing: decisionRuntime.hasPricing,
    renderVerdictSafe: decisionRuntime.renderVerdictSafe,
    hasVerdict: decisionRuntime.hasVerdict,
    decisionSnapshotSummary: decisionRuntime.decisionSnapshotSummary,
    hasFeatures: sectionFlags.hasFeatures,
    hasAlternatives: sectionFlags.hasAlternatives,
    hasFAQ: sectionFlags.hasFAQ,
    hasGettingStarted: sectionFlags.hasGettingStarted,
    hasSpecs: sectionFlags.hasSpecs,
    hasCommunity: sectionFlags.hasCommunity,
    hasOperationalDetails: sectionFlags.hasOperationalDetails,
    showProceduralVerdict: presentationGates.showProceduralVerdict,
    showProceduralSpecs: presentationGates.showProceduralSpecs,
    handsOnTestEnvironment,
    handsOnTestSteps,
    handsOnTestFindings,
    handsOnTestedAtLabel,
    evaluationDepth,
    testedItems,
    notTestedItems,
    showWeTestedIt,
    communityVerifiedLabel: input.reviewSignalsView.communityVerifiedLabel,
    hasStrengths: input.evidenceRuntime.hasStrengths,
    canonicalHardLimits: input.evidenceRuntime.canonicalHardLimits,
    officialPricingSource: input.evidenceRuntime.officialPricingSource,
    pricingEvidenceLinks: input.evidenceRuntime.pricingEvidenceLinks,
    showPricingSection: input.evidenceRuntime.showPricingSection,
    pricingNarrativeLead: input.evidenceRuntime.pricingNarrativeLead,
    pricingNarrativeLabel: input.evidenceRuntime.pricingNarrativeLabel,
    hasCollectedSources: input.evidenceRuntime.hasCollectedSources,
  };
}
