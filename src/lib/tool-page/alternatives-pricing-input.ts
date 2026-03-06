import type { buildToolPageAlternativesPricingState } from '@/lib/tool-page/alternatives-pricing-state';
import type { ReviewLens } from '@/lib/tool-page/view-model';
import {
  toToolPageComparableAlternatives,
  toToolPageOrderedAlternatives,
  toToolPageSpecsRecord,
} from '@/lib/tool-page/route-normalizers';

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

interface BuildToolPageAlternativesPricingStateInputFromRouteContextInput {
  activeReviewLens: BuildToolPageAlternativesPricingStateInputFromRouteInput['activeReviewLens'];
  budgetCostDrivers: BuildToolPageAlternativesPricingStateInputFromRouteInput['budgetCostDrivers'];
  budgetOneTimeFees: BuildToolPageAlternativesPricingStateInputFromRouteInput['budgetOneTimeFees'];
  budgetCommitmentTerms: BuildToolPageAlternativesPricingStateInputFromRouteInput['budgetCommitmentTerms'];
  budgetRoiThreshold: BuildToolPageAlternativesPricingStateInputFromRouteInput['budgetRoiThreshold'];
  alternativesLabel: BuildToolPageAlternativesPricingStateInputFromRouteInput['alternativesLabel'];
  category: BuildToolPageAlternativesPricingStateInputFromRouteInput['category'];
  comparableAlternatives: unknown;
  orderedAlternatives: unknown;
  canCompareByAlternativeSlug: BuildToolPageAlternativesPricingStateInputFromRouteInput['canCompareByAlternativeSlug'];
  tool: {
    slug: string;
    specs: unknown;
  };
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

export function buildToolPageAlternativesPricingStateInputFromRouteContext(
  input: BuildToolPageAlternativesPricingStateInputFromRouteContextInput
): Parameters<typeof buildToolPageAlternativesPricingState>[0] {
  return buildToolPageAlternativesPricingStateInputFromRoute({
    activeReviewLens: input.activeReviewLens,
    budgetCostDrivers: input.budgetCostDrivers,
    budgetOneTimeFees: input.budgetOneTimeFees,
    budgetCommitmentTerms: input.budgetCommitmentTerms,
    budgetRoiThreshold: input.budgetRoiThreshold,
    toolSpecs: toToolPageSpecsRecord(input.tool.specs),
    alternativesLabel: input.alternativesLabel,
    categoryName: input.category?.name || null,
    toolSlug: input.tool.slug,
    comparableAlternatives: toToolPageComparableAlternatives(input.comparableAlternatives),
    category: input.category,
    orderedAlternatives: toToolPageOrderedAlternatives(input.orderedAlternatives),
    canCompareByAlternativeSlug: input.canCompareByAlternativeSlug,
  });
}
