import { describe, expect, it } from 'vitest';
import { buildToolPageBlueprintRuntimeInputFromRouteData } from '@/lib/tool-page/route-state/blueprint-runtime-input';

describe('tool page blueprint runtime input', () => {
  it('hides buyer decision sections when lane outputs are missing', () => {
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
            { text: 'Free works for one pilot workflow only.' },
            { text: 'Paid needed when approvals and automations are required.' },
            { text: 'Seat growth can trigger a fast tier jump.' },
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

    expect(result.fitMatrix.solo).toBeNull();
    expect(result.fitMatrix.startup).toBeNull();
    expect(result.fitMatrix.midMarket).toBeNull();
    expect(result.fitMatrix.enterprise).toBeNull();
    expect(result.pricingReality?.freeWorksIf).toBeNull();
    expect(result.pricingReality?.paidNeededWhen).toBeNull();
    expect(result.pricingReality?.hiddenCostTriggers).toEqual([]);
    expect(result.pricingReality?.mainCostDrivers).toEqual([]);
    expect(result.beforeYouBuyTests).toEqual([]);
    expect(result.heroDecisionCard.implementationFriction.stakeholders).toEqual([]);
    expect(result.alternativesRebuttals).toEqual([]);
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
            generation_mode: {
              free_works_if: 'deterministic',
              paid_needed_when: 'deterministic',
              hidden_cost_triggers: 'deterministic',
              main_cost_drivers: 'deterministic',
            },
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
          implementation_friction_drivers: ['Role mapping complexity'],
          implementation_friction_stakeholders: ['security', 'operations'],
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
          alternatives_rebuttals: [
            {
              slug: 'budgetflow',
              tool_name: 'BudgetFlow',
              choose_instead_if: 'Budget predictability is mandatory',
              differentiator: 'cheaper_at_scale',
              confidence: 'high',
            },
          ],
          generation_mode: {
            main_risk: 'deterministic',
            upgrade_trigger: 'deterministic',
            implementation_friction: 'deterministic',
            fit_matrix: 'deterministic',
            test_before_buy: 'deterministic',
            alternatives_rebuttals: 'extractive',
          },
        },
      },
    });

    expect(result.heroDecisionCard.mainRisk).toBe('Lane risk');
    expect(result.heroDecisionCard.upgradeTrigger).toBe('Lane upgrade');
    expect(result.heroDecisionCard.implementationFriction.level).toBe('high');
    expect(result.fitMatrix.solo?.reason).toBe('Lane reason');
    expect(result.pricingReality?.freeWorksIf).toBe('Lane free condition');
    expect(result.beforeYouBuyTests[0].name).toBe('Lane test');
    expect(result.heroDecisionCard.implementationFriction.drivers[0]).toBe(
      'Role mapping complexity'
    );
    expect(result.heroDecisionCard.implementationFriction.stakeholders[0]).toBe('security');
    expect(result.alternativesRebuttals[0].toolName).toBe('BudgetFlow');
    expect(result.alternativesRebuttals[0].differentiator).toBe('Cheaper at scale');
  });
});
