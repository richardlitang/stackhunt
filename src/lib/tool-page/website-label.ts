interface BuildToolPageWebsiteLabelInput {
  websiteHostLabel: string | null;
}

export function buildToolPageWebsiteLabel(input: BuildToolPageWebsiteLabelInput): string {
  return input.websiteHostLabel || 'Official site';
}
