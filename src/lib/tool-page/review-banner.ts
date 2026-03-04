interface BuildToolPageReviewBannerTextInput {
  hasCollectedSources: boolean;
}

export function buildToolPageReviewBannerText(
  input: BuildToolPageReviewBannerTextInput
): string {
  if (input.hasCollectedSources) {
    return 'This page is being reviewed. Claims are source-backed, but final editorial verification is still in progress.';
  }

  return 'This page is being reviewed. Source collection is still in progress before final editorial verification.';
}
