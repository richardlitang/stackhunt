interface BuildToolPageResearchStatusInput {
  evaluationDepth: string;
  collectedSourcesTotal: number;
  trustConfidenceLabel: string;
  pendingVerificationCount: number;
  communityVerifiedLabel: string | null;
  specsVerifiedLabel: string | null;
  pricingCheckedLabel: string | null;
}

export interface ToolPageResearchStatusView {
  reviewMethodLabel: string;
  linkedSourcesLabel: string;
  pendingConfirmationLabel: string | null;
  lastCheckedLabel: string;
}

export function buildToolPageResearchStatusView(
  input: BuildToolPageResearchStatusInput
): ToolPageResearchStatusView {
  return {
    reviewMethodLabel: `${input.evaluationDepth} review method`,
    linkedSourcesLabel: `${input.collectedSourcesTotal} linked sources (${input.trustConfidenceLabel} confidence)`,
    pendingConfirmationLabel:
      input.pendingVerificationCount > 0
        ? `${input.pendingVerificationCount} claims still pending confirmation`
        : null,
    lastCheckedLabel:
      input.communityVerifiedLabel || input.specsVerifiedLabel || input.pricingCheckedLabel || 'unknown',
  };
}
