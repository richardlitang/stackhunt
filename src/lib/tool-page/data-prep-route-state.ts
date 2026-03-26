import { buildToolPageEvidenceSignalsStateInputFromRoute } from '@/lib/tool-page/evidence-signals-route-input';
import { buildToolPageEvidenceSignalsState } from '@/lib/tool-page/evidence-signals-state';
import { buildToolPageDecisionSectionStateInputFromRoute } from '@/lib/tool-page/decision-section-route-input';
import { buildToolPageDecisionSectionState } from '@/lib/tool-page/decision-section-state';
import { buildToolPagePrepStateInputFromRoute } from '@/lib/tool-page/prep-input';
import { buildToolPagePrepState } from '@/lib/tool-page/prep-state';
import { deriveToolPageReviewContextSignals } from '@/lib/tool-page/review-context';
import { buildToolPageReviewArtifactsState } from '@/lib/tool-page/review-artifacts-state';
import {
  toToolPageOptionalRecord,
  toToolPageReviewSources,
} from '@/lib/tool-page/route-normalizers';
import { hasSupportData } from '@/lib/tool-page/knowledge-card-presence';
import type { ToolPageData } from '@/lib/tool-page/data';

interface BuildToolPageDataPrepRouteStateInput {
  toolPageData: ToolPageData;
  isEligibleEvidenceUrl: (url: unknown) => boolean;
  now?: Date;
}

function readToolPageStringField(value: unknown, key: string): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const field = (value as Record<string, unknown>)[key];
  return typeof field === 'string' ? field : null;
}

export function buildToolPageDataPrepRouteState(
  input: BuildToolPageDataPrepRouteStateInput
): ToolPageData &
  ToolPageData['coreState'] & {
    prepState: ReturnType<typeof buildToolPagePrepState>;
    decisionSectionState: ReturnType<typeof buildToolPageDecisionSectionState>;
    reviewArtifactsState: ReturnType<typeof buildToolPageReviewArtifactsState>;
    evidenceSignalsState: ReturnType<typeof buildToolPageEvidenceSignalsState>;
    reviewContextSignals: ReturnType<typeof deriveToolPageReviewContextSignals>;
  } {
  const {
    tool,
    parentTool,
    resolvedSubject,
    laneOutputs,
    subjectSelectionSuppressed,
    subjectSelectionReason,
    tags,
    primaryOffer,
    reviewSelection,
    firstReview,
    reviewContentLists,
    coreState,
    orderedAlternatives,
    alternativesLabel,
    microDiffs,
    curatedVerdictEntries,
  } = input.toolPageData;
  const {
    knowledgeCard,
    globalPros,
    globalCons,
    constraints,
    canonicalFacts,
    setupTracks,
    categorySpecificData,
    vipSpecifics,
    reviewContext,
  } = coreState;
  const reviewContextSignals = deriveToolPageReviewContextSignals({
    reviewContext,
    laneOutputs,
  });
  const prepState = buildToolPagePrepState(
    buildToolPagePrepStateInputFromRoute({
      reviewSources: reviewContentLists.sources as Array<Record<string, unknown>>,
      isEligibleEvidenceUrl: input.isEligibleEvidenceUrl,
      tool,
      orderedAlternatives: orderedAlternatives as Array<{
        slug?: string | null;
        metadata?: unknown;
        item_category_links?: unknown;
      }> | null,
    })
  );
  const decisionSectionState = buildToolPageDecisionSectionState(
    buildToolPageDecisionSectionStateInputFromRoute({
      qualityStateInput: {
        tool,
        firstReview: firstReview as any,
        reviewSelection,
        canonicalFacts: canonicalFacts as any,
        resolvedSubject,
        subjectSelectionSuppressed,
        subjectSelectionReason,
        laneOutputs,
      },
      faqStateInput: (knowledgeCard as Record<string, unknown> | null) || null,
      displaySignalsInput: {
        toolPricingType: tool.pricing_type,
        reviewSummaryMarkdown: (firstReview as any)?.summary_markdown || null,
        toolVerdict: tool.verdict || null,
        humanVerdict: reviewContextSignals.humanVerdict,
      },
      decisionRuntimeInput: {
        tool: {
          name: tool.name,
          short_description: tool.short_description,
          long_description: tool.long_description,
          pricing_type: tool.pricing_type,
          verdict: tool.verdict,
          website: tool.website,
          category: { slug: tool.category?.slug || null },
        },
        knowledgeCard: (knowledgeCard as Record<string, unknown> | null) || null,
        setupTracks: setupTracks as any,
        firstReviewSummaryMarkdown: (firstReview as any)?.summary_markdown || null,
        reviewPros: reviewContentLists.pros,
        reviewCons: reviewContentLists.cons,
        audiences: tags.audiences,
        reviewContextSignals,
        globalCons: globalCons as any,
        hasEligibleNegativeEvidence: prepState.hasEligibleNegativeEvidence,
      },
      sectionRuntimeInput: {
        knowledgeCard: (knowledgeCard as Record<string, unknown> | null) || null,
        categorySpecificData: (categorySpecificData as Record<string, unknown> | null) || null,
        vipSpecifics: (vipSpecifics as Record<string, unknown> | null) || null,
        orderedAlternativesCount: orderedAlternatives?.length || 0,
        eligibleSignalEvidenceCount: prepState.eligibleSignalEvidenceCount,
        idealFor: reviewContextSignals.idealFor,
        avoidIf: reviewContextSignals.avoidIf,
        delighters: reviewContextSignals.delighters,
        frustrations: reviewContextSignals.frustrations,
        powerTip: reviewContextSignals.powerTip,
        humanVerdict: reviewContextSignals.humanVerdict,
        firstReviewUpdatedAt: readToolPageStringField(firstReview, 'updated_at'),
        firstReviewCreatedAt: readToolPageStringField(firstReview, 'created_at'),
        toolLastVerifiedAt: readToolPageStringField(tool, 'last_verified_at'),
        toolPricingVerifiedAt: readToolPageStringField(tool, 'pricing_verified_at'),
        toolUpdatedAt: readToolPageStringField(tool, 'updated_at'),
        hasParentTool: Boolean(parentTool),
        hasSupportData: hasSupportData(knowledgeCard),
        now: input.now || new Date(),
      },
      faqSchemaInput: {
        tool,
      },
    })
  );
  const reviewArtifactsState = buildToolPageReviewArtifactsState({
    canonicalFacts: toToolPageOptionalRecord(canonicalFacts),
    reviewSources: toToolPageReviewSources(reviewContentLists.sources),
    toolName: tool.name,
  });
  const evidenceSignalsState = buildToolPageEvidenceSignalsState(
    buildToolPageEvidenceSignalsStateInputFromRoute({
      reviewSignalsInput: {
        firstReview: firstReview as any,
        toolLastVerifiedAt: tool.last_verified_at || null,
        toolPricingVerifiedAt: tool.pricing_verified_at || null,
        extractionDate:
          typeof knowledgeCard?.meta?.extraction_date === 'string'
            ? knowledgeCard.meta.extraction_date
            : null,
      },
      constraintEvidenceInput: {
        constraints: constraints as any,
        isEligibleEvidenceUrl: (value: unknown): boolean =>
          typeof value === 'string' && input.isEligibleEvidenceUrl(value),
        isDisallowedConClaim: decisionSectionState.decisionRuntime.isDisallowedConClaim,
      },
      evidenceRuntimeInput: {
        reviewPros: reviewContentLists.pros as any,
        reviewCons: reviewContentLists.cons as any,
        globalPros: Array.isArray(globalPros) ? globalPros : [],
        globalCons: Array.isArray(globalCons) ? globalCons : [],
        toEvidenceBullet: prepState.toEvidenceBullet,
        isDisallowedConClaim: decisionSectionState.decisionRuntime.isDisallowedConClaim,
        decisionSnapshotWatchOuts: decisionSectionState.decisionRuntime.decisionSnapshotWatchOuts,
        decisionTradeoffSummaryInitial:
          decisionSectionState.decisionRuntime.decisionTradeoffSummaryInitial,
        officialEvidenceLinks: reviewArtifactsState.officialEvidenceLinks,
        evidenceLinksAll: reviewArtifactsState.evidenceLinksAll,
        evidenceLinks: reviewArtifactsState.evidenceLinks,
        hasPricing: decisionSectionState.decisionRuntime.hasPricing,
        knowledgeCard,
        sectionPricingStatus: decisionSectionState.qualityState.sectionStatus.pricing || 'hide',
        budgetCostDrivers: reviewContextSignals.budgetCostDrivers,
        budgetOneTimeFees: reviewContextSignals.budgetOneTimeFees,
        budgetCommitmentTerms: reviewContextSignals.budgetCommitmentTerms,
        budgetRoiThreshold: reviewContextSignals.budgetRoiThreshold,
        faqItems: decisionSectionState.faqState.faqItems.map((item) => ({
          question: typeof item.question === 'string' ? item.question : '',
          answer: typeof item.answer === 'string' ? item.answer : '',
          answer_source_url:
            typeof item.answer_source_url === 'string' || item.answer_source_url === null
              ? item.answer_source_url
              : null,
        })),
        buildEvidenceBulletV2: prepState.buildEvidenceBulletV2,
        isEligibleEvidenceUrl: (value: unknown): boolean =>
          typeof value === 'string' && input.isEligibleEvidenceUrl(value),
      },
    })
  );

  return {
    tool,
    parentTool,
    resolvedSubject,
    laneOutputs,
    subjectSelectionSuppressed,
    subjectSelectionReason,
    tags,
    primaryOffer,
    reviewSelection,
    firstReview,
    reviewContentLists,
    coreState,
    orderedAlternatives,
    alternativesLabel,
    microDiffs,
    curatedVerdictEntries,
    ...coreState,
    reviewContextSignals,
    prepState,
    decisionSectionState,
    reviewArtifactsState,
    evidenceSignalsState,
  };
}
