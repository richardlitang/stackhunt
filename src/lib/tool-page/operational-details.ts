interface BuildToolPageOperationalDetailsStateInput {
  hasSecurity: boolean;
  hasPortability: boolean;
  hasKnowledgeCard: boolean;
  hasParentTool: boolean;
  hasSupport: boolean;
  hasSecurityData: boolean;
  hasPortabilityData: boolean;
}

export function buildToolPageOperationalDetailsState(
  input: BuildToolPageOperationalDetailsStateInput
): {
  showCompanyInfo: boolean;
  showSuiteNavigation: boolean;
  showSecurity: boolean;
  showSupport: boolean;
  showPortability: boolean;
} {
  return {
    showCompanyInfo: input.hasKnowledgeCard,
    showSuiteNavigation: input.hasParentTool,
    showSecurity: input.hasSecurity && input.hasSecurityData,
    showSupport: input.hasSupport,
    showPortability: input.hasPortability && input.hasPortabilityData,
  };
}
