import type { ToolPageEvidenceContract } from '@/lib/tool-page/evidence/evidence-contract';

export type ToolPageSectionMode = 'show' | 'hide' | 'procedural';
export type ToolPageOmissionReason =
  | 'omitted_due_to_missing_checked_date'
  | 'omitted_due_to_contract_disabled'
  | 'omitted_due_to_missing_data'
  | 'omitted_due_to_low_confidence';

export interface ToolPageSectionContractInput {
  evidenceContract: ToolPageEvidenceContract;
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
}

export interface ToolPageSectionContractResult {
  allowedSections: {
    faq: boolean;
    getting_started: boolean;
    specs: boolean;
    community: boolean;
    platform: boolean;
    security: boolean;
    portability: boolean;
  };
  sectionOmissionReasons: Partial<Record<'faq' | 'specs' | 'community', ToolPageOmissionReason>>;
}

function hasEvidenceCheckedDate(contract: ToolPageEvidenceContract): boolean {
  const candidate =
    contract.lastCheckedByField.evidence ||
    Object.values(contract.lastCheckedByField).find((value) => Boolean(value));
  return typeof candidate === 'string' && candidate.length > 0;
}

function hasMinimumEvidenceConfidence(contract: ToolPageEvidenceContract): boolean {
  const confidence = contract.confidenceByField.evidence;
  return confidence === 'high' || confidence === 'medium';
}

function resolveOmissionReason({
  enabled,
  hasData,
  checkedDateReady,
}: {
  enabled: boolean;
  hasData: boolean;
  checkedDateReady: boolean;
}): ToolPageOmissionReason {
  if (!enabled) return 'omitted_due_to_contract_disabled';
  if (!hasData) return 'omitted_due_to_missing_data';
  if (!checkedDateReady) return 'omitted_due_to_missing_checked_date';
  return 'omitted_due_to_low_confidence';
}

export function computeToolPageSectionContract(
  input: ToolPageSectionContractInput
): ToolPageSectionContractResult {
  const sectionOmissionReasons: ToolPageSectionContractResult['sectionOmissionReasons'] = {};
  const checkedDateReady = hasEvidenceCheckedDate(input.evidenceContract);
  const confidenceReady = hasMinimumEvidenceConfidence(input.evidenceContract);
  const optionalSectionReady = checkedDateReady && confidenceReady;

  const faqAllowedByContract = input.sectionPublishability.faq;
  const faqAllowed = faqAllowedByContract && input.hasFaqData && optionalSectionReady;
  if (!faqAllowed) {
    sectionOmissionReasons.faq = resolveOmissionReason({
      enabled: faqAllowedByContract,
      hasData: input.hasFaqData,
      checkedDateReady,
    });
  }

  const specsEnabled = input.sectionStatus.specs === 'show';
  const specsAllowed = specsEnabled && input.hasSpecsData && optionalSectionReady;
  if (!specsAllowed) {
    sectionOmissionReasons.specs = resolveOmissionReason({
      enabled: specsEnabled,
      hasData: input.hasSpecsData,
      checkedDateReady,
    });
  }

  const communityEnabled = input.sectionStatus.community === 'show';
  const communityAllowed = communityEnabled && input.hasCommunityData && optionalSectionReady;
  if (!communityAllowed) {
    sectionOmissionReasons.community = resolveOmissionReason({
      enabled: communityEnabled,
      hasData: input.hasCommunityData,
      checkedDateReady,
    });
  }

  return {
    allowedSections: {
      faq: faqAllowed,
      getting_started: input.hasGettingStartedData && optionalSectionReady,
      specs: specsAllowed,
      community: communityAllowed,
      platform: input.hasPlatformData && optionalSectionReady,
      security: input.hasSecurityData && optionalSectionReady,
      portability: input.hasPortabilityData && optionalSectionReady,
    },
    sectionOmissionReasons,
  };
}
