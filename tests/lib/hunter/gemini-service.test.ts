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
      confidence?: number;
    }>;
    cons: Array<{
      text: string;
      source_url: string;
      source_type: 'official' | 'editorial' | 'community';
      claim_type: 'fact' | 'opinion';
      confidence?: number;
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

  it('auto-abstains narrative fields when evidence confidence distribution is weak', async () => {
    const narrativePayload = {
      ...buildValidPayload(),
      shortDescription: 'Short narrative that should be suppressed by auto-abstain.',
      verdict: 'Narrative verdict that should be suppressed.',
      faqs: [
        {
          question: 'Should I use this?',
          answer: 'It depends on your use case and constraints.',
          question_source: 'paa',
          answer_source_url: 'https://example.com/docs/faq',
        },
      ],
      review_context: {
        human_verdict: 'This should be suppressed by auto-abstain.',
      },
    };

    mockGenerateContentWithThinkingFallback
      .mockResolvedValueOnce({
        text: JSON.stringify(
          buildEvidencePayload({
            pros: [
              {
                text: 'API supports scoped keys for production use',
                source_url: 'https://example.com/docs/api',
                source_type: 'official',
                claim_type: 'fact',
                confidence: 0.45,
              },
            ],
            cons: [
              {
                text: 'Users report SSO setup requires multiple admin steps and role mapping',
                source_url: 'https://independent.example.org/review',
                source_type: 'editorial',
                claim_type: 'opinion',
                confidence: 0.42,
              },
            ],
          })
        ),
        usageMetadata: { totalTokenCount: 140 },
      })
      .mockResolvedValueOnce({
        text: JSON.stringify(narrativePayload),
        usageMetadata: { totalTokenCount: 240 },
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

    expect(result.tokensUsed).toBe(380);
    expect(result.analysis.verdict).toBeUndefined();
    expect(result.analysis.shortDescription).toBeUndefined();
    expect(result.analysis.faqs).toBeUndefined();
    expect(result.analysis.reviewContext).toBeUndefined();
    expect(typeof result.analysis.summary).toBe('string');
    expect(result.generationQuality.stage1Enabled).toBe(true);
    expect(result.generationQuality.abstainedFields).toEqual(
      expect.arrayContaining(['verdict', 'shortDescription', 'reviewContext', 'faqs'])
    );
    expect((result.generationQuality.meanConfidence || 0) < 0.68).toBe(true);
    expect((result.generationQuality.actionabilityScore || 0) < 60).toBe(true);
  });

  it('coerces community fact claims to opinion in strict evidence mode', async () => {
    const narrativePayload = buildValidPayload();
    mockGenerateContentWithThinkingFallback
      .mockResolvedValueOnce({
        text: JSON.stringify(
          buildEvidencePayload({
            cons: [
              {
                text: 'Users report sync conflicts when editing shared docs from iOS and web simultaneously',
                source_url: 'https://reddit.com/r/example/comments/abc123/thread',
                source_type: 'community',
                claim_type: 'fact',
                confidence: 0.62,
              },
            ],
          })
        ),
        usageMetadata: { totalTokenCount: 150 },
      })
      .mockResolvedValueOnce({
        text: JSON.stringify(narrativePayload),
        usageMetadata: { totalTokenCount: 250 },
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

    const firstCon = result.analysis.cons[0] as {
      source_type?: string;
      claim_type?: string;
    };
    expect(firstCon.source_type).toBe('community');
    expect(firstCon.claim_type).toBe('opinion');
  });

  it('retries evidence stage when claims are generic and accepts specific retry', async () => {
    const genericEvidence = buildEvidencePayload({
      pros: [
        {
          text: 'Easy to use',
          source_url: 'https://example.com/docs',
          source_type: 'official',
          claim_type: 'opinion',
          confidence: 0.8,
        },
      ],
    });
    const specificEvidence = buildEvidencePayload({
      pros: [
        {
          text: 'Supports scoped API keys and role-based access controls',
          source_url: 'https://example.com/docs/security',
          source_type: 'official',
          claim_type: 'fact',
          confidence: 0.84,
        },
      ],
    });
    mockGenerateContentWithThinkingFallback
      .mockResolvedValueOnce({
        text: JSON.stringify(genericEvidence),
        usageMetadata: { totalTokenCount: 110 },
      })
      .mockResolvedValueOnce({
        text: JSON.stringify(specificEvidence),
        usageMetadata: { totalTokenCount: 120 },
      })
      .mockResolvedValueOnce({
        text: JSON.stringify(buildValidPayload()),
        usageMetadata: { totalTokenCount: 130 },
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

    expect(mockGenerateContentWithThinkingFallback).toHaveBeenCalledTimes(3);
    expect(result.tokensUsed).toBe(360);
  });

  it('fails strict evidence stage when all attempts remain generic', async () => {
    const genericEvidence = buildEvidencePayload({
      pros: [
        {
          text: 'Solid choice for teams',
          source_url: 'https://example.com/docs',
          source_type: 'official',
          claim_type: 'opinion',
          confidence: 0.7,
        },
      ],
      cons: [
        {
          text: 'Good value overall',
          source_url: 'https://independent.example.org/review',
          source_type: 'editorial',
          claim_type: 'opinion',
          confidence: 0.62,
        },
      ],
    });
    mockGenerateContentWithThinkingFallback
      .mockResolvedValueOnce({
        text: JSON.stringify(genericEvidence),
        usageMetadata: { totalTokenCount: 140 },
      })
      .mockResolvedValueOnce({
        text: JSON.stringify(genericEvidence),
        usageMetadata: { totalTokenCount: 150 },
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
    ).rejects.toThrow('must be specific and decision-useful');
  });

  it('injects alternative signal weighting block into synthesis prompts', async () => {
    mockGenerateContentWithThinkingFallback
      .mockResolvedValueOnce({
        text: JSON.stringify(buildEvidencePayload()),
        usageMetadata: { totalTokenCount: 160 },
      })
      .mockResolvedValueOnce({
        text: JSON.stringify(buildValidPayload()),
        usageMetadata: { totalTokenCount: 170 },
      });

    const service = new GeminiService({ apiKey: 'test-key' });
    await service.synthesize({
      toolName: 'Notion',
      promptTemplate: 'test prompt',
      contextTitle: 'Best for API automation',
      reviewsSnippets: [],
      pricingSnippets: [],
      alternativesSnippets: [
        '[https://example.com/1] Notion vs Coda: Which tool is better for docs?',
        '[https://example.com/2] Coda alternatives and Notion competitors in 2026',
        '[https://example.com/3] Airtable vs Notion for product ops',
      ],
      budgetAnalystSnippets: [],
      tribalKnowledgeSnippets: [],
      knowledgeCardFacts: 'facts',
      existingCategories: { functions: [], audiences: [], platforms: [] },
      strictClaimSourcing: true,
    });

    const stageOnePrompt = mockGenerateContentWithThinkingFallback.mock.calls[0]?.[1]?.contents;
    expect(typeof stageOnePrompt).toBe('string');
    expect(stageOnePrompt).toContain('ALTERNATIVE SIGNALS (Heuristic, Source-Backed Validation Required)');
    expect(stageOnePrompt).toContain('Coda');
    expect(stageOnePrompt).toContain('Airtable');
  });

  it('backfills switchingFrom from alternative signals when model omits it', async () => {
    mockGenerateContentWithThinkingFallback
      .mockResolvedValueOnce({
        text: JSON.stringify(buildEvidencePayload()),
        usageMetadata: { totalTokenCount: 200 },
      })
      .mockResolvedValueOnce({
        text: JSON.stringify({
          ...buildValidPayload(),
          switchingFrom: undefined,
        }),
        usageMetadata: { totalTokenCount: 210 },
      });

    const service = new GeminiService({ apiKey: 'test-key' });
    const result = await service.synthesize({
      toolName: 'Notion',
      promptTemplate: 'test prompt',
      contextTitle: 'Best for API automation',
      reviewsSnippets: [],
      pricingSnippets: [],
      alternativesSnippets: [
        '[https://example.com/1] Notion vs Coda for docs',
        '[https://example.com/2] Airtable vs Notion for product ops',
        '[https://example.com/3] Coda alternatives for small teams',
      ],
      budgetAnalystSnippets: [],
      tribalKnowledgeSnippets: [],
      knowledgeCardFacts: 'facts',
      existingCategories: { functions: [], audiences: [], platforms: [] },
      strictClaimSourcing: true,
    });

    expect(result.analysis.switchingFrom).toEqual(expect.arrayContaining(['Coda', 'Airtable']));
  });

  it('computes actionability score for decision-useful outputs', async () => {
    mockGenerateContentWithThinkingFallback
      .mockResolvedValueOnce({
        text: JSON.stringify(
          buildEvidencePayload({
            pros: [
              {
                text: 'API rate limit is 5 requests/second on the standard plan',
                source_url: 'https://example.com/docs/limits',
                source_type: 'official',
                claim_type: 'fact',
                confidence: 0.88,
              },
            ],
            cons: [
              {
                text: 'SSO is available only on enterprise plans above 50 seats',
                source_url: 'https://independent.example.org/review',
                source_type: 'editorial',
                claim_type: 'fact',
                confidence: 0.72,
              },
            ],
          })
        ),
        usageMetadata: { totalTokenCount: 180 },
      })
      .mockResolvedValueOnce({
        text: JSON.stringify({
          ...buildValidPayload(),
          switchingFrom: ['Airtable'],
          dealbreakers: ['Users report setup friction for SSO provisioning'],
        }),
        usageMetadata: { totalTokenCount: 190 },
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

    expect(result.generationQuality.actionabilityScore).toBeGreaterThan(55);
    expect(result.generationQuality.actionabilityScore).toBeLessThanOrEqual(100);
  });
});
