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
import { geminiCircuit } from './circuit-breaker.js';
import {
  buildForensicFramework,
  isFrameworkCacheable,
  type ExistingCategories,
} from './forensic-framework.js';
import { buildFactSummary, buildSnippetBucketsFromScout } from '../utils.js';
import type { KnowledgeCard } from '../../knowledge-card.js';
import { getGeminiModelForStage, toCacheModelName } from './model-router.js';
import { generateContentWithThinkingFallback } from './gemini-compat.js';
import { parseAndValidateAnalysisResponse } from './analysis-response.js';

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
        source_type:
          | 'official'
          | 'docs'
          | 'support'
          | 'legal'
          | 'editorial'
          | 'community'
          | 'directory';
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
  analyses: Map<string, { itemId: string; toolName: string; analysis: HunterAnalysis }>;
  tokensUsed: number;
  cacheHitRate: number;
  durationMs: number;
  errors: Array<{ itemId: string; toolName: string; error: string }>;
}

function getPolicyEligibleSources(
  sources: BatchSynthesisInput['researchData']['scoutResult']['raw_sources']
) {
  return sources.filter(
    (source) =>
      source.policy?.acquisition_mode === 'SCRAPE_ALLOWED' &&
      source.policy?.llm_ingestion_allowed !== 'NO'
  );
}

function compactSnippetLines(lines: string[], maxLines: number, maxCharsPerLine: number): string[] {
  const seen = new Set<string>();
  const compacted: string[] = [];

  for (const raw of lines) {
    if (!raw || compacted.length >= maxLines) break;

    const normalized = raw.trim().replace(/\s+/g, ' ');
    if (!normalized) continue;

    const dedupeKey = normalized.toLowerCase();
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    if (normalized.length <= maxCharsPerLine) {
      compacted.push(normalized);
      continue;
    }

    compacted.push(`${normalized.slice(0, maxCharsPerLine - 1)}…`);
  }

  return compacted;
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
    const cacheModel = getGeminiModelForStage('batch_cache');
    const synthesisModel = getGeminiModelForStage('batch_synthesis');

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
      const cache = await (this.client as any).cacheManager.create({
        model: toCacheModelName(cacheModel),
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

    const analyses = new Map<string, { itemId: string; toolName: string; analysis: HunterAnalysis }>();
    const errors: Array<{ itemId: string; toolName: string; error: string }> = [];
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
                model: synthesisModel,
                contents: prompt,
                config: {
                  temperature: 0.3,
                  responseMimeType: 'application/json',
                  systemInstruction: cachedContentName ? undefined : framework.systemInstruction,
                  thinkingConfig: {
                    // Batch path favors throughput + lower cost; keep deep reasoning in full hunts.
                    thinkingLevel: ThinkingLevel.MEDIUM,
                  },
                },
              };

              if (cachedContentName) {
                config.cachedContent = cachedContentName;
              }

              return generateContentWithThinkingFallback(this.client, config);
            });

            const content = response.text;
            if (!content) {
              throw new Error(`Empty response for ${input.toolName}`);
            }

            const validated = parseAndValidateAnalysisResponse(content, { applyClaimFixes: true });

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
              analysis: validated as unknown as HunterAnalysis,
            };
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`[Batch] ✗ ${input.toolName}: ${errorMessage}`);
            errors.push({ itemId: input.itemId, toolName: input.toolName, error: errorMessage });
            throw error;
          }
        })
      );

      // Collect successful results
      for (const result of results) {
        if (result.status === 'fulfilled') {
          analyses.set(result.value.itemId, {
            itemId: result.value.itemId,
            toolName: result.value.toolName,
            analysis: result.value.analysis,
          });
        }
      }
    }

    // Cleanup cache
    if (cachedContentName) {
      try {
        await (this.client as any).cacheManager.delete(cachedContentName);
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
    const eligibleSources = getPolicyEligibleSources(scout.raw_sources);
    const promptSources = eligibleSources.length > 0 ? eligibleSources : scout.raw_sources;
    const snippetBuckets = buildSnippetBucketsFromScout(promptSources);
    const reviews = compactSnippetLines(snippetBuckets.reviewsSnippets, 6, 300);
    const pricing = compactSnippetLines(snippetBuckets.pricingSnippets, 6, 300);
    const alternatives = compactSnippetLines(snippetBuckets.alternativesSnippets, 5, 300);
    const budget = compactSnippetLines(snippetBuckets.budgetAnalystSnippets, 5, 300);
    const tribal = compactSnippetLines(snippetBuckets.tribalKnowledgeSnippets, 6, 300);

    return `
TOOL: ${input.toolName}
${input.contextTitle ? `CONTEXT: ${input.contextTitle}` : ''}
EVIDENCE_COUNTS: reviews=${reviews.length}, pricing=${pricing.length}, alternatives=${alternatives.length}, budget=${budget.length}, tribal=${tribal.length}

=== VERIFIED FACTS (from Pass 1 extraction) ===
${factSummary}

=== REVIEWS & OPINIONS ===
${reviews.join('\n')}

=== PRICING & FEATURES ===
${pricing.join('\n')}

=== ALTERNATIVES & COMPARISONS ===
${alternatives.join('\n')}

=== BUDGET ANALYST (Hidden Costs) ===
${budget.join('\n')}

=== TRIBAL KNOWLEDGE (Reddit/HN) ===
${tribal.join('\n')}

=== SOURCES (Use these URLs for source_url) ===
${promptSources
  .slice(0, 12)
  .map((s) => `- ${s.url} (${s.domain}): ${s.title}`)
  .join('\n')}

Generate the forensic analysis following the cached framework instructions.
Return ONLY valid JSON, no markdown code blocks.
    `.trim();
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
  const model = getGeminiModelForStage('batch_synthesis');

  // Use a simpler system prompt for individual synthesis
  const systemPrompt = `You are a forensic software analyst. Analyze the tool and output structured JSON.
Follow these rules:
- Every claim must have a source_url
- Negative claims must use hedging ("Users report..." not stating as fact)
- Include 1-3 veto conditions (when to switch to alternatives)
- Include 1-3 reality checks (marketing vs tribal reality)`;

  const factSummary = buildFactSummary(input.researchData.knowledgeCard);
  const scout = input.researchData.scoutResult;
  const eligibleSources = getPolicyEligibleSources(scout.raw_sources);
  const promptSources = eligibleSources.length > 0 ? eligibleSources : scout.raw_sources;
  const snippetBuckets = buildSnippetBucketsFromScout(promptSources);
  const reviews = compactSnippetLines(snippetBuckets.reviewsSnippets, 6, 300);
  const pricing = compactSnippetLines(snippetBuckets.pricingSnippets, 6, 300);
  const tribal = compactSnippetLines(snippetBuckets.tribalKnowledgeSnippets, 6, 300);

  const prompt = `${systemPrompt}

TOOL: ${input.toolName}
EVIDENCE_COUNTS: reviews=${reviews.length}, pricing=${pricing.length}, tribal=${tribal.length}

VERIFIED FACTS:
${factSummary}

REVIEWS:
${reviews.join('\n')}

PRICING:
${pricing.join('\n')}

TRIBAL KNOWLEDGE:
${tribal.join('\n')}

Existing Knowledge Graph tags to reuse:
- Functions: ${existingCategories.functions.join(', ')}
- Audiences: ${existingCategories.audiences.join(', ')}

Output ONLY valid JSON matching the HunterAnalysis schema.`;

  const response = await geminiCircuit.execute(async () => {
    return generateContentWithThinkingFallback(client, {
      model,
      contents: prompt,
      config: {
        temperature: 0.3,
        responseMimeType: 'application/json',
        systemInstruction: systemPrompt,
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.MEDIUM,
        },
      },
    });
  });

  const content = response.text;
  if (!content) {
    throw new Error(`Empty response for ${input.toolName}`);
  }

  return parseAndValidateAnalysisResponse(content);
}
