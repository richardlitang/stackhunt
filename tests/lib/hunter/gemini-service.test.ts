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
        source_url: 'https://independent.example.org/review',
        source_type: 'editorial',
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

function buildEvidencePayload(
  overrides: Partial<{
    score: number;
    pros: Array<{
      text: string;
      source_url: string;
      source_type: 'official' | 'editorial' | 'community';
      claim_type: 'fact' | 'opinion';
    }>;
    cons: Array<{
      text: string;
      source_url: string;
      source_type: 'official' | 'editorial' | 'community';
      claim_type: 'fact' | 'opinion';
    }>;
    pricingType: 'free' | 'freemium' | 'paid' | 'enterprise' | 'open_source';
    graphTags: { functions: string[]; audiences: string[]; platforms: string[] };
    abstentions: Array<{
      field: 'verdict' | 'shortDescription' | 'websiteUrl' | 'faqs' | 'reviewContext';
      reason: string;
    }>;
  }> = {}
) {
  const payload = buildValidPayload();
  return {
    score: payload.score,
    pros: payload.pros,
    cons: payload.cons,
    pricingType: payload.pricingType,
    graphTags: payload.graphTags,
    ...overrides,
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

  it('throws when evidence packet lacks source diversity', async () => {
    const lowDiversityEvidence = {
      score: 80,
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
      pricingType: 'paid',
      graphTags: {
        functions: ['Automation'],
        audiences: ['Startups'],
        platforms: ['Web'],
      },
    };

    mockGenerateContentWithThinkingFallback
      .mockResolvedValueOnce({
        text: JSON.stringify(lowDiversityEvidence),
        usageMetadata: { totalTokenCount: 121 },
      })
      .mockResolvedValueOnce({
        text: JSON.stringify(lowDiversityEvidence),
        usageMetadata: { totalTokenCount: 122 },
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
    ).rejects.toThrow('source diversity requires at least one official and one non-official claim');
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

  it('removes abstained low-confidence fields from stage 2 output', async () => {
    const narrativePayload = {
      ...buildValidPayload(),
      websiteUrl: 'https://example.com',
      shortDescription: 'Strong API tooling with enterprise controls.',
      verdict: 'Choose for API controls.',
      faqs: [
        {
          question: 'Is it good for startups?',
          answer: 'It can work well for API-first startups with budget for governance.',
          question_source: 'paa',
          answer_source_url: 'https://example.com/docs/faq',
        },
      ],
      review_context: {
        human_verdict: 'Strong technical fit but pricing can be limiting.',
      },
    };

    mockGenerateContentWithThinkingFallback
      .mockResolvedValueOnce({
        text: JSON.stringify(
          buildEvidencePayload({
            abstentions: [
              { field: 'verdict', reason: 'insufficient confidence for one-line recommendation' },
              { field: 'shortDescription', reason: 'insufficient confidence for concise descriptor' },
              { field: 'websiteUrl', reason: 'conflicting canonical URL signals' },
              { field: 'faqs', reason: 'insufficient validated FAQ evidence' },
              { field: 'reviewContext', reason: 'insufficient qualitative evidence' },
            ],
          })
        ),
        usageMetadata: { totalTokenCount: 130 },
      })
      .mockResolvedValueOnce({
        text: JSON.stringify(narrativePayload),
        usageMetadata: { totalTokenCount: 230 },
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

    expect(result.tokensUsed).toBe(360);
    expect(result.analysis.verdict).toBeUndefined();
    expect(result.analysis.shortDescription).toBeUndefined();
    expect(result.analysis.websiteUrl).toBeUndefined();
    expect(result.analysis.faqs).toBeUndefined();
    expect(result.analysis.reviewContext).toBeUndefined();
  });
});
