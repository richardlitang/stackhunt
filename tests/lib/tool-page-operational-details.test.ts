import { describe, expect, it } from 'vitest';
import { buildToolPageOperationalDetailsState } from '@/lib/tool-page/operational-details';

describe('tool page operational details state', () => {
  it('builds visibility flags based on section state and data presence', () => {
    const result = buildToolPageOperationalDetailsState({
      hasSecurity: true,
      hasPortability: true,
      hasKnowledgeCard: true,
      hasParentTool: false,
      hasSupport: true,
      hasSecurityData: true,
      hasPortabilityData: false,
    });

    expect(result).toEqual({
      showCompanyInfo: true,
      showSuiteNavigation: false,
      showSecurity: true,
      showSupport: true,
      showPortability: false,
    });
  });
});
