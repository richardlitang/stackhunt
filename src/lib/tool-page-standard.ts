import type { ToolPageEvidenceContract } from '@/lib/tool-page-evidence-contract';

export type ToolPageSectionMode = 'show' | 'hide' | 'procedural';
export type ToolPageOmissionReason =
  | 'omitted_due_to_missing_checked_date'
  | 'omitted_due_to_contract_disabled'
  | 'omitted_due_to_missing_data';

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

export function computeToolPageSectionContract(
  input: ToolPageSectionContractInput
): ToolPageSectionContractResult {
  const sectionOmissionReasons: ToolPageSectionContractResult['sectionOmissionReasons'] = {};
  const checkedDateReady = hasEvidenceCheckedDate(input.evidenceContract);

  const faqAllowedByContract = input.sectionPublishability.faq;
  const faqAllowed = faqAllowedByContract && input.hasFaqData && checkedDateReady;
  if (!faqAllowed) {
    if (!faqAllowedByContract) sectionOmissionReasons.faq = 'omitted_due_to_contract_disabled';
    else if (!input.hasFaqData) sectionOmissionReasons.faq = 'omitted_due_to_missing_data';
    else sectionOmissionReasons.faq = 'omitted_due_to_missing_checked_date';
  }

  const specsEnabled = input.sectionStatus.specs === 'show';
  const specsAllowed = specsEnabled && input.hasSpecsData && checkedDateReady;
  if (!specsAllowed) {
    if (!specsEnabled) sectionOmissionReasons.specs = 'omitted_due_to_contract_disabled';
    else if (!input.hasSpecsData) sectionOmissionReasons.specs = 'omitted_due_to_missing_data';
    else sectionOmissionReasons.specs = 'omitted_due_to_missing_checked_date';
  }

  const communityEnabled = input.sectionStatus.community === 'show';
  const communityAllowed = communityEnabled && input.hasCommunityData && checkedDateReady;
  if (!communityAllowed) {
    if (!communityEnabled) sectionOmissionReasons.community = 'omitted_due_to_contract_disabled';
    else if (!input.hasCommunityData) sectionOmissionReasons.community = 'omitted_due_to_missing_data';
    else sectionOmissionReasons.community = 'omitted_due_to_missing_checked_date';
  }

  return {
    allowedSections: {
      faq: faqAllowed,
      getting_started: input.hasGettingStartedData,
      specs: specsAllowed,
      community: communityAllowed,
      platform: input.hasPlatformData,
      security: input.hasSecurityData,
      portability: input.hasPortabilityData,
    },
    sectionOmissionReasons,
  };
}
