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
      laneOutputs: null,
    });

    expect(result.fitMatrix.solo?.fit).toBe('mixed');
    expect(result.fitMatrix.startup?.fit).toBe('strong');
    expect(result.pricingReality?.freeWorksIf).toBe('Free works for one pilot workflow only.');
    expect(result.pricingReality?.paidNeededWhen).toContain('Upgrade');
    expect(result.beforeYouBuyTests).toHaveLength(3);
    expect(result.beforeYouBuyTests[0].name).toBe('Daily workflow test');
    expect(result.beforeYouBuyTests[2].name).toBe('Failure and export test');
  });

  it('prefers lane-native decision fields when available', () => {
    const result = buildToolPageBlueprintRuntimeInputFromRouteData({
      activeReviewLens: 'general',
      lensHrefs: {
        general: '/tool/acme',
        personal: '/tool/acme?lens=personal',
        startup: '/tool/acme?lens=startup',
        enterprise: '/tool/acme?lens=enterprise',
      },
      chromeState: {
        trustBarProps: {
          status: 'Source-backed',
          confidence: 'High',
          lastChecked: '2026-03-19',
          pendingCount: 0,
          evaluationDepth: 'Deep hands-on',
          sourcesCount: 22,
        },
        gettingStartedProps: {
          setupComplexity: 'High',
          toolName: 'Acme',
          hasApi: true,
          websiteUrl: 'https://example.com',
          setupTracks: [],
          setupUrl: null,
        },
      } as never,
      decisionState: {
        decisionUtilityState: {
          decisionUseIf: 'Fallback best-for',
          decisionAvoidIf: 'Fallback not-for',
          decisionWatchOut: 'Fallback risk',
          decisionUpgradeTrigger: 'Fallback upgrade trigger',
          pricingMentalModelItems: [],
          testChecklistItems: ['Fallback checklist item'],
        },
      } as never,
      navigationState: {
        quickJumpLinksView: [{ href: '#verdict', label: 'Risks' }],
      },
      laneOutputs: {
        subject_profile: {
          subject_type: 'product',
          subject_key: 'acme:core',
          display_name: 'Acme',
          entity_scope: 'core',
          confidence: 'high',
        },
        fact_sheet: {
          official_facts: [],
          official_pricing_facts: [],
          official_limit_facts: [],
          pricing_reality: {
            free_works_if: 'Lane free condition',
            paid_needed_when: 'Lane paid trigger',
            hidden_cost_triggers: ['Lane hidden trigger'],
            main_cost_drivers: ['Lane cost driver'],
          },
        },
        user_signal_sheet: {
          user_signal_pros: [],
          user_signal_cons: [],
        },
        editorial_decision: {
          summary: null,
          best_for: null,
          not_for: null,
          main_tradeoff: null,
          human_verdict: null,
          main_risk: 'Lane risk',
          upgrade_trigger: 'Lane upgrade',
          implementation_friction_level: 'high',
          fit_matrix: {
            solo: { fit: 'strong', caveat: 'Lane caveat', reason: 'Lane reason' },
            startup: null,
            mid_market: null,
            enterprise: null,
          },
          test_before_buy: [
            {
              name: 'Lane test',
              why_it_matters: 'Lane why',
              test: 'Lane action',
              pass_condition: 'Lane pass',
              common_failure: 'Lane fail',
            },
          ],
        },
      },
    });

    expect(result.heroDecisionCard.mainRisk).toBe('Lane risk');
    expect(result.heroDecisionCard.upgradeTrigger).toBe('Lane upgrade');
    expect(result.heroDecisionCard.implementationFriction.level).toBe('high');
    expect(result.fitMatrix.solo?.reason).toBe('Lane reason');
    expect(result.pricingReality?.freeWorksIf).toBe('Lane free condition');
    expect(result.beforeYouBuyTests[0].name).toBe('Lane test');
  });
});
