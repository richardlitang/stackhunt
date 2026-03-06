import type { buildToolPageDecisionRuntime } from '@/lib/tool-page/decision-runtime';
import type { buildToolPageEvidenceRuntime } from '@/lib/tool-page/evidence-runtime';
import type { buildToolPageReviewArtifactsStateFromRouteContext } from '@/lib/tool-page/review-artifacts-state';
import type { ToolPageReviewContextSignals } from '@/lib/tool-page/review-context';
import type { buildToolPageReviewSignalsView } from '@/lib/tool-page/review-signals-view';
import type { buildToolPageSectionFlags } from '@/lib/tool-page/section-flags';
import type { ReviewLens } from '@/lib/tool-page/view-model';
import type { buildToolPageQualityState } from '@/lib/tool-page/quality-state';
import { toToolPageObjectArray } from '@/lib/tool-page/route-normalizers';
import { buildToolPageContentAlternativesStateFromRouteContext } from '@/lib/tool-page/content-alternatives-state';

interface BuildToolPageContentAlternativesStateFromDecisionContextInput {
  activeReviewLens: ReviewLens;
  alternativesLabel: 'Alternatives' | 'Related Tools';
  toolCategoryRef: { slug: string; name: string } | null;
  orderedAlternatives: unknown;
  comparableAlternatives: unknown;
  canCompareByAlternativeSlug: Record<string, boolean>;
  tool: {
    name: string;
    slug: string;
    specs: unknown;
    website: string | null;
    long_description: string | null;
    affiliate_offers:
      | Array<{ url: string; cta_text: string; is_affiliate?: boolean | null }>
      | null
      | undefined;
  };
  knowledgeCard: Record<string, unknown> | null;
  parentTool: { id: string } | null;
  setupTracks: unknown;
  displayCategorySpecificData: Record<string, unknown> | null;
  vipSpecifics: Record<string, unknown> | null;
  userReportedPros: Array<Record<string, unknown>>;
  userReportedCons: Array<Record<string, unknown>>;
  decisionRuntime: ReturnType<typeof buildToolPageDecisionRuntime>;
  sectionFlags: ReturnType<typeof buildToolPageSectionFlags>;
  evidenceRuntime: ReturnType<typeof buildToolPageEvidenceRuntime>;
  reviewArtifactsState: ReturnType<typeof buildToolPageReviewArtifactsStateFromRouteContext>;
  reviewSignalsView: ReturnType<typeof buildToolPageReviewSignalsView>;
  reviewContextSignals: ToolPageReviewContextSignals;
  qualityState: Pick<ReturnType<typeof buildToolPageQualityState>, 'communityCorroborationCount'>;
}

export function buildToolPageContentAlternativesStateFromDecisionContext(
  input: BuildToolPageContentAlternativesStateFromDecisionContextInput
): ReturnType<typeof buildToolPageContentAlternativesStateFromRouteContext> {
  return buildToolPageContentAlternativesStateFromRouteContext({
    alternativesPricing: {
      activeReviewLens: input.activeReviewLens,
      budgetCostDrivers: input.reviewContextSignals.budgetCostDrivers,
      budgetOneTimeFees: input.reviewContextSignals.budgetOneTimeFees,
      budgetCommitmentTerms: input.reviewContextSignals.budgetCommitmentTerms,
      budgetRoiThreshold: input.reviewContextSignals.budgetRoiThreshold,
      alternativesLabel: input.alternativesLabel,
      category: input.toolCategoryRef,
      comparableAlternatives: input.comparableAlternatives,
      orderedAlternatives: input.orderedAlternatives,
      canCompareByAlternativeSlug: input.canCompareByAlternativeSlug,
      tool: {
        slug: input.tool.slug,
        specs: input.tool.specs,
      },
    },
    contentSections: {
      evidenceLinks: input.reviewArtifactsState.evidenceLinks,
      lowConfidenceEvidenceLinks: input.reviewArtifactsState.lowConfidenceEvidenceLinks,
      effectiveEvidencePros: input.evidenceRuntime.effectiveEvidencePros,
      effectiveEvidenceCons: input.evidenceRuntime.effectiveEvidenceCons,
      userReportedPros: input.userReportedPros,
      userReportedCons: input.userReportedCons,
      knowledgeCard: input.knowledgeCard,
      setupTracks: toToolPageObjectArray(input.setupTracks),
      gettingStartedCtaUrl: input.decisionRuntime.setupSignals.gettingStartedCtaUrl,
      prosConsSourcesCount: input.evidenceRuntime.collectedSourcesBySection.pros_cons,
      communityCorroborationCount: input.qualityState.communityCorroborationCount,
      evidenceBasis: input.reviewArtifactsState.evidenceBasis,
      hasCommunity: input.sectionFlags.hasCommunity,
      userAdvocate: input.reviewContextSignals.userAdvocate,
      guardedHumanVerdict: input.decisionRuntime.guardedHumanVerdict,
      vibe: input.reviewContextSignals.vibe,
      originStory: input.reviewContextSignals.originStory,
      idealFor: input.reviewContextSignals.idealFor,
      guardedAvoidIf: input.decisionRuntime.guardedAvoidIf,
      powerTip: input.reviewContextSignals.powerTip,
      delighters: input.reviewContextSignals.delighters,
      frustrations: input.reviewContextSignals.frustrations,
      displayCategorySpecificData: input.displayCategorySpecificData,
      vipSpecifics: input.vipSpecifics,
      categoryName: input.toolCategoryRef?.name || null,
      specsVerifiedLabel: input.reviewSignalsView.specsVerifiedLabel,
      pricingCheckedLabel: input.evidenceRuntime.pricingCheckedLabel,
      hasOfficialPricingSource: Boolean(input.evidenceRuntime.officialPricingSource),
      pricingEvidenceCount: input.evidenceRuntime.pricingEvidenceLinks.length,
      hasSecurity: input.sectionFlags.hasSecurity,
      hasPortability: input.sectionFlags.hasPortability,
      hasParentTool: Boolean(input.parentTool),
      tool: {
        name: input.tool.name,
        website: input.tool.website,
        long_description: input.tool.long_description,
        affiliate_offers: input.tool.affiliate_offers,
      },
    },
  });
}
