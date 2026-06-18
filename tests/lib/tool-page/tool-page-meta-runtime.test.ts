import { describe, expect, it } from 'vitest';
import { buildToolPageMetaRuntime } from '@/lib/tool-page/runtime/meta-runtime';

describe('tool page meta runtime', () => {
  it('composes qa and index policy into final meta state', () => {
    const result = buildToolPageMetaRuntime({
      qaInput: {
        title: 'Acme Review | StackHunt',
        h1: 'Acme Review',
        intro: 'Useful intro',
        verdict: 'Clear verdict',
        evaluationDepth: 'docs_only',
        pricingSectionVisible: true,
        hasPricingCheckedProof: true,
        schemaMatchesVisibleContent: true,
        hasBestForSignal: true,
        hasNotForSignal: true,
        hasTradeoffSignal: true,
        hasDecisionSummaryBlock: true,
        introLooksSpecSheet: false,
      },
      indexInput: {
        gateShouldIndex: true,
        isDraftPage: false,
        pendingVerificationCount: 0,
        showReviewInProgressBanner: false,
        toolCanonicalUrl: 'https://stackhunt.ai/tool/acme',
        fallbackCanonicalUrl: 'https://stackhunt.ai/tools',
        defaultDescription: 'Default',
        draftDescription: 'Draft',
      },
      baseMeta: {
        description: 'Default',
        canonical: 'https://stackhunt.ai/tool/acme',
      },
    });

    expect(result.toolPageQaGate.pass).toBe(true);
    expect(result.indexPolicy.shouldNoindex).toBe(false);
    expect(result.meta.noindex).toBe(false);
    expect(result.meta.canonical).toBe('https://stackhunt.ai/tool/acme');
    expect(result.meta.description).toBe('Default');
  });
});
