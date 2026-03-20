import { describe, expect, it } from 'vitest';
import { buildToolPageBlueprintRuntimeFromRouteData } from '@/lib/tool-page/blueprint-runtime';

describe('tool page blueprint runtime', () => {
  it('returns buyer decision layer with three tests max and lane-native rebuttals', () => {
    const result = buildToolPageBlueprintRuntimeFromRouteData({
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
          confidence: 'High',
          lastChecked: '2026-03-20',
          pendingCount: 0,
          evaluationDepth: 'Deep hands-on',
          sourcesCount: 14,
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
          decisionUpgradeTrigger: 'Fallback trigger',
          pricingMentalModelItems: [],
          testChecklistItems: ['A', 'B', 'C', 'D'],
        },
      } as never,
      navigationState: {
        quickJumpLinksView: [{ href: '#pricing-plans', label: 'Pricing' }],
      },
      allowedAlternativeSlugs: ['budgetflow'],
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
            free_works_if: 'Free works for pilots.',
            paid_needed_when: 'Paid needed for approvals.',
            hidden_cost_triggers: ['Seat growth'],
            main_cost_drivers: ['Per-seat pricing'],
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
          upgrade_trigger: 'Lane upgrade trigger',
          implementation_friction_level: 'high',
          implementation_friction_drivers: ['Role mapping'],
          implementation_friction_stakeholders: ['security'],
          fit_matrix: null,
          test_before_buy: [
            {
              name: 'Daily workflow test',
              why_it_matters: 'Daily fit',
              test: 'Run daily flow',
              pass_condition: 'No blocker',
              common_failure: 'Role mismatch',
            },
            {
              name: 'Admin setup test',
              why_it_matters: 'Admin fit',
              test: 'Configure roles',
              pass_condition: 'Roles map',
              common_failure: 'Policy mismatch',
            },
            {
              name: 'Failure/export test',
              why_it_matters: 'Portability',
              test: 'Export all records',
              pass_condition: 'Complete export',
              common_failure: 'Missing data',
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
        },
      },
    });

    expect(result.buyerDecisionLayer.beforeYouBuyTests).toHaveLength(3);
    expect(result.buyerDecisionLayer.heroDecisionCard.mainRisk).toBe('Lane risk');
    expect(result.buyerDecisionLayer.heroDecisionCard.implementationFriction.stakeholders).toEqual([
      'Security',
    ]);
    expect(result.buyerDecisionLayer.alternativesRebuttals[0].toolName).toBe('BudgetFlow');
    expect(result.buyerDecisionLayer.alternativesRebuttals[0].differentiator).toBe(
      'Cheaper at scale'
    );
  });

  it('drops alternatives rebuttals outside comparable slug set', () => {
    const result = buildToolPageBlueprintRuntimeFromRouteData({
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
          lastChecked: '2026-03-20',
          pendingCount: 0,
          evaluationDepth: 'Deep hands-on',
          sourcesCount: 14,
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
          decisionUpgradeTrigger: 'Fallback trigger',
          pricingMentalModelItems: [],
          testChecklistItems: ['A', 'B', 'C'],
        },
      } as never,
      navigationState: {
        quickJumpLinksView: [{ href: '#pricing-plans', label: 'Pricing' }],
      },
      allowedAlternativeSlugs: ['other-tool'],
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
          pricing_reality: null,
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
          implementation_friction_level: 'medium',
          implementation_friction_drivers: [],
          implementation_friction_stakeholders: [],
          fit_matrix: null,
          test_before_buy: [],
          alternatives_rebuttals: [
            {
              slug: 'budgetflow',
              tool_name: 'BudgetFlow',
              choose_instead_if: 'Budget predictability is mandatory',
              differentiator: 'cheaper_at_scale',
              confidence: 'high',
            },
          ],
        },
      },
    });

    expect(result.buyerDecisionLayer.alternativesRebuttals).toHaveLength(0);
  });
});
