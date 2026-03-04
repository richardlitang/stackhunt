import { cleanToolPageNarrativeText } from '@/lib/tool-page/text';
import type { ToolPageEvidenceLinkEntry } from '@/lib/tool-page/evidence-links';
import type { ToolPageEvidenceBullet, ToolPageEvidenceBulletV2 } from '@/lib/tool-page/evidence-bullets';
import type { BuildToolPageEvidenceRuntimeInput } from '@/lib/tool-page/evidence-runtime';

interface BuildToolPageEvidenceRuntimeInputContext {
  reviewPros: unknown[];
  reviewCons: unknown[];
  globalPros: unknown[];
  globalCons: unknown[];
  toEvidenceBullet: (claim: unknown) => ToolPageEvidenceBullet | null;
  isDisallowedConClaim: (text: string) => boolean;
  hiddenCostBullets: ToolPageEvidenceBullet[];
  hardLimitFromConstraints: ToolPageEvidenceBullet[];
  decisionSnapshotWatchOuts: string[];
  decisionTradeoffSummaryInitial: string;
  officialEvidenceLinks: ToolPageEvidenceLinkEntry[];
  evidenceLinksAll: ToolPageEvidenceLinkEntry[];
  evidenceLinks: ToolPageEvidenceLinkEntry[];
  hasPricing: boolean;
  pricingVerifiedLabel: string | null;
  knowledgeCard: {
    smp_pricing?: {
      pricing_page_url?: string | null;
    } | null;
  } | null;
  sectionPricingStatus: BuildToolPageEvidenceRuntimeInput['sectionPricingStatus'];
  budgetCostDrivers: string[];
  budgetOneTimeFees: string[];
  budgetCommitmentTerms: string | null | undefined;
  budgetRoiThreshold: string | null | undefined;
  faqItems: Array<{ answer_source_url?: string | null }>;
  specsVerifiedLabel: string | null;
  communityVerifiedLabel: string | null;
  buildEvidenceBulletV2: (input: {
    text: string;
    kind: ToolPageEvidenceBulletV2['kind'];
    sourceUrl?: string | null;
    sourceLabel?: string;
    retrievedAt?: string;
    requiredSourcing: boolean;
  }) => ToolPageEvidenceBulletV2 | null;
  isEligibleEvidenceUrl: (value: unknown) => boolean;
}

export function buildToolPageEvidenceRuntimeInput(
  input: BuildToolPageEvidenceRuntimeInputContext
): BuildToolPageEvidenceRuntimeInput {
  const directPricingPageSource =
    typeof input.knowledgeCard?.smp_pricing?.pricing_page_url === 'string'
      ? input.knowledgeCard.smp_pricing.pricing_page_url
      : null;

  return {
    reviewPros: input.reviewPros,
    reviewCons: input.reviewCons,
    globalPros: input.globalPros,
    globalCons: input.globalCons,
    toEvidenceBullet: input.toEvidenceBullet,
    isDisallowedConClaim: input.isDisallowedConClaim,
    hiddenCostBullets: input.hiddenCostBullets,
    hardLimitFromConstraints: input.hardLimitFromConstraints,
    cleanNarrativeText: cleanToolPageNarrativeText,
    decisionSnapshotWatchOuts: input.decisionSnapshotWatchOuts,
    decisionTradeoffSummaryInitial: input.decisionTradeoffSummaryInitial,
    officialEvidenceLinks: input.officialEvidenceLinks,
    evidenceLinksAll: input.evidenceLinksAll,
    evidenceLinks: input.evidenceLinks,
    hasPricing: input.hasPricing,
    pricingVerifiedLabel: input.pricingVerifiedLabel,
    directPricingPageSource: input.isEligibleEvidenceUrl(directPricingPageSource)
      ? directPricingPageSource
      : null,
    sectionPricingStatus: input.sectionPricingStatus,
    budgetCostDrivers: input.budgetCostDrivers,
    budgetOneTimeFees: input.budgetOneTimeFees,
    budgetCommitmentTerms: input.budgetCommitmentTerms,
    budgetRoiThreshold: input.budgetRoiThreshold,
    faqItems: input.faqItems,
    specsVerifiedLabel: input.specsVerifiedLabel,
    communityVerifiedLabel: input.communityVerifiedLabel,
    buildEvidenceBulletV2: input.buildEvidenceBulletV2,
  };
}
