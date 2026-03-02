import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGenerateContentWithThinkingFallback } = vi.hoisted(() => ({
  mockGenerateContentWithThinkingFallback: vi.fn(),
}));

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    constructor(_: unknown) {}
  },
  ThinkingLevel: {
    HIGH: 'HIGH',
    LOW: 'LOW',
  },
}));

vi.mock('@/lib/hunter/services/gemini-compat', () => ({
  generateContentWithThinkingFallback: mockGenerateContentWithThinkingFallback,
}));

vi.mock('@/lib/hunter/services/model-router', () => ({
  getGeminiModelForStage: () => 'gemini-test-model',
}));

import { GeminiService } from '@/lib/hunter/services/gemini';

function buildValidPayload() {
  return {
    score: 82,
    pros: [
      {
        text: 'API supports scoped keys for production use',
        source_url: 'https://example.com/docs/api',
        source_type: 'official',
        claim_type: 'fact',
      },
    ],
    cons: [
      {
        text: 'Enterprise SSO requires higher paid tier',
        source_url: 'https://example.com/pricing',
        source_type: 'official',
        claim_type: 'fact',
      },
    ],
    summary:
      'The product is a strong fit for API-first teams with documented auth controls, but governance features are concentrated in premium tiers.',
    sentimentTags: ['api', 'security', 'pricing'],
    pricingType: 'paid',
    websiteUrl: 'https://example.com',
    verdict: 'Choose when API governance matters; skip when SSO must be on lower tiers.',
    vetoLogic: [
      {
        condition: 'Need SSO on entry tier',
        alternative: 'AlternativeTool',
        reason: 'AlternativeTool includes SSO at lower cost tiers',
        source_url: 'https://example.com/compare',
      },
    ],
    realityChecks: [
      {
        claim: 'Enterprise-ready for all teams',
        reality: 'Users report SSO requires a higher pricing tier.',
        impact: 'Smaller teams may need to upgrade sooner.',
        source_url: 'https://example.com/community/thread',
      },
    ],
    graphTags: {
      functions: ['Automation'],
      audiences: ['Startups'],
      platforms: ['Web'],
    },
  };
}

function buildEvidencePayload() {
  const payload = buildValidPayload();
  return {
    score: payload.score,
    pros: payload.pros,
    cons: payload.cons,
    pricingType: payload.pricingType,
    graphTags: payload.graphTags,
  };
}

describe('GeminiService.synthesize', () => {
  beforeEach(() => {
    mockGenerateContentWithThinkingFallback.mockReset();
  });

  it('preserves decision intro and evidence from legacy review_context payload', async () => {
    const payload = {
      ...buildValidPayload(),
      review_context: {
        human_verdict: 'Great for API-first teams, weak fit for budget-sensitive orgs.',
        decision_intro: {
          what_it_is: 'An API-first automation platform.',
          best_for: 'Teams with integration-heavy workflows.',
          not_for: 'Teams that require low-cost SSO immediately.',
          main_tradeoff: 'Flexibility vs premium governance pricing.',
          summary: 'Good for scale, expensive for compliance features.',
        },
        decision_evidence: {
          best_for_reason: {
            text: 'API supports scoped keys for production use',
            source_url: 'https://example.com/docs/api',
            source_type: 'official',
            claim_type: 'fact',
          },
          not_for_reason: {
            text: 'Enterprise SSO requires higher paid tier',
            source_url: 'https://example.com/pricing',
            source_type: 'official',
            claim_type: 'fact',
          },
          tradeoff_reason: {
            text: 'Governance controls are premium-tier features',
            source_url: 'https://example.com/pricing#enterprise',
            source_type: 'official',
            claim_type: 'fact',
          },
        },
      },
    };

    mockGenerateContentWithThinkingFallback
      .mockResolvedValueOnce({
        text: JSON.stringify(buildEvidencePayload()),
        usageMetadata: { totalTokenCount: 123 },
      })
      .mockResolvedValueOnce({
        text: JSON.stringify(payload),
        usageMetadata: { totalTokenCount: 321 },
      });

    const service = new GeminiService({ apiKey: 'test-key' });
    const result = await service.synthesize({
      toolName: 'ExampleTool',
      promptTemplate: 'test prompt',
      contextTitle: 'Best for API automation',
      reviewsSnippets: [],
      pricingSnippets: [],
      alternativesSnippets: [],
      budgetAnalystSnippets: [],
      tribalKnowledgeSnippets: [],
      knowledgeCardFacts: 'facts',
      existingCategories: { functions: [], audiences: [], platforms: [] },
      strictClaimSourcing: true,
    });

    expect(result.tokensUsed).toBe(444);
    expect(result.analysis.reviewContext?.decisionIntro?.what_it_is).toBe(
      'An API-first automation platform.'
    );
    expect(result.analysis.reviewContext?.decisionEvidence?.best_for_reason?.source_url).toBe(
      'https://example.com/docs/api'
    );
  });

  it('throws when strict claim sourcing is enabled and claims are not structured objects', async () => {
    const payload = {
      ...buildValidPayload(),
      pros: ['Strong API access'],
      cons: ['SSO only on enterprise'],
    };

    mockGenerateContentWithThinkingFallback
      .mockResolvedValueOnce({
        text: JSON.stringify(payload),
        usageMetadata: { totalTokenCount: 111 },
      })
      .mockResolvedValueOnce({
        text: JSON.stringify(payload),
        usageMetadata: { totalTokenCount: 112 },
      });

    const service = new GeminiService({ apiKey: 'test-key' });

    await expect(
      service.synthesize({
        toolName: 'ExampleTool',
        promptTemplate: 'test prompt',
        contextTitle: 'Best for API automation',
        reviewsSnippets: [],
        pricingSnippets: [],
        alternativesSnippets: [],
        budgetAnalystSnippets: [],
        tribalKnowledgeSnippets: [],
        knowledgeCardFacts: 'facts',
        existingCategories: { functions: [], audiences: [], platforms: [] },
        strictClaimSourcing: true,
      })
    ).rejects.toThrow('Gemini synthesis evidence stage failed');
  });

  it('allows legacy string claims when strict claim sourcing is disabled', async () => {
    const payload = {
      ...buildValidPayload(),
      pros: ['Strong API access'],
      cons: ['SSO only on enterprise'],
    };

    mockGenerateContentWithThinkingFallback.mockResolvedValue({
      text: JSON.stringify(payload),
      usageMetadata: { totalTokenCount: 222 },
    });

    const service = new GeminiService({ apiKey: 'test-key' });
    const result = await service.synthesize({
      toolName: 'ExampleTool',
      promptTemplate: 'test prompt',
      contextTitle: 'Best for API automation',
      reviewsSnippets: [],
      pricingSnippets: [],
      alternativesSnippets: [],
      budgetAnalystSnippets: [],
      tribalKnowledgeSnippets: [],
      knowledgeCardFacts: 'facts',
      existingCategories: { functions: [], audiences: [], platforms: [] },
      strictClaimSourcing: false,
    });

    expect(result.tokensUsed).toBe(222);
    expect(typeof result.analysis.pros[0]).toBe('string');
    expect(typeof result.analysis.cons[0]).toBe('string');
  });

  it('retries once when first synthesis payload fails strict schema checks', async () => {
    const invalidNarrativePayload = {
      ...buildValidPayload(),
      summary: null,
    };
    const validPayload = buildValidPayload();

    mockGenerateContentWithThinkingFallback
      .mockResolvedValueOnce({
        text: JSON.stringify(buildEvidencePayload()),
        usageMetadata: { totalTokenCount: 101 },
      })
      .mockResolvedValueOnce({
        text: JSON.stringify(invalidNarrativePayload),
        usageMetadata: { totalTokenCount: 202 },
      })
      .mockResolvedValueOnce({
        text: JSON.stringify(validPayload),
        usageMetadata: { totalTokenCount: 303 },
      });

    const service = new GeminiService({ apiKey: 'test-key' });
    const result = await service.synthesize({
      toolName: 'ExampleTool',
      promptTemplate: 'test prompt',
      contextTitle: 'Best for API automation',
      reviewsSnippets: [],
      pricingSnippets: [],
      alternativesSnippets: [],
      budgetAnalystSnippets: [],
      tribalKnowledgeSnippets: [],
      knowledgeCardFacts: 'facts',
      existingCategories: { functions: [], audiences: [], platforms: [] },
      strictClaimSourcing: true,
    });

    expect(result.tokensUsed).toBe(606);
    expect(Array.isArray(result.analysis.pros)).toBe(true);
    expect(typeof result.analysis.pros[0]).toBe('object');
    expect(mockGenerateContentWithThinkingFallback).toHaveBeenCalledTimes(3);
  });
});
