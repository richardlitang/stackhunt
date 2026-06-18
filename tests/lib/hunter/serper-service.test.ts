import { describe, expect, it, vi } from 'vitest';

import { SerperService } from '@/lib/hunter/services/serper';
import type { SourcePolicyGate } from '@/lib/hunter/services/source-policy';

describe('SerperService community snippet guardrail', () => {
  it('uses community fallback when policy provider is unavailable', async () => {
    const service = new SerperService({ apiKey: 'test-key' });

    const decision = await (service as any).getPolicyDecision(
      'https://www.reddit.com/r/test/comments/1'
    );

    expect(decision).toMatchObject({
      isDeepScrapeAllowed: false,
      blockReason: 'community_snippet_only_guardrail',
      gate: {
        acquisition_mode: 'LINK_ONLY',
        display_mode: 'LINK_ONLY',
        policy_version: 'community_snippet_only_v1',
      },
    });
  });

  it('applies community fallback before recording unknown domains', async () => {
    const recordUnknownDomain = vi.fn(async () => undefined);
    const service = new SerperService({
      apiKey: 'test-key',
      policyProvider: {
        getPolicyGate: async () => null,
        recordUnknownDomain,
      },
    });

    const decision = await (service as any).getPolicyDecision(
      'https://news.ycombinator.com/item?id=1'
    );

    expect(decision?.blockReason).toBe('community_snippet_only_guardrail');
    expect(recordUnknownDomain).not.toHaveBeenCalled();
  });

  it('forces link-only mode for community domains even when provider allows scraping', async () => {
    const gate: SourcePolicyGate = {
      acquisition_mode: 'SCRAPE_ALLOWED',
      llm_ingestion_allowed: 'YES',
      display_mode: 'EXCERPT_OK',
      policy_version: 'test-v1',
    };
    const service = new SerperService({
      apiKey: 'test-key',
      policyProvider: {
        getPolicyGate: async () => gate,
        recordUnknownDomain: async () => undefined,
      },
    });

    const decision = await (service as any).getPolicyDecision(
      'https://stackoverflow.com/questions/123'
    );

    expect(decision).toMatchObject({
      isDeepScrapeAllowed: false,
      blockReason: 'community_snippet_only_guardrail',
      gate: {
        acquisition_mode: 'LINK_ONLY',
        display_mode: 'LINK_ONLY',
      },
    });
  });

  it('keeps policy-driven behavior for non-community domains', async () => {
    const gate: SourcePolicyGate = {
      acquisition_mode: 'SCRAPE_ALLOWED',
      llm_ingestion_allowed: 'YES',
      display_mode: 'EXCERPT_OK',
      policy_version: 'test-v1',
    };
    const service = new SerperService({
      apiKey: 'test-key',
      policyProvider: {
        getPolicyGate: async () => gate,
        recordUnknownDomain: async () => undefined,
      },
    });

    const decision = await (service as any).getPolicyDecision('https://example.com/pricing');

    expect(decision).toEqual({
      gate,
      isDeepScrapeAllowed: true,
      blockReason: undefined,
    });
  });
});
