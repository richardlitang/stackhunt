import type { buildToolPageAlternativesPricingState } from '@/lib/tool-page/alternatives-pricing-state';
import type { ReviewLens } from '@/lib/tool-page/view-model';

interface BuildToolPageAlternativesPricingStateInputFromRouteInput {
  activeReviewLens: ReviewLens;
  budgetCostDrivers: string[];
  budgetOneTimeFees: string[];
  budgetCommitmentTerms: string | null | undefined;
  budgetRoiThreshold: string | null | undefined;
  toolSpecs: Record<string, unknown> | null;
  alternativesLabel: 'Alternatives' | 'Related Tools';
  categoryName: string | null;
  toolSlug: string;
  comparableAlternatives: Array<{ slug: string; name: string }>;
  category: { slug: string; name: string } | null;
  orderedAlternatives: Array<{ slug: string } & Record<string, unknown>>;
  canCompareByAlternativeSlug: Record<string, boolean>;
}

export function buildToolPageAlternativesPricingStateInputFromRoute(
  input: BuildToolPageAlternativesPricingStateInputFromRouteInput
): Parameters<typeof buildToolPageAlternativesPricingState>[0] {
  return {
    activeReviewLens: input.activeReviewLens,
    pricingInsightsInput: {
      budgetCostDrivers: input.budgetCostDrivers,
      budgetOneTimeFees: input.budgetOneTimeFees,
      budgetCommitmentTerms: input.budgetCommitmentTerms,
      budgetRoiThreshold: input.budgetRoiThreshold,
    },
    primaryFunctionInput: {
      specs: input.toolSpecs,
    },
    alternativesIntroInput: {
      alternativesLabel: input.alternativesLabel,
      categoryName: input.categoryName,
    },
    compareTeaserInput: {
      toolSlug: input.toolSlug,
      alternatives: input.comparableAlternatives,
    },
    alternativesSectionInput: {
      category: input.category,
    },
    alternativeCardsInput: {
      alternatives: input.orderedAlternatives,
      canCompareByAlternativeSlug: input.canCompareByAlternativeSlug,
    },
  };
}
