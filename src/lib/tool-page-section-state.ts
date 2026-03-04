import {
  createToolPageEvidenceContract,
  type ToolPageFieldConfidence,
} from '@/lib/tool-page-evidence-contract';
import {
  applyToolPageFreshnessPolicy,
  type ToolPageFreshnessPolicyResult,
} from '@/lib/tool-page-freshness-policy';
import {
  computeToolPageSectionContract,
  type ToolPageSectionContractResult,
  type ToolPageSectionMode,
} from '@/lib/tool-page-standard';

interface BuildToolPageSectionStateInput {
  contentConfidenceLevel: ToolPageFieldConfidence;
  hasAlternatives: boolean;
  firstReviewUpdatedAt?: string | null;
  firstReviewCreatedAt?: string | null;
  toolLastVerifiedAt?: string | null;
  toolPricingVerifiedAt?: string | null;
  toolUpdatedAt?: string | null;
  sectionStatus: {
    specs: ToolPageSectionMode;
    community: ToolPageSectionMode;
  };
  sectionPublishability: {
    faq: boolean;
  };
  hasFaqData: boolean;
  hasGettingStartedData: boolean;
  hasSpecsData: boolean;
  hasCommunityData: boolean;
  hasPlatformData: boolean;
  hasSecurityData: boolean;
  hasPortabilityData: boolean;
  hasKnowledgeCard: boolean;
  hasParentTool: boolean;
  hasSupportData: boolean;
  now?: Date;
}

export interface ToolPageSectionState {
  freshnessPolicy: ToolPageFreshnessPolicyResult;
  sectionContract: ToolPageSectionContractResult;
  hasFAQ: boolean;
  hasGettingStarted: boolean;
  hasSpecs: boolean;
  hasCommunity: boolean;
  hasPlatform: boolean;
  hasSecurity: boolean;
  hasPortability: boolean;
  hasOperationalDetails: boolean;
}

export function buildToolPageSectionState(input: BuildToolPageSectionStateInput): ToolPageSectionState {
  const evidenceContract = createToolPageEvidenceContract({
    factFields: ['evidence', 'pricing', 'alternatives'],
    evaluationDepth: 'docs_only',
    confidenceByField: {
      evidence: input.contentConfidenceLevel,
      pricing: input.toolPricingVerifiedAt ? 'high' : 'unknown',
      alternatives: input.hasAlternatives ? 'medium' : 'unknown',
    },
    lastCheckedByField: {
      evidence: input.firstReviewUpdatedAt || input.firstReviewCreatedAt || input.toolLastVerifiedAt || null,
      pricing: input.toolPricingVerifiedAt || input.toolLastVerifiedAt || null,
      alternatives: input.toolUpdatedAt || input.toolLastVerifiedAt || null,
    },
  });
  const freshnessPolicy = applyToolPageFreshnessPolicy(evidenceContract, input.now || new Date());
  const sectionContract = computeToolPageSectionContract({
    evidenceContract: freshnessPolicy.contract,
    sectionStatus: {
      specs: input.sectionStatus.specs,
      community: input.sectionStatus.community,
    },
    sectionPublishability: {
      faq: input.sectionPublishability.faq,
    },
    hasFaqData: input.hasFaqData,
    hasGettingStartedData: input.hasGettingStartedData,
    hasSpecsData: input.hasSpecsData,
    hasCommunityData: input.hasCommunityData,
    hasPlatformData: input.hasPlatformData,
    hasSecurityData: input.hasSecurityData,
    hasPortabilityData: input.hasPortabilityData,
  });

  const hasFAQ = sectionContract.allowedSections.faq;
  const hasGettingStarted = sectionContract.allowedSections.getting_started;
  const hasSpecs = sectionContract.allowedSections.specs;
  const hasCommunity = sectionContract.allowedSections.community;
  const hasPlatform = sectionContract.allowedSections.platform;
  const hasSecurity = sectionContract.allowedSections.security;
  const hasPortability = sectionContract.allowedSections.portability;
  const hasOperationalDetails = Boolean(
    input.hasKnowledgeCard ||
      input.hasParentTool ||
      (hasSecurity && input.hasSecurityData) ||
      input.hasSupportData ||
      (hasPortability && input.hasPortabilityData)
  );

  return {
    freshnessPolicy,
    sectionContract,
    hasFAQ,
    hasGettingStarted,
    hasSpecs,
    hasCommunity,
    hasPlatform,
    hasSecurity,
    hasPortability,
    hasOperationalDetails,
  };
}
