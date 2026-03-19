import { describe, expect, it } from 'vitest';
import { buildToolPageBlueprintRuntimeInputFromRouteData } from '@/lib/tool-page/blueprint-runtime-input';

describe('tool page blueprint runtime input', () => {
  it('builds fit matrix, pricing reality, and exactly three before-you-buy tests', () => {
    const result = buildToolPageBlueprintRuntimeInputFromRouteData({
      activeReviewLens: 'startup',
      lensHrefs: {
        general: '/tool/acme',
        personal: '/tool/acme?lens=personal',
        startup: '/tool/acme?lens=startup',
        enterprise: '/tool/acme?lens=enterprise',
      },
      chromeState: {
        trustBarProps: {
          status: 'Source-backed',
          confidence: 'Medium',
          lastChecked: '2026-03-19',
          pendingCount: 1,
          evaluationDepth: 'Light hands-on',
          sourcesCount: 12,
        },
        gettingStartedProps: {
          setupComplexity: 'Medium',
          toolName: 'Acme',
          hasApi: true,
          websiteUrl: 'https://example.com',
          setupTracks: [],
          setupUrl: null,
        },
      } as never,
      decisionState: {
        decisionUtilityState: {
          decisionUseIf: 'Strong for teams with clear handoff ownership.',
          decisionAvoidIf: 'Weak when strict governance is non-negotiable on day one.',
          decisionWatchOut: 'Role and approval depth can be plan-gated.',
          decisionUpgradeTrigger: 'Upgrade when approvals and automation depth become blockers.',
          pricingMentalModelItems: [
            { text: 'Free works for one pilot workflow only.', status: 'Source-backed' },
            { text: 'Paid needed when approvals and automations are required.', status: 'Source-backed' },
            { text: 'Seat growth can trigger a fast tier jump.', status: 'Needs confirmation' },
          ],
          testChecklistItems: [
            'Run one daily workflow end to end.',
            'Validate role permissions with two users.',
            'Export critical data and test rollback.',
            'Extra check that should be trimmed.',
          ],
        },
      } as never,
      navigationState: {
        quickJumpLinksView: [{ href: '#pricing-plans', label: 'Pricing' }],
      },
    });

    expect(result.fitMatrix.solo?.fit).toBe('mixed');
    expect(result.fitMatrix.startup?.fit).toBe('strong');
    expect(result.pricingReality?.freeWorksIf).toBe('Free works for one pilot workflow only.');
    expect(result.pricingReality?.paidNeededWhen).toContain('Upgrade');
    expect(result.beforeYouBuyTests).toHaveLength(3);
    expect(result.beforeYouBuyTests[0].name).toBe('Daily workflow test');
    expect(result.beforeYouBuyTests[2].name).toBe('Failure and export test');
  });
});

