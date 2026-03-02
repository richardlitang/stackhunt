import type { ToolFactConfidence, ToolPageEvidenceContract } from '@/lib/tool-page-evidence-contract';

export type ToolPageSectionKey =
  | 'faq'
  | 'getting_started'
  | 'specs'
  | 'community'
  | 'platform_integrations'
  | 'security'
  | 'portability';

export interface ToolPageStandardInput {
  evidenceContract: ToolPageEvidenceContract;
  sectionStatus: Record<string, 'show' | 'hide' | 'procedural'>;
  sectionPublishability: Record<string, boolean>;
  hasFaqData: boolean;
  hasGettingStartedData: boolean;
  hasSpecsData: boolean;
  hasCommunityData: boolean;
  hasPlatformData: boolean;
  hasSecurityData: boolean;
  hasPortabilityData: boolean;
}

export interface ToolPageStandardResult {
  allowedSections: Record<ToolPageSectionKey, boolean>;
  sectionOmissionReasons: Partial<Record<ToolPageSectionKey, string>>;
  sectionReasonCodes: string[];
}

function scoreConfidence(confidence: ToolFactConfidence): number {
  switch (confidence) {
    case 'high':
      return 3;
    case 'medium':
      return 2;
    case 'low':
      return 1;
    default:
      return 0;
  }
}

function isAtLeastMedium(confidence: ToolFactConfidence): boolean {
  return scoreConfidence(confidence) >= scoreConfidence('medium');
}

function confidenceForField(contract: ToolPageEvidenceContract, field: string): ToolFactConfidence {
  return contract.confidenceByField[field] || 'unknown';
}

function hasCheckedDate(contract: ToolPageEvidenceContract, field: string): boolean {
  return Boolean(contract.lastCheckedByField[field]);
}

export function computeToolPageSectionContract(
  input: ToolPageStandardInput
): ToolPageStandardResult {
  const reasons: Partial<Record<ToolPageSectionKey, string>> = {};
  const reasonCodes: string[] = [];
  const evidenceConfidence = confidenceForField(input.evidenceContract, 'evidence');

  const allow = (
    key: ToolPageSectionKey,
    condition: boolean,
    reasonIfFalse: string
  ): boolean => {
    if (!condition) {
      reasons[key] = reasonIfFalse;
      reasonCodes.push(`${key}:${reasonIfFalse}`);
      return false;
    }
    return true;
  };

  const allowedSections: Record<ToolPageSectionKey, boolean> = {
    faq: allow(
      'faq',
      input.hasFaqData &&
        input.sectionPublishability.faq !== false &&
        isAtLeastMedium(evidenceConfidence) &&
        hasCheckedDate(input.evidenceContract, 'evidence'),
      !input.hasFaqData
        ? 'omitted_due_to_low_field_completeness'
        : !hasCheckedDate(input.evidenceContract, 'evidence')
          ? 'omitted_due_to_missing_checked_date'
          : 'omitted_due_to_low_confidence'
    ),
    getting_started: allow(
      'getting_started',
      input.hasGettingStartedData &&
        (input.evidenceContract.evaluationDepth !== 'docs_only' ||
          hasCheckedDate(input.evidenceContract, 'evidence')),
      !input.hasGettingStartedData
        ? 'omitted_due_to_low_field_completeness'
        : 'omitted_due_to_missing_checked_date'
    ),
    specs: allow(
      'specs',
      input.hasSpecsData &&
        input.sectionStatus.specs === 'show' &&
        isAtLeastMedium(evidenceConfidence),
      !input.hasSpecsData
        ? 'omitted_due_to_low_field_completeness'
        : input.sectionStatus.specs !== 'show'
          ? 'omitted_due_to_contract_disabled'
          : 'omitted_due_to_low_confidence'
    ),
    community: allow(
      'community',
      input.hasCommunityData &&
        input.sectionStatus.community === 'show' &&
        isAtLeastMedium(evidenceConfidence),
      !input.hasCommunityData
        ? 'omitted_due_to_low_field_completeness'
        : input.sectionStatus.community !== 'show'
          ? 'omitted_due_to_contract_disabled'
          : 'omitted_due_to_low_confidence'
    ),
    platform_integrations: allow(
      'platform_integrations',
      input.hasPlatformData && isAtLeastMedium(evidenceConfidence),
      !input.hasPlatformData
        ? 'omitted_due_to_low_field_completeness'
        : 'omitted_due_to_low_confidence'
    ),
    security: allow(
      'security',
      input.hasSecurityData && hasCheckedDate(input.evidenceContract, 'evidence'),
      !input.hasSecurityData
        ? 'omitted_due_to_low_field_completeness'
        : 'omitted_due_to_missing_checked_date'
    ),
    portability: allow(
      'portability',
      input.hasPortabilityData &&
        isAtLeastMedium(confidenceForField(input.evidenceContract, 'alternatives')),
      !input.hasPortabilityData
        ? 'omitted_due_to_low_field_completeness'
        : 'omitted_due_to_low_confidence'
    ),
  };

  return {
    allowedSections,
    sectionOmissionReasons: reasons,
    sectionReasonCodes: reasonCodes,
  };
}
