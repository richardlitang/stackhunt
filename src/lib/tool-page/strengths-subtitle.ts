interface BuildToolPageStrengthsSubtitleInput {
  prosConsSourcesCount: number;
  communityCorroborationCount?: number;
}

export function buildToolPageStrengthsSubtitle(input: BuildToolPageStrengthsSubtitleInput): string {
  if (input.prosConsSourcesCount > 0) {
    if ((input.communityCorroborationCount || 0) > 0) {
      return `Evidence-backed pros and cons only, with ${input.communityCorroborationCount} corroborating community domains.`;
    }
    return 'Evidence-backed pros and cons only.';
  }
  return 'Pros and cons will appear after source-backed claims are collected.';
}
