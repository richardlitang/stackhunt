import { describe, expect, it } from 'vitest';
import {
  buildToolPageChromeState,
  buildToolPageChromeStateFromRoute,
} from '@/lib/tool-page/page-chrome-state';

describe('tool page chrome state', () => {
  it('builds chrome state from direct inputs', () => {
    const state = buildToolPageChromeState({
      toolCategory: { slug: 'project-management', name: 'Project Management' },
      hasCollectedSources: true,
      evaluationDepth: 'Light hands-on',
      collectedSourcesTotal: 5,
      trustConfidenceLabel: 'High',
      pendingVerificationCount: 0,
      communityCorroborationCount: 2,
      userSignalCoveragePending: true,
      userSignalNeedsConfirmationCount: 1,
      communityVerifiedLabel: '2026-03-05',
      specsVerifiedLabel: '2026-03-05',
      pricingCheckedLabel: '2026-03-05',
      pricingVerifiedLabel: '2026-03-05',
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

    expect(state.categoryBreadcrumb.href).toBe('/categories/project-management');
    expect(state.trustBarProps.status).toBe('Source-backed');
    expect(state.researchStatusView.communityCorroborationLabel).toContain(
      '2 corroborating community domains'
    );
    expect(state.researchStatusView.userSignalCoverageLabel).toContain(
      'User-reported claim extraction is still pending'
    );
    expect(state.researchStatusView.userSignalNeedsConfirmationLabel).toContain(
      '1 user-reported claims still need corroboration'
    );
  });

  it('builds chrome state from route-level fields', () => {
    const state = buildToolPageChromeStateFromRoute({
      toolCategory: { slug: 'project-management', name: 'Project Management' },
      hasCollectedSources: true,
      evaluationDepth: 'Light hands-on',
      collectedSourcesTotal: 5,
      trustConfidenceLabel: 'High',
      pendingVerificationCount: 1,
      communityCorroborationCount: 1,
      userSignalCoveragePending: false,
      userSignalNeedsConfirmationCount: 0,
      communityVerifiedLabel: '2026-03-05',
      specsVerifiedLabel: '2026-03-05',
      pricingCheckedLabel: '2026-03-05',
      pricingVerifiedLabel: '2026-03-05',
      trustStatus: 'Source-backed',
      website: 'https://example.com',
      websiteHostLabel: 'example.com',
      activeReviewLens: 'startup',
      lensLabelMap: {
        general: 'General',
        personal: 'Solo / Freelancer',
        startup: 'Startup',
        enterprise: 'Enterprise',
      },
    });

    expect(state.reviewInProgressBannerText.length).toBeGreaterThan(0);
    expect(state.lensPriorityLead).toContain('Startup');
    expect(state.researchStatusView.pendingConfirmationLabel).toContain('1 claims');
  });
});
