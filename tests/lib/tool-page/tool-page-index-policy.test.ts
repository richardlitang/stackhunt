import { describe, expect, it } from 'vitest';
import { evaluateToolPageIndexPolicy } from '@/lib/tool-page/policy/index-policy';

describe('tool page index policy', () => {
  it('indexes when all blockers are clear', () => {
    const result = evaluateToolPageIndexPolicy({
      gateShouldIndex: true,
      isDraftPage: false,
      pendingVerificationCount: 0,
      toolPageQaPass: true,
      showReviewInProgressBanner: false,
      toolCanonicalUrl: 'https://stackhunt.ai/tool/acme',
      fallbackCanonicalUrl: 'https://stackhunt.ai/tools',
      defaultDescription: 'Default description',
      draftDescription: 'Draft description',
    });

    expect(result.shouldNoindex).toBe(false);
    expect(result.blockingReasons).toEqual([]);
    expect(result.reasons).toEqual([]);
    expect(result.overrideApplied).toBe(false);
    expect(result.robotsTag).toBe('index,follow');
    expect(result.canonicalUrl).toBe('https://stackhunt.ai/tool/acme');
    expect(result.description).toBe('Default description');
  });

  it('noindexes when any blocker is present', () => {
    const result = evaluateToolPageIndexPolicy({
      gateShouldIndex: false,
      isDraftPage: false,
      pendingVerificationCount: 2,
      toolPageQaPass: true,
      showReviewInProgressBanner: false,
      toolCanonicalUrl: 'https://stackhunt.ai/tool/acme',
      fallbackCanonicalUrl: 'https://stackhunt.ai/tools',
      defaultDescription: 'Default description',
      draftDescription: 'Draft description',
    });

    expect(result.shouldNoindex).toBe(true);
    expect(result.blockingReasons).toEqual(['gate_should_not_index', 'pending_verification']);
    expect(result.overrideApplied).toBe(false);
    expect(result.robotsTag).toBe('noindex,follow');
    expect(result.canonicalUrl).toBe('https://stackhunt.ai/tools');
    expect(result.description).toBe('Draft description');
  });

  it('captures draft and qa blockers together', () => {
    const result = evaluateToolPageIndexPolicy({
      gateShouldIndex: true,
      isDraftPage: true,
      pendingVerificationCount: 0,
      toolPageQaPass: false,
      showReviewInProgressBanner: false,
      toolCanonicalUrl: 'https://stackhunt.ai/tool/acme',
      fallbackCanonicalUrl: 'https://stackhunt.ai/tools',
      defaultDescription: 'Default description',
      draftDescription: 'Draft description',
    });

    expect(result.shouldNoindex).toBe(true);
    expect(result.blockingReasons).toEqual(['draft_page', 'tool_page_qa_failed']);
    expect(result.overrideApplied).toBe(false);
    expect(result.robotsTag).toBe('noindex,follow');
    expect(result.canonicalUrl).toBe('https://stackhunt.ai/tools');
    expect(result.description).toBe('Draft description');
  });

  it('allows review-in-progress banner to override blockers', () => {
    const result = evaluateToolPageIndexPolicy({
      gateShouldIndex: false,
      isDraftPage: true,
      pendingVerificationCount: 4,
      toolPageQaPass: false,
      showReviewInProgressBanner: true,
      toolCanonicalUrl: 'https://stackhunt.ai/tool/acme',
      fallbackCanonicalUrl: 'https://stackhunt.ai/tools',
      defaultDescription: 'Default description',
      draftDescription: 'Draft description',
    });

    expect(result.shouldNoindex).toBe(false);
    expect(result.blockingReasons).toEqual([
      'gate_should_not_index',
      'draft_page',
      'pending_verification',
      'tool_page_qa_failed',
    ]);
    expect(result.overrideApplied).toBe(true);
    expect(result.robotsTag).toBe('index,follow');
    expect(result.canonicalUrl).toBe('https://stackhunt.ai/tool/acme');
    expect(result.description).toBe('Default description');
  });
});
