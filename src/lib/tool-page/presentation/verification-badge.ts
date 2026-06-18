interface BuildToolPageVerificationBadgeInput {
  hasCollectedSources: boolean;
}

export function buildToolPageVerificationBadgeLabel(
  input: BuildToolPageVerificationBadgeInput
): string {
  return input.hasCollectedSources ? 'Verified sources' : 'Verified';
}
