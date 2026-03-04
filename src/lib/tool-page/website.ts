interface BuildToolPageWebsiteStateInput {
  website: string | null | undefined;
}

export function buildToolPageWebsiteState(input: BuildToolPageWebsiteStateInput): {
  hasWebsite: boolean;
} {
  return {
    hasWebsite: Boolean(input.website),
  };
}
