import {
  buildToolPageTrustViewModel,
  countPendingVerifications,
  deriveToolPageEvidenceState,
  type ToolPageContentConfidence,
  type ToolPageEvidenceGrade,
  type ToolPageUpdateHistoryEntry,
} from '@/lib/tool-page/trust';

interface BuildToolPageTrustRuntimeInput {
  baseEvidenceGrade: ToolPageEvidenceGrade;
  verificationItems: Array<{ unverified?: boolean | null } | null | undefined>;
  hasCollectedSources: boolean;
  contentConfidenceLevel: ToolPageContentConfidence;
  hasPricingCheckedProof: boolean;
  pricingCheckedLabel: string | null;
  pricingSourceUrl: string | null;
  specsVerifiedLabel: string | null;
  officialDocsSourceUrl: string | null;
  communityVerifiedLabel: string | null;
  officialPricingSourceUrl: string | null;
}

export interface ToolPageTrustRuntime {
  pendingVerificationCount: number;
  evidenceGrade: ToolPageEvidenceGrade;
  isVerificationMode: boolean;
  trustStatus: 'Source-backed' | 'Needs confirmation';
  trustConfidenceLabel: 'High' | 'Medium' | 'Low';
  updateHistoryEntries: ToolPageUpdateHistoryEntry[];
}

export function buildToolPageTrustRuntime(input: BuildToolPageTrustRuntimeInput): ToolPageTrustRuntime {
  const pendingVerificationCount = countPendingVerifications(input.verificationItems);
  const evidenceState = deriveToolPageEvidenceState({
    baseEvidenceGrade: input.baseEvidenceGrade,
    pendingVerificationCount,
  });
  const trustViewModel = buildToolPageTrustViewModel({
    hasCollectedSources: input.hasCollectedSources,
    isVerificationMode: evidenceState.isVerificationMode,
    pendingVerificationCount,
    contentConfidenceLevel: input.contentConfidenceLevel,
    hasPricingCheckedProof: input.hasPricingCheckedProof,
    pricingCheckedLabel: input.pricingCheckedLabel,
    pricingSourceUrl: input.pricingSourceUrl,
    specsVerifiedLabel: input.specsVerifiedLabel,
    officialDocsSourceUrl: input.officialDocsSourceUrl,
    communityVerifiedLabel: input.communityVerifiedLabel,
    officialPricingSourceUrl: input.officialPricingSourceUrl,
  });

  return {
    pendingVerificationCount,
    evidenceGrade: evidenceState.evidenceGrade,
    isVerificationMode: evidenceState.isVerificationMode,
    trustStatus: trustViewModel.trustStatus,
    trustConfidenceLabel: trustViewModel.trustConfidenceLabel,
    updateHistoryEntries: trustViewModel.updateHistoryEntries,
  };
}
