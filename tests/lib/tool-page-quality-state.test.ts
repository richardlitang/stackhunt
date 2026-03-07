import { describe, expect, it } from 'vitest';
import { buildToolPageQualityState } from '@/lib/tool-page/quality-state';

describe('tool page quality state', () => {
  it('merges persisted quality overrides and computes draft/index flags', () => {
    const tool = {
      name: 'Acme',
      short_description:
        'Acme helps teams automate workflows with clear controls and auditability.',
      metadata: { features: { core: ['Automation'] } },
      specs: {
        user_reported_pros: [{ text: 'Users report fast setup' }],
        user_reported_cons: [{ text: 'Users report some onboarding friction' }],
      },
      learning_curve: 'hours',
      avg_score: 80,
      review_count: 2,
      view_count: 100,
    } as any;
    const firstReview = {
      status: 'published',
      updated_at: '2026-03-01T00:00:00.000Z',
      created_at: '2026-03-01T00:00:00.000Z',
      summary_markdown: 'Strong operational fit with caveats.',
      pros: ['Fast setup'],
      cons: ['Needs admin ownership'],
      sources: [{ url: 'https://example.com/docs' }],
      score: 75,
    } as any;

    const result = buildToolPageQualityState({
      tool,
      firstReview,
      reviewSelection: {
        hasPublishedReview: true,
        hasDraftReview: false,
      },
      persistedQuality: {
        should_index: false,
        noindex_reasons: ['missing_required_sections'],
        evidence_counts: {
          community_domains: 4,
        },
        section_status: {
          verdict: 'procedural',
        },
      },
    });

    expect(result.gateShouldIndex).toBe(false);
    expect(result.gateReasons).toEqual(['missing_required_sections']);
    expect(result.hasProceduralGuidance).toBe(false);
    expect(result.isDraftPage).toBe(false);
    expect(result.safeDraftDescription).toContain('Acme is currently in editorial verification');
    expect(result.communityCorroborationCount).toBe(4);
    expect(result.userSignalClaimsCount).toBe(2);
    expect(result.userSignalCoveragePending).toBe(false);
    expect(result.userSignalNeedsConfirmationCount).toBe(0);
    expect(result.userSignalChannelCoverageCount).toBe(0);
  });

  it('flags pending user-signal coverage when community domains exist but claims are absent', () => {
    const tool = {
      name: 'Acme',
      short_description: 'Acme helps teams automate workflows.',
      metadata: {},
      specs: {
        user_signal_summary: {
          top_user_reported_claims: [],
          needs_confirmation_claims: 2,
          reddit_claims: 1,
          forum_claims: 1,
          hn_claims: 0,
        },
      },
    } as any;

    const result = buildToolPageQualityState({
      tool,
      firstReview: null,
      reviewSelection: {
        hasPublishedReview: false,
        hasDraftReview: true,
      },
      persistedQuality: {
        evidence_counts: {
          community_domains: 3,
        },
      },
    });

    expect(result.communityCorroborationCount).toBe(3);
    expect(result.userSignalClaimsCount).toBe(0);
    expect(result.userSignalCoveragePending).toBe(true);
    expect(result.userSignalNeedsConfirmationCount).toBe(2);
    expect(result.userSignalChannelCoverageCount).toBe(2);
  });

  it('honors canonical pending flag from ETL quality metadata', () => {
    const tool = {
      name: 'Acme',
      short_description: 'Acme helps teams automate workflows.',
      metadata: {},
      specs: {
        canonical: {
          quality: {
            user_signal_coverage_pending: true,
          },
        },
      },
    } as any;

    const result = buildToolPageQualityState({
      tool,
      firstReview: null,
      reviewSelection: {
        hasPublishedReview: false,
        hasDraftReview: true,
      },
      persistedQuality: {
        evidence_counts: {
          community_domains: 0,
        },
      },
    });

    expect(result.userSignalCoveragePending).toBe(true);
  });

  it('surfaces subject-scope pending message when review selection is suppressed', () => {
    const tool = {
      name: 'Acme',
      short_description: 'Acme helps teams automate workflows.',
      metadata: {},
      specs: {},
    } as any;

    const result = buildToolPageQualityState({
      tool,
      firstReview: null,
      reviewSelection: {
        hasPublishedReview: false,
        hasDraftReview: false,
      },
      persistedQuality: undefined,
      resolvedSubject: {
        confidence: 'high',
        entityScope: 'copilot',
        subjectType: 'product_surface',
      },
      subjectSelectionSuppressed: true,
      subjectSelectionReason: 'Published review content is hidden until scope resolves.',
    });

    expect(result.subjectScopePending).toBe(true);
    expect(result.subjectScopeMessage).toBe(
      'Published review content is hidden until scope resolves.'
    );
    expect(result.gateShouldIndex).toBe(false);
    expect(result.gateReasons).toContain('subject_scope_pending');
  });

  it('blocks index readiness when subject confidence is low', () => {
    const tool = {
      name: 'Acme Enterprise',
      short_description: 'Acme helps teams automate workflows.',
      metadata: {},
      specs: {},
    } as any;

    const result = buildToolPageQualityState({
      tool,
      firstReview: null,
      reviewSelection: {
        hasPublishedReview: false,
        hasDraftReview: false,
      },
      persistedQuality: undefined,
      resolvedSubject: {
        confidence: 'low',
        entityScope: null,
        subjectType: 'plan_family',
      },
      subjectSelectionSuppressed: false,
      subjectSelectionReason: null,
    });

    expect(result.subjectScopePending).toBe(true);
    expect(result.gateShouldIndex).toBe(false);
    expect(result.gateReasons).toContain('subject_scope_pending');
  });
});
