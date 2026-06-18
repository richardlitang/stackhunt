import { describe, expect, it } from 'vitest';
import { evaluateStrictPublishGate } from '@/lib/review-publish-gate';

function baseItem(overrides: Record<string, unknown> = {}): any {
  return {
    id: 'item-1',
    metadata: {
      smp_pricing: {
        pricing_page_url: 'https://example.com/pricing',
      },
    },
    specs: {
      canonical: {
        quality: {
          required_sections_complete: true,
          conflicts_count: 0,
          score: 120,
          noindex_reasons: [],
        },
      },
    },
    pricing_verified_at: '2026-03-01T00:00:00.000Z',
    pricing_confidence: 'high',
    short_description:
      'Tool for lifecycle email automation, segmentation, and campaign analytics with source-backed setup details.',
    verdict:
      'If you need fast onboarding and simple automations, choose this. If enterprise SSO is mandatory on day one, avoid and switch to a stricter enterprise stack.',
    updated_at: '2026-03-01T00:00:00.000Z',
    ...overrides,
  };
}

function baseReview(overrides: Record<string, unknown> = {}): any {
  return {
    summary_markdown:
      'If you need quick campaign launch with reliable templates, choose this platform. If you need strict contract controls on day one, avoid and pick an enterprise-first alternative.',
    cons: [
      {
        text: 'Priority support requires higher plan tiers.',
        source_url: 'https://example.com/pricing',
        checked_at: '2026-03-01T00:00:00.000Z',
        scope: 'teams over 10 seats',
        volatility: 'medium',
      },
    ],
    sources: [
      { source_type: 'official', url: 'https://example.com/pricing' },
      { source_type: 'official', url: 'https://example.com/help/getting-started' },
      { source_type: 'official', url: 'https://example.com/docs/api' },
    ],
    ...overrides,
  };
}

describe('review publish gate copy quality', () => {
  it('blocks generic filler copy and missing scenario recommendations', () => {
    const result = evaluateStrictPublishGate(
      baseItem({
        verdict: 'Great tool for teams.',
        short_description: 'Solid choice for growing companies.',
      }),
      baseReview({
        summary_markdown: 'This is a powerful platform with an intuitive interface that helps you.',
      })
    );

    expect(result.blockers).toContain('strict:copy_missing_scenario_recommendation');
    expect(result.blockers.some((b) => b.startsWith('strict:copy_contains_generic_filler:'))).toBe(
      true
    );
    expect(result.metrics.genericPhraseCount).toBeGreaterThan(0);
    expect(result.pass).toBe(false);
  });

  it('passes copy gate when scenario guidance is concrete and specific', () => {
    const result = evaluateStrictPublishGate(baseItem(), baseReview());

    expect(result.blockers).not.toContain('strict:copy_missing_scenario_recommendation');
    expect(result.metrics.scenarioRecommendationCount).toBeGreaterThan(0);
    expect(result.metrics.copyQualityScore).toBeGreaterThanOrEqual(60);
  });

  it('accepts decision language that does not use "if ... choose" phrasing', () => {
    const result = evaluateStrictPublishGate(
      baseItem({
        verdict:
          'Best for teams shipping weekly campaigns with fewer than 5 approval layers. Not for teams requiring strict pre-send legal review gates.',
      }),
      baseReview({
        summary_markdown:
          'Best for SMB teams that need rapid launch and basic segmentation. Avoid if you need SOC 2 controls on every seat. Switch when your workflow requires locked-down role approvals.',
      })
    );

    expect(result.blockers).not.toContain('strict:copy_missing_scenario_recommendation');
    expect(result.metrics.scenarioRecommendationCount).toBeGreaterThan(0);
  });

  it('does not trigger pricing QA blocker when no pricing claim is asserted', () => {
    const result = evaluateStrictPublishGate(
      baseItem({
        pricing_verified_at: null,
        short_description: 'Workflow automation for support teams.',
        verdict:
          'Best for teams that need quick campaign workflows. Avoid if strict legal approvals are required at each step.',
      }),
      baseReview({
        summary_markdown:
          'Best for teams launching campaigns quickly with lightweight approval flows. Avoid if you need enterprise legal controls in week one.',
        cons: [
          {
            text: 'Advanced workflow branching takes manual setup.',
            source_url: 'https://example.com/help/getting-started',
            checked_at: '2026-03-01T00:00:00.000Z',
            scope: 'teams with custom automations',
            volatility: 'medium',
          },
        ],
      })
    );

    expect(result.blockers).not.toContain('strict:qa_gate:pricing_visible_without_checked_proof');
  });

  it('triggers pricing QA blocker when pricing claims are present without proof', () => {
    const result = evaluateStrictPublishGate(
      baseItem({
        pricing_verified_at: null,
        metadata: {},
      }),
      baseReview({
        summary_markdown:
          'Best for teams under 10 seats at $20/month. Avoid if you need advanced governance on entry tiers.',
        cons: [
          {
            text: 'Starter plan costs $20/month and adds seat charges after 10 users.',
            scope: 'starter plan, monthly billing',
            volatility: 'high',
          },
        ],
        sources: [
          { source_type: 'official', url: 'https://example.com/help/getting-started' },
          { source_type: 'official', url: 'https://example.com/docs/api' },
        ],
      })
    );

    expect(result.blockers).toContain('strict:qa_gate:pricing_visible_without_checked_proof');
  });

  it('blocks contradictory lane decision signals when lane outputs are present', () => {
    const result = evaluateStrictPublishGate(
      baseItem({
        specs: {
          canonical: {
            quality: {
              required_sections_complete: true,
              conflicts_count: 0,
              score: 120,
              noindex_reasons: [],
            },
            entity_first_lane_outputs: {
              subject_profile: {
                subject_type: 'product',
                subject_key: 'tool:acme',
                display_name: 'Acme',
                entity_scope: 'core',
                confidence: 'high',
              },
              fact_sheet: {
                official_facts: [
                  {
                    text: 'Enterprise tier includes SSO and SCIM.',
                    source_type: 'official',
                    source_url: 'https://example.com/security',
                  },
                ],
                official_pricing_facts: [],
                official_limit_facts: [],
                pricing_reality: {
                  free_works_if: 'Entry tier supports two tracked projects during pilot.',
                  paid_needed_when: 'Entry tier supports two tracked projects during pilot.',
                  hidden_cost_triggers: [],
                  main_cost_drivers: [],
                  generation_mode: {
                    free_works_if: 'deterministic',
                    paid_needed_when: 'deterministic',
                  },
                },
              },
              user_signal_sheet: {
                user_signal_pros: [],
                user_signal_cons: [],
              },
              editorial_decision: {
                best_for: 'That need enterprise controls without rollout planning',
                not_for: null,
                main_tradeoff: null,
                summary: null,
                human_verdict: null,
                main_risk: null,
                upgrade_trigger: null,
                implementation_friction_level: 'medium',
                fit_matrix: {
                  solo: { fit: 'mixed', reason: 'Same', caveat: 'Same' },
                  startup: { fit: 'mixed', reason: 'Same', caveat: 'Same' },
                  mid_market: null,
                  enterprise: { fit: 'weak', reason: 'Same', caveat: 'Same' },
                },
                test_before_buy: [],
                alternatives_rebuttals: [],
                generation_mode: {
                  best_for: 'deterministic',
                  fit_matrix: 'deterministic',
                },
              },
            },
          },
        },
      }),
      baseReview()
    );

    expect(result.blockers).toContain('strict:qa_gate:malformed_decision_layer_signal');
    expect(result.blockers).toContain('strict:qa_gate:duplicate_pricing_reality_signal');
    expect(result.blockers).toContain('strict:qa_gate:duplicate_fit_matrix_rows_signal');
    expect(result.blockers).toContain('strict:qa_gate:enterprise_fit_contradiction_signal');
  });
});
