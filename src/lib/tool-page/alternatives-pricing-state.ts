import { buildToolPageAlternativeCardsView } from '@/lib/tool-page/alternatives-cards';
import { buildToolPageAlternativesIntroText } from '@/lib/tool-page/alternatives-intro';
import { buildToolPageAlternativesPricingStateInputFromRoute } from '@/lib/tool-page/alternatives-pricing-input';
import { buildToolPageAlternativesSectionState } from '@/lib/tool-page/alternatives-section';
import { buildToolPageCompareTeaserLinks } from '@/lib/tool-page/compare-teasers';
import { buildToolPagePricingInsightsBudgetAnalyst } from '@/lib/tool-page/pricing-insights-input';
import { buildToolPagePrimaryFunction } from '@/lib/tool-page/taxonomy';
import type { ReviewLens } from '@/lib/tool-page/view-model';
import { rankAlternativesForLens } from '@/lib/tool-page/alternatives-lens';

interface BuildToolPageAlternativesPricingStateInput {
  activeReviewLens: ReviewLens;
  pricingInsightsInput: Parameters<typeof buildToolPagePricingInsightsBudgetAnalyst>[0];
  primaryFunctionInput: Parameters<typeof buildToolPagePrimaryFunction>[0];
  alternativesIntroInput: Omit<
    Parameters<typeof buildToolPageAlternativesIntroText>[0],
    'primaryFunction'
  >;
  compareTeaserInput: Parameters<typeof buildToolPageCompareTeaserLinks>[0];
  alternativesSectionInput: Parameters<typeof buildToolPageAlternativesSectionState>[0];
  alternativeCardsInput: Parameters<typeof buildToolPageAlternativeCardsView>[0];
}

export function buildToolPageAlternativesPricingState(
  input: BuildToolPageAlternativesPricingStateInput
): {
  pricingInsightsBudgetAnalyst: ReturnType<typeof buildToolPagePricingInsightsBudgetAnalyst>;
  primaryFunction: string | null;
  alternativesIntroText: string | null;
  compareTeaserLinks: ReturnType<typeof buildToolPageCompareTeaserLinks>;
  alternativesSectionState: ReturnType<typeof buildToolPageAlternativesSectionState>;
  alternativeCardsView: ReturnType<typeof buildToolPageAlternativeCardsView>;
} {
  const pricingInsightsBudgetAnalyst = buildToolPagePricingInsightsBudgetAnalyst(
    input.pricingInsightsInput
  );
  const primaryFunction = buildToolPagePrimaryFunction(input.primaryFunctionInput);
  const alternativesIntroText = buildToolPageAlternativesIntroText({
    ...input.alternativesIntroInput,
    primaryFunction,
  });
  const compareTeaserLinks = buildToolPageCompareTeaserLinks(input.compareTeaserInput);
  const alternativesSectionState = buildToolPageAlternativesSectionState(
    input.alternativesSectionInput
  );
  const alternatives = rankAlternativesForLens(
    input.alternativeCardsInput.alternatives,
    input.activeReviewLens
  );
  const alternativeCardsView = buildToolPageAlternativeCardsView({
    ...input.alternativeCardsInput,
    alternatives,
  });

  return {
    pricingInsightsBudgetAnalyst,
    primaryFunction,
    alternativesIntroText,
    compareTeaserLinks,
    alternativesSectionState,
    alternativeCardsView,
  };
}

export function buildToolPageAlternativesPricingStateFromRoute(
  input: Parameters<typeof buildToolPageAlternativesPricingStateInputFromRoute>[0]
): ReturnType<typeof buildToolPageAlternativesPricingState> {
  return buildToolPageAlternativesPricingState(
    buildToolPageAlternativesPricingStateInputFromRoute(input)
  );
}
