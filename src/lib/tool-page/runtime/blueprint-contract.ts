import type {
  ToolPageAlternativesRebuttal,
  ToolPageBeforeYouBuyTest,
  ToolPageBuyerDecisionLayer,
  ToolPageCompactTrustStrip,
  ToolPageFitMatrix,
  ToolPageHeroDecisionCard,
  ToolPagePricingReality,
} from '@/types/tool-page-blueprint';
import type { ReviewLens } from '@/lib/tool-page/presentation/view-model';

interface BuildToolPageBuyerDecisionLayerInput {
  activeLens: ReviewLens;
  lensHrefs: Record<ReviewLens, string>;
  jumpLinks: Array<{ href: string; label: string }>;
  trust: ToolPageCompactTrustStrip;
  heroDecisionCard: Omit<ToolPageHeroDecisionCard, 'evidence'> & {
    evidence?: ToolPageHeroDecisionCard['evidence'];
  };
  fitMatrix?: Partial<ToolPageFitMatrix>;
  pricingReality?: Partial<ToolPagePricingReality>;
  beforeYouBuyTests?: ToolPageBeforeYouBuyTest[];
  alternativesRebuttals?: ToolPageAlternativesRebuttal[];
}

function toDefaultEvidence(): ToolPageHeroDecisionCard['evidence'] {
  return {
    evidenceType: 'unknown',
    confidence: 'low',
    lastChecked: null,
    sourceUrl: null,
  };
}

function toDefaultFitRow(): ToolPageFitMatrix['solo'] {
  return null;
}

function toDefaultPricingReality(): ToolPagePricingReality {
  return {
    freeWorksIf: null,
    paidNeededWhen: null,
    hiddenCostTriggers: [],
    mainCostDrivers: [],
    evidence: toDefaultEvidence(),
  };
}

export function buildToolPageBuyerDecisionLayer(
  input: BuildToolPageBuyerDecisionLayerInput
): ToolPageBuyerDecisionLayer {
  return {
    heroDecisionCard: {
      ...input.heroDecisionCard,
      evidence: input.heroDecisionCard.evidence || toDefaultEvidence(),
    },
    fitMatrix: {
      solo: input.fitMatrix?.solo || toDefaultFitRow(),
      startup: input.fitMatrix?.startup || toDefaultFitRow(),
      midMarket: input.fitMatrix?.midMarket || toDefaultFitRow(),
      enterprise: input.fitMatrix?.enterprise || toDefaultFitRow(),
    },
    pricingReality: {
      ...toDefaultPricingReality(),
      ...(input.pricingReality || {}),
      evidence: input.pricingReality?.evidence || toDefaultEvidence(),
    },
    beforeYouBuyTests: (input.beforeYouBuyTests || []).slice(0, 3),
    alternativesRebuttals: input.alternativesRebuttals || [],
    compactTrustStrip: input.trust,
    toolbar: {
      activeLens: input.activeLens,
      lensHrefs: input.lensHrefs,
      jumpLinks: input.jumpLinks,
    },
  };
}
