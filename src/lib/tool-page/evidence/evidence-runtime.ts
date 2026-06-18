import { deriveToolPageBaseEvidenceGrade } from '@/lib/tool-page/evidence/evidence-grade';
import type { ToolPageEvidenceLinkEntry } from '@/lib/tool-page/evidence/evidence-links';
import type {
  ToolPageEvidenceBullet,
  ToolPageEvidenceBulletV2,
} from '@/lib/tool-page/evidence/evidence-bullets';
import { deriveToolPageCanonicalHardLimits } from '@/lib/tool-page/evidence/constraints';
import { buildToolPagePricingViewModel } from '@/lib/tool-page/pricing/pricing';
import type { ToolPagePricingEvidenceLink } from '@/lib/tool-page/pricing/pricing';
import { prioritizeProsConsClaims } from '@/lib/tool-page/presentation/pros-cons-signal';
import { buildToolPageSourcesViewModel } from '@/lib/tool-page/evidence/sources';
import { buildToolPageTradeoffEvidence } from '@/lib/tool-page/evidence/tradeoff-evidence';

export interface BuildToolPageEvidenceRuntimeInput {
  reviewPros: unknown[];
  reviewCons: unknown[];
  globalPros: unknown[];
  globalCons: unknown[];
  toEvidenceBullet: (claim: unknown) => ToolPageEvidenceBullet | null;
  isDisallowedConClaim: (text: string) => boolean;
  hiddenCostBullets: ToolPageEvidenceBullet[];
  hardLimitFromConstraints: ToolPageEvidenceBullet[];
  cleanNarrativeText: (value: unknown) => string | null;
  decisionSnapshotWatchOuts: string[];
  decisionTradeoffSummaryInitial: string;
  officialEvidenceLinks: ToolPageEvidenceLinkEntry[];
  evidenceLinksAll: ToolPageEvidenceLinkEntry[];
  evidenceLinks: ToolPageEvidenceLinkEntry[];
  hasPricing: boolean;
  pricingVerifiedLabel: string | null;
  directPricingPageSource: string | null;
  sectionPricingStatus: 'show' | 'hide' | 'procedural';
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
}

export interface ToolPageEvidenceRuntime {
  effectiveEvidencePros: ToolPageEvidenceBullet[];
  effectiveEvidenceCons: ToolPageEvidenceBullet[];
  hasStrengths: boolean;
  canonicalHardLimits: ToolPageEvidenceBullet[];
  topHardLimit: ToolPageEvidenceBullet | null;
  decisionTradeoffSummary: string;
  baseEvidenceGrade: 'A' | 'B' | 'C';
  officialDocsSource: ToolPageEvidenceLinkEntry | undefined;
  officialPricingSource: ToolPagePricingEvidenceLink | null;
  pricingSourceUrl: string | null;
  pricingEvidenceLinks: ToolPageEvidenceBullet[];
  hasPricingCheckedProof: boolean;
  pricingCheckedLabel: string | null;
  showPricingSection: boolean;
  pricingNarrativeLead: string;
  pricingNarrativeLabel: string;
  collectedSourcesBySection: ReturnType<
    typeof buildToolPageSourcesViewModel
  >['collectedSourcesBySection'];
  collectedSourcesTotal: number;
  hasCollectedSources: boolean;
  decisionProofPoints: ToolPageEvidenceBulletV2[];
  avoidIfBullet: ToolPageEvidenceBulletV2 | null;
  tradeoffCons: ToolPageEvidenceBulletV2[];
}

export function buildToolPageEvidenceRuntime(
  input: BuildToolPageEvidenceRuntimeInput
): ToolPageEvidenceRuntime {
  const isFactualEvidenceClaim = (item: ToolPageEvidenceBullet): boolean => {
    if (item.sourceType === 'community') return false;
    if (item.claimType === 'opinion') return false;
    return true;
  };
  const contextualEvidenceCons = input.reviewCons
    .map(input.toEvidenceBullet)
    .filter((item): item is ToolPageEvidenceBullet => Boolean(item))
    .filter(isFactualEvidenceClaim);
  const contextualEvidencePros = input.reviewPros
    .map(input.toEvidenceBullet)
    .filter((item): item is ToolPageEvidenceBullet => Boolean(item))
    .filter(isFactualEvidenceClaim);
  const globalEvidencePros = input.globalPros
    .map(input.toEvidenceBullet)
    .filter((item): item is ToolPageEvidenceBullet => Boolean(item))
    .filter(isFactualEvidenceClaim);
  const globalEvidenceCons = input.globalCons
    .map(input.toEvidenceBullet)
    .filter((item): item is ToolPageEvidenceBullet => Boolean(item))
    .filter(isFactualEvidenceClaim);
  const effectiveEvidencePros = prioritizeProsConsClaims(
    contextualEvidencePros.length > 0 ? contextualEvidencePros : globalEvidencePros
  );
  const rawEvidenceCons =
    contextualEvidenceCons.length > 0 ? contextualEvidenceCons : globalEvidenceCons;
  const effectiveEvidenceCons = prioritizeProsConsClaims(
    rawEvidenceCons.filter((item) => !input.isDisallowedConClaim(item.text))
  );
  const hasStrengths = effectiveEvidencePros.length + effectiveEvidenceCons.length >= 2;

  const canonicalHardLimitsResult = deriveToolPageCanonicalHardLimits({
    hardLimitFromConstraints: input.hardLimitFromConstraints,
    effectiveEvidenceCons,
    hiddenCostBullets: input.hiddenCostBullets,
  });
  const { canonicalHardLimits, topHardLimit } = canonicalHardLimitsResult;

  const decisionTradeoffSummary =
    input.decisionTradeoffSummaryInitial ||
    input.cleanNarrativeText(topHardLimit?.text) ||
    input.cleanNarrativeText(input.decisionSnapshotWatchOuts[0]) ||
    'Tradeoff not confirmed yet.';

  const baseEvidenceGrade = deriveToolPageBaseEvidenceGrade({
    officialEvidenceLinks: input.officialEvidenceLinks,
    canonicalHardLimitCount: canonicalHardLimits.length,
    evidenceLinkCount: input.evidenceLinks.length,
  });
  const officialDocsSource = input.officialEvidenceLinks.find(
    (entry) =>
      entry.basis === 'Official docs/help center' ||
      entry.basis === 'Official changelogs' ||
      entry.basis === 'Official status pages'
  );

  const pricingViewModel = buildToolPagePricingViewModel({
    hasPricing: input.hasPricing,
    pricingVerifiedLabel: input.pricingVerifiedLabel,
    officialEvidenceLinks: input.officialEvidenceLinks,
    directPricingPageSource: input.directPricingPageSource,
    hardLimitFromConstraints: input.hardLimitFromConstraints,
    effectiveEvidenceCons,
    hiddenCostBullets: input.hiddenCostBullets,
    canonicalHardLimitsCount: canonicalHardLimits.length,
    sectionPricingStatus: input.sectionPricingStatus,
    budgetCostDrivers: input.budgetCostDrivers,
    budgetOneTimeFees: input.budgetOneTimeFees,
    budgetCommitmentTerms: input.budgetCommitmentTerms,
    budgetRoiThreshold: input.budgetRoiThreshold,
  });
  const {
    officialPricingSource,
    pricingSourceUrl,
    pricingEvidenceLinks,
    hasPricingCheckedProof,
    pricingCheckedLabel,
    showPricingSection,
    pricingNarrativeLead,
    pricingNarrativeLabel,
  } = pricingViewModel;

  const sourcesViewModel = buildToolPageSourcesViewModel({
    evidenceLinksAll: input.evidenceLinksAll,
    effectiveEvidencePros,
    effectiveEvidenceCons,
    pricingSourceUrl,
    pricingEvidenceLinks,
    faqItems: input.faqItems,
    officialDocsSourceUrl: officialDocsSource?.url || null,
    canonicalHardLimits,
  });
  const { collectedSourcesBySection, collectedSourcesTotal, hasCollectedSources } =
    sourcesViewModel;

  const decisionProofPoints = [
    input.buildEvidenceBulletV2({
      text: `Pricing references reviewed from official pages (checked ${input.pricingVerifiedLabel || 'latest available date'}).`,
      kind: 'claim',
      sourceUrl: pricingSourceUrl,
      sourceLabel: 'Official pricing',
      retrievedAt: input.pricingVerifiedLabel || undefined,
      requiredSourcing: true,
    }),
    input.buildEvidenceBulletV2({
      text: `Documentation and product references reviewed from official docs/help sources (checked ${input.specsVerifiedLabel || 'latest available date'}).`,
      kind: 'claim',
      sourceUrl: officialDocsSource?.url,
      sourceLabel: 'Official docs',
      retrievedAt: input.specsVerifiedLabel || undefined,
      requiredSourcing: true,
    }),
    input.buildEvidenceBulletV2({
      text: `Plan-gating and limitations were extracted from source-linked evidence for this page (checked ${input.communityVerifiedLabel || 'latest available date'}).`,
      kind: 'limit',
      sourceUrl:
        topHardLimit?.sourceUrl || officialPricingSource?.url || officialDocsSource?.url || null,
      sourceLabel: 'Constraint evidence',
      retrievedAt: input.communityVerifiedLabel || undefined,
      requiredSourcing: true,
    }),
  ].filter((item): item is ToolPageEvidenceBulletV2 => Boolean(item));

  const tradeoffEvidence = buildToolPageTradeoffEvidence({
    decisionSnapshotWatchOuts: input.decisionSnapshotWatchOuts,
    canonicalHardLimits,
    topHardLimit: topHardLimit || null,
    communityVerifiedLabel: input.communityVerifiedLabel,
    specsVerifiedLabel: input.specsVerifiedLabel,
    pricingVerifiedLabel: input.pricingVerifiedLabel,
  });

  return {
    effectiveEvidencePros,
    effectiveEvidenceCons,
    hasStrengths,
    canonicalHardLimits,
    topHardLimit,
    decisionTradeoffSummary,
    baseEvidenceGrade,
    officialDocsSource,
    officialPricingSource,
    pricingSourceUrl,
    pricingEvidenceLinks,
    hasPricingCheckedProof,
    pricingCheckedLabel,
    showPricingSection,
    pricingNarrativeLead,
    pricingNarrativeLabel,
    collectedSourcesBySection,
    collectedSourcesTotal,
    hasCollectedSources,
    decisionProofPoints,
    avoidIfBullet: tradeoffEvidence.avoidIfBullet,
    tradeoffCons: tradeoffEvidence.tradeoffCons,
  };
}
