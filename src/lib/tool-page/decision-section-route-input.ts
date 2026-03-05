import type { buildToolPageDecisionSectionState } from '@/lib/tool-page/decision-section-state';
import { toToolPageSpecsRecord } from '@/lib/tool-page/route-normalizers';
import type { ToolPageReviewContextSignals } from '@/lib/tool-page/review-context';

interface BuildToolPageDecisionSectionStateFromRouteInput {
  qualityStateInput: Parameters<typeof buildToolPageDecisionSectionState>[0]['qualityStateInput'];
  faqStateInput: Parameters<typeof buildToolPageDecisionSectionState>[0]['faqStateInput'];
  displaySignalsInput: Parameters<
    typeof buildToolPageDecisionSectionState
  >[0]['displaySignalsInput'];
  decisionRuntimeInput: Parameters<
    typeof buildToolPageDecisionSectionState
  >[0]['decisionRuntimeInput'];
  sectionRuntimeInput: Parameters<
    typeof buildToolPageDecisionSectionState
  >[0]['sectionRuntimeInput'];
  faqSchemaInput: Parameters<typeof buildToolPageDecisionSectionState>[0]['faqSchemaInput'];
}

type ToolPageDecisionSectionInput = Parameters<typeof buildToolPageDecisionSectionState>[0];

function readToolPageStringField(value: unknown, key: string): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const field = (value as Record<string, unknown>)[key];
  return typeof field === 'string' ? field : null;
}

interface BuildToolPageDecisionSectionStateInputFromRouteContextInput {
  tool: ToolPageDecisionSectionInput['qualityStateInput']['tool'];
  firstReview: ToolPageDecisionSectionInput['qualityStateInput']['firstReview'];
  reviewSelection: ToolPageDecisionSectionInput['qualityStateInput']['reviewSelection'];
  canonicalFacts: ToolPageDecisionSectionInput['qualityStateInput']['canonicalFacts'];
  knowledgeCard: Record<string, unknown> | null;
  setupTracks: unknown;
  reviewContentLists: {
    pros: string[];
    cons: string[];
  };
  audiences: ToolPageDecisionSectionInput['decisionRuntimeInput']['audiences'];
  reviewContextSignals: ToolPageReviewContextSignals;
  globalCons: string[];
  hasEligibleNegativeEvidence: boolean;
  categorySpecificData: Record<string, unknown> | null;
  vipSpecifics: Record<string, unknown> | null;
  orderedAlternativesCount: number;
  eligibleSignalEvidenceCount: number;
  idealFor: string[];
  avoidIf: string[];
  delighters: string[];
  frustrations: string[];
  powerTip: string | null;
  humanVerdict: string | null;
  hasParentTool: boolean;
  now: Date;
}

export function buildToolPageDecisionSectionStateInputFromRoute(
  input: BuildToolPageDecisionSectionStateFromRouteInput
): Parameters<typeof buildToolPageDecisionSectionState>[0] {
  return {
    qualityStateInput: input.qualityStateInput,
    faqStateInput: input.faqStateInput,
    displaySignalsInput: input.displaySignalsInput,
    decisionRuntimeInput: input.decisionRuntimeInput,
    sectionRuntimeInput: input.sectionRuntimeInput,
    faqSchemaInput: input.faqSchemaInput,
  };
}

export function buildToolPageDecisionSectionStateInputFromRouteContext(
  input: BuildToolPageDecisionSectionStateInputFromRouteContextInput
): Parameters<typeof buildToolPageDecisionSectionState>[0] {
  const firstReviewUpdatedAt = readToolPageStringField(input.firstReview, 'updated_at');
  const firstReviewCreatedAt = readToolPageStringField(input.firstReview, 'created_at');
  const toolLastVerifiedAt = readToolPageStringField(input.tool, 'last_verified_at');
  const toolPricingVerifiedAt = readToolPageStringField(input.tool, 'pricing_verified_at');
  const toolUpdatedAt = readToolPageStringField(input.tool, 'updated_at');

  return buildToolPageDecisionSectionStateInputFromRoute({
    qualityStateInput: {
      tool: input.tool,
      firstReview: input.firstReview,
      reviewSelection: input.reviewSelection,
      canonicalFacts: input.canonicalFacts,
    },
    faqStateInput: input.knowledgeCard,
    displaySignalsInput: {
      toolPricingType: input.tool.pricing_type,
      reviewSummaryMarkdown: input.firstReview?.summary_markdown || null,
      toolVerdict: input.tool.verdict || null,
      humanVerdict: input.humanVerdict,
    },
    decisionRuntimeInput: {
      tool: {
        name: input.tool.name,
        short_description: input.tool.short_description,
        long_description: input.tool.long_description,
        pricing_type: input.tool.pricing_type,
        verdict: input.tool.verdict,
        website: input.tool.website,
        category: { slug: input.tool.category?.slug || null },
      },
      knowledgeCard: toToolPageSpecsRecord(input.knowledgeCard),
      setupTracks: input.setupTracks,
      firstReviewSummaryMarkdown: input.firstReview?.summary_markdown || null,
      reviewPros: input.reviewContentLists.pros,
      reviewCons: input.reviewContentLists.cons,
      audiences: input.audiences,
      reviewContextSignals: input.reviewContextSignals,
      globalCons: input.globalCons,
      hasEligibleNegativeEvidence: input.hasEligibleNegativeEvidence,
    },
    sectionRuntimeInput: {
      knowledgeCard: input.knowledgeCard,
      categorySpecificData: input.categorySpecificData,
      vipSpecifics: input.vipSpecifics,
      orderedAlternativesCount: input.orderedAlternativesCount,
      eligibleSignalEvidenceCount: input.eligibleSignalEvidenceCount,
      idealFor: input.idealFor,
      avoidIf: input.avoidIf,
      delighters: input.delighters,
      frustrations: input.frustrations,
      powerTip: input.powerTip,
      humanVerdict: input.humanVerdict,
      firstReviewUpdatedAt,
      firstReviewCreatedAt,
      toolLastVerifiedAt,
      toolPricingVerifiedAt,
      toolUpdatedAt,
      hasParentTool: input.hasParentTool,
      hasSupportData: Boolean(input.knowledgeCard?.support),
      now: input.now,
    },
    faqSchemaInput: {
      tool: input.tool,
    },
  });
}
