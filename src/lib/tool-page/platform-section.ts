interface BuildToolPagePlatformSectionInput {
  platforms: unknown[] | null | undefined;
  integrations: unknown;
}

export function buildToolPagePlatformSectionState(
  input: BuildToolPagePlatformSectionInput
): {
  shouldShow: boolean;
  platforms: unknown[];
  integrations: unknown;
} {
  const platforms = Array.isArray(input.platforms) ? input.platforms : [];
  return {
    shouldShow: platforms.length > 0 || Boolean(input.integrations),
    platforms,
    integrations: input.integrations,
  };
}
