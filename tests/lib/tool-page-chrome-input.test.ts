import { describe, expect, it } from 'vitest';
import {
  buildToolPageChromeStateInputFromRoute,
  buildToolPageChromeStateInputFromRouteContext,
} from '@/lib/tool-page/chrome-input';

describe('tool page chrome input', () => {
  it('maps route fields into chrome state input', () => {
    const result = buildToolPageChromeStateInputFromRoute({
      toolCategory: { slug: 'project-management', name: 'Project Management' },
      hasCollectedSources: true,
      evaluationDepth: 'Light hands-on',
      collectedSourcesTotal: 14,
      trustConfidenceLabel: 'High',
      pendingVerificationCount: 2,
      communityCorroborationCount: 4,
      userSignalCoveragePending: true,
      communityVerifiedLabel: '2026-03-05',
      specsVerifiedLabel: '2026-03-04',
      pricingCheckedLabel: '2026-03-03',
      pricingVerifiedLabel: '2026-03-03',
      trustStatus: 'Source-backed',
      website: 'https://example.com',
      websiteHostLabel: 'example.com',
      activeReviewLens: 'general',
      lensLabelMap: {
        general: 'General',
        personal: 'Solo / Freelancer',
        startup: 'Startup',
        enterprise: 'Enterprise',
      },
    });

    expect(result.toolCategory?.slug).toBe('project-management');
    expect(result.trustConfidenceLabel).toBe('High');
    expect(result.pendingVerificationCount).toBe(2);
    expect(result.communityCorroborationCount).toBe(4);
    expect(result.userSignalCoveragePending).toBe(true);
    expect(result.activeReviewLens).toBe('general');
  });

  it('maps flattened route context into chrome state input', () => {
    const result = buildToolPageChromeStateInputFromRouteContext({
      toolCategory: { slug: 'project-management', name: 'Project Management' },
      hasCollectedSources: true,
      evaluationDepth: 'Light hands-on',
      collectedSourcesTotal: 14,
      trustConfidenceLabel: 'High',
      pendingVerificationCount: 2,
      communityCorroborationCount: 3,
      userSignalCoveragePending: false,
      communityVerifiedLabel: '2026-03-05',
      specsVerifiedLabel: '2026-03-04',
      pricingCheckedLabel: '2026-03-03',
      pricingVerifiedLabel: '2026-03-03',
      trustStatus: 'Source-backed',
      activeReviewLens: 'general',
      lensLabelMap: {
        general: 'General',
        personal: 'Solo / Freelancer',
        startup: 'Startup',
        enterprise: 'Enterprise',
      },
      tool: { website: 'https://example.com' },
      websiteHostLabel: 'example.com',
    });

    expect(result.website).toBe('https://example.com');
    expect(result.pendingVerificationCount).toBe(2);
    expect(result.communityCorroborationCount).toBe(3);
    expect(result.userSignalCoveragePending).toBe(false);
    expect(result.activeReviewLens).toBe('general');
  });
});
