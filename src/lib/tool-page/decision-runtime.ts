import { isToolPagePaymentsCategoryHint } from '@/lib/tool-page/category-hints';
import {
  buildToolPageDecisionSnapshot,
  buildToolPageFallbackDecisionSummary,
  deriveToolPageDecisionDifferentiators,
} from '@/lib/tool-page/decision';
import { deriveToolPagePricingSignals } from '@/lib/tool-page/pricing';
import { deriveToolPageSetupSignals } from '@/lib/tool-page/setup';
import {
  cleanToolPageDecisionSlotText,
  cleanToolPageNarrativeText,
  hasToolPageDistinctAbout,
  uniqueToolPageDecisionText,
} from '@/lib/tool-page/text';
import { deriveToolPageVerdictPolicy } from '@/lib/tool-page/verdict-policy';

export interface BuildToolPageDecisionRuntimeInput {
  tool: {
    name: string;
    short_description: string | null;
    long_description: string | null;
    pricing_type: string | null;
    verdict: string | null;
    website: string | null;
    category?: { slug?: string | null } | null;
  };
  knowledgeCard: Record<string, any> | null;
  setupTracks: unknown;
  review: {
    summary_markdown: string | null;
    pros: unknown[];
    cons: unknown[];
  };
  tags: {
    audiences: Array<{ name: string }>;
  };
  reviewContextSignals: {
    humanVerdict: string | null;
    decisionSlotsRaw: Record<string, unknown> | null;
    decisionIntroRaw: Record<string, unknown> | null;
    idealFor: unknown[];
    avoidIf: unknown[];
  };
  sectionStatus: {
    pricing: 'show' | 'hide' | 'procedural';
    verdict: 'show' | 'hide' | 'procedural';
  };
  globalCons: unknown[];
  hasEligibleNegativeEvidence: boolean;
  renderVerdict: string | null;
}

export function buildToolPageDecisionRuntime(input: BuildToolPageDecisionRuntimeInput): {
  hasAbout: boolean;
  setupSignals: ReturnType<typeof deriveToolPageSetupSignals>;
  hasGettingStartedRaw: boolean;
  comparativeFeaturePeerCount: number;
  hasPricing: boolean;
  hasFreePlanSignal: boolean;
  guardedHumanVerdict: string | null;
  guardedAvoidIf: string[];
  renderVerdictSafe: string | null;
  isDisallowedConClaim: (text: string) => boolean;
  hasVerdict: boolean;
  isPaymentsCategory: boolean;
  decisionSnapshotSummary: string;
  introLooksSpecSheet: boolean;
  decisionSnapshotBestWhen: string[];
  decisionSnapshotWatchOuts: string[];
  decisionTradeoffSummaryInitial: string;
  decisionSnapshotDifferentiators: string[];
} {
  const hasAbout = hasToolPageDistinctAbout(
    input.tool.long_description,
    input.tool.short_description
  );
  const setupSignals = deriveToolPageSetupSignals({
    knowledgeCard: input.knowledgeCard,
    setupTracks: input.setupTracks || null,
    website: input.tool.website,
  });
  const hasGettingStartedRaw = setupSignals.hasGettingStarted;
  const comparativeFeaturePeerCount =
    typeof (input.knowledgeCard?.meta as Record<string, unknown> | undefined)
      ?.comparative_feature_peer_count === 'number'
      ? ((input.knowledgeCard?.meta as Record<string, unknown>)
          .comparative_feature_peer_count as number)
      : 0;

  const pricingSignals = deriveToolPagePricingSignals({
    toolPricingType: input.tool.pricing_type,
    pricingStartingPrice:
      typeof input.knowledgeCard?.pricing?.starting_price === 'string'
        ? input.knowledgeCard.pricing.starting_price
        : null,
    smpPlans: input.knowledgeCard?.smp_pricing?.plans,
    legacyPricingTiers: input.knowledgeCard?.pricing?.tiers,
    pricingSectionStatus: input.sectionStatus.pricing,
  });
  const hasPricing = pricingSignals.hasPricing;
  const hasFreePlanSignal = pricingSignals.hasFreePlanSignal;

  const verdictPolicy = deriveToolPageVerdictPolicy({
    firstReviewSummaryMarkdown: input.review.summary_markdown || null,
    toolVerdict: input.tool.verdict || null,
    humanVerdict: input.reviewContextSignals.humanVerdict || null,
    avoidIf: Array.isArray(input.reviewContextSignals.avoidIf)
      ? input.reviewContextSignals.avoidIf.filter(
          (item): item is string => typeof item === 'string'
        )
      : [],
    hasEligibleNegativeEvidence: input.hasEligibleNegativeEvidence,
    hasFreePlanSignal,
    renderVerdict: input.renderVerdict,
  });
  const { guardedHumanVerdict, guardedAvoidIf, renderVerdictSafe, isDisallowedConClaim } =
    verdictPolicy;
  const hasVerdict = Boolean(renderVerdictSafe && input.sectionStatus.verdict === 'show');

  const isPaymentsCategory = isToolPagePaymentsCategoryHint(
    input.tool.category?.slug || null,
    typeof input.knowledgeCard?.smp_taxonomy?.primary_function === 'string'
      ? input.knowledgeCard.smp_taxonomy.primary_function
      : null
  );
  const fallbackDecisionSummary = buildToolPageFallbackDecisionSummary(
    input.tool.name,
    input.tool.short_description,
    input.knowledgeCard?.tagline || null
  );
  const decisionSnapshot = buildToolPageDecisionSnapshot({
    decisionSlotsRaw: input.reviewContextSignals.decisionSlotsRaw,
    decisionIntroRaw: input.reviewContextSignals.decisionIntroRaw,
    fallbackDecisionSummary,
    idealFor: input.reviewContextSignals.idealFor,
    guardedAvoidIf,
    isDisallowedConClaim,
    cleanNarrativeText: cleanToolPageNarrativeText,
    cleanDecisionSlotText: cleanToolPageDecisionSlotText,
    uniqueDecisionText: uniqueToolPageDecisionText,
  });
  const decisionSnapshotDifferentiators = deriveToolPageDecisionDifferentiators(
    input.knowledgeCard?.features?.unique,
    input.knowledgeCard?.features?.core,
    uniqueToolPageDecisionText
  );

  return {
    hasAbout,
    setupSignals,
    hasGettingStartedRaw,
    comparativeFeaturePeerCount,
    hasPricing,
    hasFreePlanSignal,
    guardedHumanVerdict,
    guardedAvoidIf,
    renderVerdictSafe,
    isDisallowedConClaim,
    hasVerdict,
    isPaymentsCategory,
    decisionSnapshotSummary: decisionSnapshot.decisionSnapshotSummary,
    introLooksSpecSheet: decisionSnapshot.introLooksSpecSheet,
    decisionSnapshotBestWhen: decisionSnapshot.decisionSnapshotBestWhen,
    decisionSnapshotWatchOuts: decisionSnapshot.decisionSnapshotWatchOuts,
    decisionTradeoffSummaryInitial: decisionSnapshot.decisionTradeoffSummaryInitial,
    decisionSnapshotDifferentiators,
  };
}
