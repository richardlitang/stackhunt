import { describe, expect, it } from 'vitest';
import {
  collectReviewEntityScopes,
  mapLaneSubjectProfileToResolvedSubject,
  resolveToolPageReviewSubject,
  scoreToolPageReviewSubjectMatch,
  shouldUseSubjectMatchedReview,
} from '@/lib/tool-page/review-subject';

describe('tool page review subject', () => {
  it('resolves core product subject for generic tool slug', () => {
    const subject = resolveToolPageReviewSubject({
      tool: {
        name: 'GitHub',
        slug: 'github',
      },
    });

    expect(subject.subjectType).toBe('product');
    expect(subject.entityScope).toBe('core');
    expect(subject.confidence).toBe('high');
  });

  it('resolves known product surface subject from slug tokens', () => {
    const subject = resolveToolPageReviewSubject({
      tool: {
        name: 'GitHub Copilot',
        slug: 'github-copilot',
      },
    });

    expect(subject.subjectType).toBe('product_surface');
    expect(subject.entityScope).toBe('copilot');
    expect(subject.confidence).toBe('high');
  });

  it('collects unique normalized entity scopes from review sources', () => {
    const scopes = collectReviewEntityScopes({
      sources: [
        { entity_scope: 'copilot' },
        { entityScope: 'enterprise-cloud' },
        { entity_scope: 'copilot' },
        { entity_scope: 'unknown_scope' },
      ],
    });

    expect(scopes).toEqual(['copilot', 'enterprise_cloud']);
  });

  it('scores exact subject matches higher than unknown-scope reviews', () => {
    const subject = resolveToolPageReviewSubject({
      tool: {
        name: 'GitHub Copilot',
        slug: 'github-copilot',
      },
    });

    const exactMatchScore = scoreToolPageReviewSubjectMatch(
      {
        sources: [{ entity_scope: 'copilot' }],
      },
      subject
    );
    const unknownScopeScore = scoreToolPageReviewSubjectMatch(
      {
        sources: [],
      },
      subject
    );

    expect(exactMatchScore).toBeGreaterThan(unknownScopeScore);
  });

  it('requires stronger score threshold for non-core subjects', () => {
    const copilotSubject = resolveToolPageReviewSubject({
      tool: {
        name: 'GitHub Copilot',
        slug: 'github-copilot',
      },
    });

    expect(
      shouldUseSubjectMatchedReview({
        subject: copilotSubject,
        publishedReviewScore: 2,
      })
    ).toBe(false);
    expect(
      shouldUseSubjectMatchedReview({
        subject: copilotSubject,
        publishedReviewScore: 3,
      })
    ).toBe(true);
  });

  it('suppresses review usage when subject confidence is low or scope is unresolved', () => {
    const unresolvedSurface = resolveToolPageReviewSubject({
      tool: {
        name: 'GitHub Surface',
        slug: 'github-surface',
      },
      parentTool: {
        name: 'GitHub',
        slug: 'github',
      },
    });

    expect(
      shouldUseSubjectMatchedReview({
        subject: unresolvedSurface,
        publishedReviewScore: 4,
      })
    ).toBe(false);
  });

  it('prefers persisted lane subject profile when available', () => {
    const mapped = mapLaneSubjectProfileToResolvedSubject(
      {
        subject_profile: {
          subject_type: 'product_surface',
          subject_key: 'github:copilot',
          display_name: 'GitHub Copilot',
          entity_scope: 'copilot',
          confidence: 'high',
        },
        fact_sheet: {
          official_facts: [],
          official_pricing_facts: [],
          official_limit_facts: [],
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
        },
      },
      {
        name: 'GitHub',
        slug: 'github',
      }
    );

    expect(mapped?.subjectType).toBe('product_surface');
    expect(mapped?.entityScope).toBe('copilot');
    expect(mapped?.subjectKey).toBe('github:copilot');
  });

  it('marks low-confidence lane subject profiles as ambiguous', () => {
    const mapped = mapLaneSubjectProfileToResolvedSubject(
      {
        subject_profile: {
          subject_type: 'plan_family',
          subject_key: 'github:enterprise',
          display_name: 'GitHub Enterprise',
          entity_scope: null,
          confidence: 'low',
        },
        fact_sheet: {
          official_facts: [],
          official_pricing_facts: [],
          official_limit_facts: [],
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
        },
      },
      {
        name: 'GitHub Enterprise',
        slug: 'github-enterprise',
      }
    );

    expect(mapped?.confidence).toBe('low');
    expect(mapped?.ambiguityReason).toContain('low confidence');
  });
});
