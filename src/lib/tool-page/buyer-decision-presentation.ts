import type { ToolPageBuyerDecisionLayer } from '@/types/tool-page-blueprint';

interface BuildToolPageBuyerDecisionPresentationStateInput {
  layer: ToolPageBuyerDecisionLayer;
  hasSourcesSection: boolean;
}

export interface ToolPageBuyerDecisionPresentationState {
  showHeroDecisionCard: boolean;
  hasCanonicalDecisionSnapshot: boolean;
  hasStructuredPricingReality: boolean;
  showLegacyVerdictNarrative: boolean;
  showVerdictSourcesLink: boolean;
  showLegacyPricingMentalModel: boolean;
  verdictAnchorTarget: 'decision-snapshot' | 'verdict';
}

function hasText(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

export function buildToolPageBuyerDecisionPresentationState(
  input: BuildToolPageBuyerDecisionPresentationStateInput
): ToolPageBuyerDecisionPresentationState {
  const { heroDecisionCard, pricingReality } = input.layer;
  const decisionSlotCount = [
    heroDecisionCard.bestFor,
    heroDecisionCard.notFor,
    heroDecisionCard.mainRisk,
    heroDecisionCard.upgradeTrigger,
  ].filter(hasText).length;
  const hasImplementationSignal = Boolean(
    hasText(heroDecisionCard.implementationFriction.summary) ||
    heroDecisionCard.implementationFriction.drivers.length > 0
  );
  const showHeroDecisionCard = decisionSlotCount > 0 || hasImplementationSignal;
  const hasCanonicalDecisionSnapshot = showHeroDecisionCard;
  const hasStructuredPricingReality = Boolean(
    hasText(pricingReality.freeWorksIf) ||
    hasText(pricingReality.paidNeededWhen) ||
    pricingReality.hiddenCostTriggers.length > 0 ||
    pricingReality.mainCostDrivers.length > 0
  );

  return {
    showHeroDecisionCard,
    hasCanonicalDecisionSnapshot,
    hasStructuredPricingReality,
    showLegacyVerdictNarrative: !showHeroDecisionCard,
    showVerdictSourcesLink: input.hasSourcesSection,
    showLegacyPricingMentalModel: !hasStructuredPricingReality,
    verdictAnchorTarget: hasCanonicalDecisionSnapshot ? 'decision-snapshot' : 'verdict',
  };
}
