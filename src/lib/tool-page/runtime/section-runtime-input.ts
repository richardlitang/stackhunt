import type { BuildToolPageSectionRuntimeInput } from '@/lib/tool-page/runtime/section-runtime';
import {
  hasCompanyInfoData,
  hasIntegrationsData,
  hasMeaningfulObjectData,
  hasPortabilityData,
  hasSecurityData,
} from '@/lib/tool-page/presentation/knowledge-card-presence';

interface BuildToolPageSectionRuntimeInputContext {
  faqItems: unknown[];
  sectionPublishabilityFaq: boolean;
  knowledgeCard: {
    features?: { core?: unknown[]; unique?: unknown[] } | null;
    platforms?: unknown[] | null;
    integrations?: unknown;
    security?: unknown;
    smp_portability?: unknown;
  } | null;
  categorySpecificData: unknown;
  vipSpecifics: unknown;
  sectionStatus: {
    specs: BuildToolPageSectionRuntimeInput['sectionStateBaseInput']['sectionStatus']['specs'];
    community: BuildToolPageSectionRuntimeInput['sectionStateBaseInput']['sectionStatus']['community'];
  };
  orderedAlternativesCount: number;
  eligibleSignalEvidenceCount: number;
  idealFor: unknown[];
  avoidIf: unknown[];
  delighters: unknown[];
  frustrations: unknown[];
  powerTip: unknown;
  humanVerdict: unknown;
  contentConfidenceLevel: BuildToolPageSectionRuntimeInput['sectionStateBaseInput']['contentConfidenceLevel'];
  firstReviewUpdatedAt: string | null;
  firstReviewCreatedAt: string | null;
  toolLastVerifiedAt: string | null;
  toolPricingVerifiedAt: string | null;
  toolUpdatedAt: string | null;
  hasGettingStartedData: boolean;
  hasParentTool: boolean;
  hasSupportData: boolean;
  now: Date;
}

const toStringArray = (value: unknown[]): string[] =>
  value.filter((item): item is string => typeof item === 'string');

export function buildToolPageSectionRuntimeInput(
  input: BuildToolPageSectionRuntimeInputContext
): BuildToolPageSectionRuntimeInput {
  return {
    sectionSignalsInput: {
      faqCount: input.faqItems.length,
      faqPublishable: input.sectionPublishabilityFaq,
      featureCoreCount: Array.isArray(input.knowledgeCard?.features?.core)
        ? input.knowledgeCard.features.core.length
        : 0,
      featureUniqueCount: Array.isArray(input.knowledgeCard?.features?.unique)
        ? input.knowledgeCard.features.unique.length
        : 0,
      hasCategorySpecificData: hasMeaningfulObjectData(input.categorySpecificData),
      hasVipSpecifics: hasMeaningfulObjectData(input.vipSpecifics),
      specsSectionStatus: input.sectionStatus.specs,
      hasPlatforms:
        Array.isArray(input.knowledgeCard?.platforms) && input.knowledgeCard.platforms.length > 0,
      hasIntegrations: hasIntegrationsData(input.knowledgeCard),
      alternativesCount: input.orderedAlternativesCount,
      communitySectionStatus: input.sectionStatus.community,
      eligibleSignalEvidenceCount: input.eligibleSignalEvidenceCount,
      idealFor: toStringArray(input.idealFor),
      avoidIf: toStringArray(input.avoidIf),
      delighters: toStringArray(input.delighters),
      frustrations: toStringArray(input.frustrations),
      powerTip: typeof input.powerTip === 'string' ? input.powerTip : null,
      humanVerdict: typeof input.humanVerdict === 'string' ? input.humanVerdict : null,
    },
    sectionStateBaseInput: {
      contentConfidenceLevel: input.contentConfidenceLevel,
      firstReviewUpdatedAt: input.firstReviewUpdatedAt,
      firstReviewCreatedAt: input.firstReviewCreatedAt,
      toolLastVerifiedAt: input.toolLastVerifiedAt,
      toolPricingVerifiedAt: input.toolPricingVerifiedAt,
      toolUpdatedAt: input.toolUpdatedAt,
      sectionStatus: {
        specs: input.sectionStatus.specs,
        community: input.sectionStatus.community,
      },
      sectionPublishability: {
        faq: input.sectionPublishabilityFaq,
      },
      hasGettingStartedData: input.hasGettingStartedData,
      hasSecurityData: hasSecurityData(input.knowledgeCard),
      hasPortabilityData: hasPortabilityData(input.knowledgeCard),
      hasKnowledgeCard: hasCompanyInfoData(input.knowledgeCard, null),
      hasParentTool: input.hasParentTool,
      hasSupportData: input.hasSupportData,
      now: input.now,
    },
  };
}
