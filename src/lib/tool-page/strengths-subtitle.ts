interface BuildToolPageStrengthsSubtitleInput {
  prosConsSourcesCount: number;
}

export function buildToolPageStrengthsSubtitle(
  input: BuildToolPageStrengthsSubtitleInput
): string {
  return input.prosConsSourcesCount > 0
    ? 'Evidence-backed pros and cons only.'
    : 'Pros and cons will appear after source-backed claims are collected.';
}
