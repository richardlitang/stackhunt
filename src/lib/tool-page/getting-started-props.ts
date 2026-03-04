interface BuildToolPageGettingStartedPropsInput {
  setupComplexity: string | null | undefined;
  hasApi: boolean;
  websiteUrl: string | null;
  fallbackWebsiteUrl: string | null;
  setupTracks: unknown[];
  setupUrl: string | null;
  toolName: string;
}

export interface ToolPageGettingStartedProps {
  setupComplexity: string | null | undefined;
  hasApi: boolean;
  websiteUrl: string | null;
  setupTracks: unknown[];
  setupUrl: string | null;
  toolName: string;
}

export function buildToolPageGettingStartedProps(
  input: BuildToolPageGettingStartedPropsInput
): ToolPageGettingStartedProps {
  return {
    setupComplexity: input.setupComplexity,
    hasApi: input.hasApi,
    websiteUrl: input.websiteUrl || input.fallbackWebsiteUrl,
    setupTracks: input.setupTracks,
    setupUrl: input.setupUrl,
    toolName: input.toolName,
  };
}
