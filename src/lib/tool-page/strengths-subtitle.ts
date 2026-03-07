interface BuildToolPageStrengthsSubtitleInput {
  prosConsSourcesCount: number;
  communityCorroborationCount?: number;
  userSignalClaimsCount?: number;
}

export function buildToolPageStrengthsSubtitle(input: BuildToolPageStrengthsSubtitleInput): string {
  if (input.prosConsSourcesCount > 0) {
    const hasUserSignalClaims = (input.userSignalClaimsCount || 0) > 0;
    if ((input.communityCorroborationCount || 0) > 0) {
      if (hasUserSignalClaims) {
        return `Evidence-backed pros and cons only, with ${input.communityCorroborationCount} corroborating community domains and ${input.userSignalClaimsCount} user-reported signals.`;
      }
      return `Evidence-backed pros and cons only, with ${input.communityCorroborationCount} corroborating community domains.`;
    }
    if (hasUserSignalClaims) {
      return `Evidence-backed pros and cons only, including ${input.userSignalClaimsCount} user-reported signals.`;
    }
    return 'Evidence-backed pros and cons only.';
  }
  return 'Pros and cons will appear after source-backed claims are collected.';
}
