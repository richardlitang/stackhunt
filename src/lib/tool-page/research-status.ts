interface BuildToolPageResearchStatusInput {
  evaluationDepth: string;
  collectedSourcesTotal: number;
  trustConfidenceLabel: string;
  pendingVerificationCount: number;
  communityCorroborationCount?: number;
  userSignalCoveragePending?: boolean;
  communityVerifiedLabel: string | null;
  specsVerifiedLabel: string | null;
  pricingCheckedLabel: string | null;
}

export interface ToolPageResearchStatusView {
  reviewMethodLabel: string;
  linkedSourcesLabel: string;
  pendingConfirmationLabel: string | null;
  communityCorroborationLabel: string | null;
  userSignalCoverageLabel: string | null;
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
    communityCorroborationLabel:
      (input.communityCorroborationCount || 0) > 0
        ? `${input.communityCorroborationCount} corroborating community domains`
        : null,
    userSignalCoverageLabel: input.userSignalCoveragePending
      ? 'User-reported claim extraction is still pending for community sources'
      : null,
    lastCheckedLabel:
      input.communityVerifiedLabel ||
      input.specsVerifiedLabel ||
      input.pricingCheckedLabel ||
      'unknown',
  };
}
