/**
 * Batch Synthesis Service
 *
 * Processes multiple tools together with Gemini context caching.
 * Uses the Forensic Framework as cached context for 90% cost reduction.
 *
 * @module hunter/services/batch-synthesis
 */

import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import type { HunterAnalysis } from '../types.js';
import { AnalysisSchema } from '../types.js';
import { geminiCircuit } from './circuit-breaker.js';
import {
  buildForensicFramework,
  isFrameworkCacheable,
  type ExistingCategories,
} from './forensic-framework.js';
import { buildFactSummary, buildSnippetBucketsFromScout } from '../utils.js';
import type { KnowledgeCard } from '../../knowledge-card.js';

export interface BatchSynthesisInput {
  itemId: string;
  toolName: string;
  contextTitle?: string;
  researchData: {
    scoutResult: {
      raw_sources: Array<{
        url: string;
        title: string;
        snippet: string;
        domain: string;
        retrieved_at: string;
        canonical_url: string;
        source_type: 'official' | 'docs' | 'support' | 'legal' | 'editorial' | 'community' | 'directory';
        intent_tags: Array<
          | 'pricing'
          | 'security'
          | 'portability'
          | 'integrations'
          | 'limits'
          | 'reviews'
          | 'alternatives'
        >;
        policy: {
          acquisition_mode: 'LINK_ONLY' | 'API_ONLY' | 'SCRAPE_ALLOWED' | 'BLOCKED';
          llm_ingestion_allowed: 'NO' | 'YES_LIMITED' | 'YES';
          display_mode: 'LINK_ONLY' | 'ATTRIBUTED_EXCERPT' | 'NO_DISPLAY';
          reason?: string;
          policy_version?: string;
        };
      }>;
    };
    knowledgeCard: KnowledgeCard;
  };
}

export interface BatchSynthesisResult {
  analyses: Map<string, { itemId: string; analysis: HunterAnalysis }>;
  tokensUsed: number;
  cacheHitRate: number;
  durationMs: number;
  errors: Array<{ toolName: string; error: string }>;
}

export class BatchSynthesisService {
  private client: GoogleGenAI;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.client = new GoogleGenAI({ apiKey });
  }

  /**
   * Synthesize analyses for multiple tools in same category
   *
   * Uses Gemini context caching to reduce costs by ~90% when processing
   * 10+ tools in the same category.
   *
   * @param inputs - Array of research data for each tool
   * @param category - Category slug for this batch
   * @param existingCategories - Existing Knowledge Graph tags
   * @param benchmarkTools - Optional benchmark tools for comparison
   * @returns Batch synthesis result with analyses and metrics
   */
  async synthesizeBatch(
    inputs: BatchSynthesisInput[],
    category: string,
    existingCategories: ExistingCategories,
    benchmarkTools?: string[]
  ): Promise<BatchSynthesisResult> {
    const startTime = Date.now();

    if (inputs.length === 0) {
      throw new Error('Empty batch');
    }

    console.log(`[Batch] Starting synthesis for ${inputs.length} tools in category: ${category}`);

    // Build the Forensic Framework (cached context)
    const framework = buildForensicFramework(category, existingCategories, benchmarkTools);
    console.log(`[Batch] Framework size: ${framework.tokenEstimate} tokens`);

    if (!isFrameworkCacheable(framework)) {
      console.warn(
        `[Batch] Warning: Framework is below 2048 tokens (${framework.tokenEstimate}), cache discount may not apply`
      );
    }

    // Try to create cache, fall back to uncached if not available
    let cachedContentName: string | null = null;

    try {
      // Create the cache with the Forensic Framework
      const cache = await this.client.cacheManager.create({
        model: 'models/gemini-3-flash-preview',
        displayName: `forensic_${category}_${Date.now()}`,
        systemInstruction: framework.systemInstruction,
        ttl: '120s', // 2 minutes - enough for batch
      });
      cachedContentName = cache.name;
      console.log(`[Batch] Cache created: ${cache.name}`);
    } catch (error) {
      console.warn('[Batch] Cache creation failed, using uncached synthesis:', error);
      cachedContentName = null;
    }

    const analyses = new Map<string, { itemId: string; analysis: HunterAnalysis }>();
    const errors: Array<{ toolName: string; error: string }> = [];
    let totalTokens = 0;
    let cachedTokens = 0;

    // Process tools in parallel (with concurrency limit)
    const CONCURRENCY = 5;
    const chunks = this.chunkArray(inputs, CONCURRENCY);

    for (const chunk of chunks) {
      const results = await Promise.allSettled(
        chunk.map(async (input) => {
          const toolStartTime = Date.now();

          try {
            const prompt = this.buildToolPrompt(input);

            const response = await geminiCircuit.execute(async () => {
              const config: any = {
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: {
                  temperature: 0.3,
                  responseMimeType: 'application/json',
                  systemInstruction: cachedContentName ? undefined : framework.systemInstruction,
                  thinkingConfig: {
                    thinkingLevel: ThinkingLevel.HIGH, // Pro-level reasoning for synthesis
                  },
                },
              };

              if (cachedContentName) {
                config.cachedContent = cachedContentName;
              }

              return this.client.models.generateContent(config);
            });

            const content = response.text;
            if (!content) {
              throw new Error(`Empty response for ${input.toolName}`);
            }

            const parsed = this.parseAndFixResponse(content);
            const validated = AnalysisSchema.parse(parsed);

            // Track timing
            const toolDuration = Date.now() - toolStartTime;
            console.log(`[Batch] ✓ ${input.toolName} (${toolDuration}ms)`);

            // Track tokens
            const usage = response.usageMetadata;
            if (usage) {
              totalTokens += usage.totalTokenCount || 0;
              cachedTokens += usage.cachedContentTokenCount || 0;
            }

            return {
              itemId: input.itemId,
              toolName: input.toolName,
              analysis: validated as HunterAnalysis,
            };
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`[Batch] ✗ ${input.toolName}: ${errorMessage}`);
            errors.push({ toolName: input.toolName, error: errorMessage });
            throw error;
          }
        })
      );

      // Collect successful results
      for (const result of results) {
        if (result.status === 'fulfilled') {
          analyses.set(result.value.toolName, {
            itemId: result.value.itemId,
            analysis: result.value.analysis,
          });
        }
      }
    }

    // Cleanup cache
    if (cachedContentName) {
      try {
        await this.client.cacheManager.delete(cachedContentName);
        console.log(`[Batch] Cache deleted: ${cachedContentName}`);
      } catch (error) {
        console.warn('[Batch] Failed to delete cache (will expire via TTL):', error);
      }
    }

    const durationMs = Date.now() - startTime;
    const cacheHitRate = totalTokens > 0 ? cachedTokens / totalTokens : 0;

    console.log(`[Batch] Completed: ${analyses.size}/${inputs.length} tools in ${durationMs}ms`);
    console.log(`[Batch] Cache hit rate: ${(cacheHitRate * 100).toFixed(1)}%`);
    console.log(
      `[Batch] Tokens: ${totalTokens.toLocaleString()} total, ${cachedTokens.toLocaleString()} cached`
    );

    return {
      analyses,
      tokensUsed: totalTokens,
      cacheHitRate,
      durationMs,
      errors,
    };
  }

  /**
   * Build the tool-specific prompt with research data
   */
  private buildToolPrompt(input: BatchSynthesisInput): string {
    const factSummary = buildFactSummary(input.researchData.knowledgeCard);
    const scout = input.researchData.scoutResult;
    const snippetBuckets = buildSnippetBucketsFromScout(scout.raw_sources);

    return `
TOOL: ${input.toolName}
${input.contextTitle ? `CONTEXT: ${input.contextTitle}` : ''}

=== VERIFIED FACTS (from Pass 1 extraction) ===
${factSummary}

=== REVIEWS & OPINIONS ===
${snippetBuckets.reviewsSnippets.join('\n')}

=== PRICING & FEATURES ===
${snippetBuckets.pricingSnippets.join('\n')}

=== ALTERNATIVES & COMPARISONS ===
${snippetBuckets.alternativesSnippets.join('\n')}

=== BUDGET ANALYST (Hidden Costs) ===
${snippetBuckets.budgetAnalystSnippets.join('\n')}

=== TRIBAL KNOWLEDGE (Reddit/HN) ===
${snippetBuckets.tribalKnowledgeSnippets.join('\n')}

=== SOURCES (Use these URLs for source_url) ===
${scout.raw_sources
  .slice(0, 20)
  .map((s) => `- ${s.url} (${s.domain}): ${s.title}`)
  .join('\n')}

Generate the forensic analysis following the cached framework instructions.
Return ONLY valid JSON, no markdown code blocks.
    `.trim();
  }

  /**
   * Parse and fix common AI response issues
   */
  private parseAndFixResponse(content: string): unknown {
    // Remove markdown code blocks if present
    let cleaned = content.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.slice(7);
    }
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.slice(3);
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.slice(0, -3);
    }
    cleaned = cleaned.trim();

    const parsed = JSON.parse(cleaned);

    // Fix common AI mistakes
    const validSourceTypes = ['official', 'editorial', 'community'];
    const fixClaim = (claim: unknown) => {
      if (typeof claim === 'object' && claim !== null) {
        const c = claim as Record<string, unknown>;
        // Fix source_type/claim_type confusion
        if (c.source_type && !validSourceTypes.includes(c.source_type as string)) {
          if (c.source_type === 'fact' || c.source_type === 'opinion') {
            if (!c.claim_type) c.claim_type = c.source_type;
            c.source_type = 'editorial';
          }
        }
        // Ensure claim_type exists
        if (!c.claim_type) {
          c.claim_type = 'opinion';
        }
      }
      return claim;
    };

    if (Array.isArray(parsed.pros)) parsed.pros = parsed.pros.map(fixClaim);
    if (Array.isArray(parsed.cons)) parsed.cons = parsed.cons.map(fixClaim);

    // Truncate oversized strings
    if (parsed.verdict && parsed.verdict.length > 200) {
      parsed.verdict = parsed.verdict.slice(0, 197) + '...';
    }
    if (parsed.shortDescription && parsed.shortDescription.length > 200) {
      parsed.shortDescription = parsed.shortDescription.slice(0, 197) + '...';
    }

    // Ensure arrays exist
    if (!parsed.sentimentTags) parsed.sentimentTags = [];
    if (!parsed.vetoLogic) parsed.vetoLogic = [];
    if (!parsed.realityChecks) parsed.realityChecks = [];
    if (!parsed.graphTags) {
      parsed.graphTags = { functions: [], audiences: [], platforms: [] };
    }

    return parsed;
  }

  /**
   * Chunk array into smaller arrays for controlled concurrency
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

/**
 * Synthesize a single tool (fallback for stale items)
 *
 * Used when items have been in research_complete too long (>7 days).
 * Uses Gemini 3 Flash without caching (more expensive but guaranteed).
 */
export async function synthesizeIndividual(
  input: BatchSynthesisInput,
  apiKey: string,
  existingCategories: ExistingCategories
): Promise<HunterAnalysis> {
  const client = new GoogleGenAI({ apiKey });

  // Use a simpler system prompt for individual synthesis
  const systemPrompt = `You are a forensic software analyst. Analyze the tool and output structured JSON.
Follow these rules:
- Every claim must have a source_url
- Negative claims must use hedging ("Users report..." not stating as fact)
- Include 1-3 veto conditions (when to switch to alternatives)
- Include 1-3 reality checks (marketing vs tribal reality)`;

  const factSummary = buildFactSummary(input.researchData.knowledgeCard);
  const scout = input.researchData.scoutResult;
  const snippetBuckets = buildSnippetBucketsFromScout(scout.raw_sources);

  const prompt = `${systemPrompt}

TOOL: ${input.toolName}

VERIFIED FACTS:
${factSummary}

REVIEWS:
${snippetBuckets.reviewsSnippets.join('\n')}

PRICING:
${snippetBuckets.pricingSnippets.join('\n')}

TRIBAL KNOWLEDGE:
${snippetBuckets.tribalKnowledgeSnippets.join('\n')}

Existing Knowledge Graph tags to reuse:
- Functions: ${existingCategories.functions.join(', ')}
- Audiences: ${existingCategories.audiences.join(', ')}

Output ONLY valid JSON matching the HunterAnalysis schema.`;

  const response = await geminiCircuit.execute(async () => {
    return client.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        temperature: 0.3,
        responseMimeType: 'application/json',
        systemInstruction: systemPrompt,
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.HIGH, // High reasoning for individual synthesis
        },
      },
    });
  });

  const content = response.text;
  if (!content) {
    throw new Error(`Empty response for ${input.toolName}`);
  }

  // Parse and validate
  let cleaned = content.trim();
  if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
  if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
  if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);

  const parsed = JSON.parse(cleaned.trim());
  const validated = AnalysisSchema.parse(parsed);

  return validated as HunterAnalysis;
}
