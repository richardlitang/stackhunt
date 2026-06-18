export type ToolPageTrustStatus = 'Source-backed' | 'Needs confirmation';
export type ToolPageTrustConfidence = 'High' | 'Medium' | 'Low';
export type ToolPageContentConfidence = 'high' | 'medium' | 'low';
export type ToolPageEvidenceGrade = 'A' | 'B' | 'C';

export interface ToolPageUpdateHistoryEntry {
  date: string;
  what: string;
  why: string;
  source: string | null;
}

export interface BuildToolPageTrustViewModelInput {
  hasCollectedSources: boolean;
  isVerificationMode: boolean;
  pendingVerificationCount: number;
  contentConfidenceLevel: ToolPageContentConfidence;
  hasPricingCheckedProof: boolean;
  pricingCheckedLabel: string | null;
  pricingSourceUrl: string | null;
  specsVerifiedLabel: string | null;
  officialDocsSourceUrl: string | null;
  communityVerifiedLabel: string | null;
  officialPricingSourceUrl: string | null;
}

export interface ToolPageTrustViewModel {
  trustStatus: ToolPageTrustStatus;
  trustConfidenceLabel: ToolPageTrustConfidence;
  updateHistoryEntries: ToolPageUpdateHistoryEntry[];
}

export interface DeriveToolPageEvidenceStateInput {
  baseEvidenceGrade: ToolPageEvidenceGrade;
  pendingVerificationCount: number;
}

export interface ToolPageEvidenceState {
  evidenceGrade: ToolPageEvidenceGrade;
  isVerificationMode: boolean;
}

export interface VerificationFlagItem {
  unverified?: boolean | null;
}

export function countPendingVerifications(
  items: Array<VerificationFlagItem | null | undefined>
): number {
  return items.filter((item) => item?.unverified).length;
}

export function deriveToolPageEvidenceState(
  input: DeriveToolPageEvidenceStateInput
): ToolPageEvidenceState {
  const evidenceGrade =
    input.baseEvidenceGrade === 'A' && input.pendingVerificationCount > 0
      ? 'B'
      : input.baseEvidenceGrade;

  return {
    evidenceGrade,
    isVerificationMode: evidenceGrade === 'C' || input.pendingVerificationCount > 0,
  };
}

export function buildToolPageTrustViewModel(
  input: BuildToolPageTrustViewModelInput
): ToolPageTrustViewModel {
  const trustStatus: ToolPageTrustStatus =
    !input.hasCollectedSources || input.isVerificationMode || input.pendingVerificationCount > 0
      ? 'Needs confirmation'
      : 'Source-backed';

  const trustConfidenceLabelBase: ToolPageTrustConfidence =
    input.contentConfidenceLevel === 'high'
      ? 'High'
      : input.contentConfidenceLevel === 'medium'
        ? 'Medium'
        : 'Low';

  const trustConfidenceLabel: ToolPageTrustConfidence =
    !input.hasCollectedSources || input.pendingVerificationCount > 0 || input.isVerificationMode
      ? trustConfidenceLabelBase === 'High'
        ? 'Medium'
        : trustConfidenceLabelBase
      : trustConfidenceLabelBase;

  const updateHistoryEntries = [
    input.hasPricingCheckedProof && input.pricingCheckedLabel
      ? {
          date: input.pricingCheckedLabel,
          what: 'Pricing references rechecked',
          why: 'Pricing is volatile and can change frequently',
          source: input.pricingSourceUrl || null,
        }
      : null,
    input.specsVerifiedLabel
      ? {
          date: input.specsVerifiedLabel,
          what: 'Product docs and specs refreshed',
          why: 'Feature and setup claims require current docs',
          source: input.officialDocsSourceUrl || null,
        }
      : null,
    input.communityVerifiedLabel
      ? {
          date: input.communityVerifiedLabel,
          what: 'Editorial verdict and tradeoffs updated',
          why: 'Recommendation language aligned to latest source-backed claims',
          source: input.officialDocsSourceUrl || input.officialPricingSourceUrl || null,
        }
      : null,
  ].filter((entry): entry is ToolPageUpdateHistoryEntry => Boolean(entry));

  return {
    trustStatus,
    trustConfidenceLabel,
    updateHistoryEntries,
  };
}
