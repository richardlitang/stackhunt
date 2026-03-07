import { describe, expect, it } from 'vitest';
import {
  collectReviewEntityScopes,
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
});
