/**
 * Gemini Service - Google AI wrapper
 *
 * Handles text generation and embeddings via Google's Gemini API.
 * Refactored for maintainability:
 * - Prompts extracted to separate files
 * - URL sanitization via utility
 * - Actual token counts from API response
 *
 * @module hunter/services/gemini
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  KnowledgeCardSchema,
  GeminiKnowledgeCardSchema,
  type KnowledgeCard,
} from '../../knowledge-card';
import { AnalysisSchema, type HunterAnalysis } from '../types';
import { classifyGeminiError } from '../errors';
import { geminiCircuit } from './circuit-breaker';
import { buildExtractionPrompt } from '../prompts/extraction';
import { sanitizeUrl } from '../../utils/url';

export interface GeminiConfig {
  apiKey: string;
}

export interface ExtractKnowledgeCardInput {
  toolName: string;
  contextTitle?: string;          // Context for audience-aware extraction (e.g., "Google Ads alternatives")
  reviewsSnippets: string[];
  pricingSnippets: string[];
  alternativesSnippets: string[];
  companySnippets: string[];      // Company info, funding, history
  technicalSnippets: string[];    // API, export, integrations
  corporateProfilerSnippets?: string[];  // V4: Crunchbase, LinkedIn, stock ticker (prevents employee hallucination)
  pricingDeepContent?: string;    // Full page content from pricing pages (via Jina.ai)
}

export interface SynthesizeInput {
  toolName: string;
  contextTitle?: string;
  reviewsSnippets: string[];
  pricingSnippets: string[];
  alternativesSnippets: string[];
  // V3.1: Tribal Knowledge Snippets
  budgetAnalystSnippets: string[];      // Hidden costs, billing logic, implementation fees
  tribalKnowledgeSnippets: string[];    // Reddit reviews, honest feedback, power tips
  knowledgeCardFacts: string;
  existingCategories: {
    functions: string[];
    audiences: string[];
    platforms: string[];
  };
  promptTemplate: string;
}

export class GeminiService {
  private client: GoogleGenerativeAI;

  constructor(config: GeminiConfig) {
    this.client = new GoogleGenerativeAI(config.apiKey);
  }

  /**
   * Extract structured facts (Pass 1 - The Librarian + Forensic Accountant)
   */
  async extractKnowledgeCard(
    input: ExtractKnowledgeCardInput,
    withRetry?: <T>(fn: () => Promise<T>, operation: string) => Promise<T>
  ): Promise<{ knowledgeCard: KnowledgeCard; tokensUsed: number }> {
    const toolSlug = input.toolName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    // Build prompt from extracted template (see prompts/extraction.ts)
    const prompt = buildExtractionPrompt({
      toolName: input.toolName,
      toolSlug,
      contextTitle: input.contextTitle,
      reviewsSnippets: input.reviewsSnippets,
      pricingSnippets: input.pricingSnippets,
      alternativesSnippets: input.alternativesSnippets,
      companySnippets: input.companySnippets,
      technicalSnippets: input.technicalSnippets,
      corporateProfilerSnippets: input.corporateProfilerSnippets,
      pricingDeepContent: input.pricingDeepContent,
    });

    const model = this.client.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        temperature: 0.1, // Low temperature for fact extraction
        responseMimeType: 'application/json',
        responseSchema: GeminiKnowledgeCardSchema as never,
      },
    });

    const generateFn = async () => {
      return geminiCircuit.execute(async () => {
        try {
          return await model.generateContent(prompt);
        } catch (error) {
          throw classifyGeminiError(error);
        }
      });
    };
    const response = withRetry
      ? await withRetry(generateFn, 'Gemini fact extraction')
      : await generateFn();

    const content = response.response.text();
    if (!content) throw new Error('Empty response from Gemini fact extraction');

    const parsed = JSON.parse(content);

    // Add extraction date
    parsed.meta = {
      ...parsed.meta,
      extraction_date: new Date().toISOString().split('T')[0],
    };

    // Sanitize URLs using utility (handles missing protocol, invalid formats)
    parsed.website_url = sanitizeUrl(parsed.website_url);
    parsed.logo_url = sanitizeUrl(parsed.logo_url);

    // Validate with Zod
    const validated = KnowledgeCardSchema.parse(parsed);

    // Use actual token count from API response, fallback to heuristic
    const tokensUsed = response.response.usageMetadata?.totalTokenCount
      ?? Math.ceil((prompt.length + content.length) / 4);

    return { knowledgeCard: validated, tokensUsed };
  }

  /**
   * Synthesize analysis with contextual review (Pass 2 - The Architect)
   */
  async synthesize(
    input: SynthesizeInput,
    withRetry?: <T>(fn: () => Promise<T>, operation: string) => Promise<T>
  ): Promise<{ analysis: HunterAnalysis; tokensUsed: number }> {
    // Prompt should already be interpolated with variables
    const prompt = input.promptTemplate;

    const model = this.client.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        temperature: 0.3,
        responseMimeType: 'application/json',
      },
    });

    const generateFn = async () => {
      return geminiCircuit.execute(async () => {
        try {
          return await model.generateContent(prompt);
        } catch (error) {
          throw classifyGeminiError(error);
        }
      });
    };
    const response = withRetry
      ? await withRetry(generateFn, 'Gemini synthesis')
      : await generateFn();

    const result = response.response;
    const content = result.text();
    if (!content) throw new Error('Empty response from Gemini');

    const parsed = JSON.parse(content);

    // Fix common AI mistakes: source_type and claim_type confusion
    // AI sometimes puts "fact"/"opinion" in source_type instead of claim_type
    const validSourceTypes = ['official', 'editorial', 'community'];
    const fixClaim = (claim: unknown) => {
      if (typeof claim === 'object' && claim !== null) {
        const c = claim as Record<string, unknown>;
        // If source_type has a claim_type value, swap them
        if (c.source_type && !validSourceTypes.includes(c.source_type as string)) {
          // source_type has invalid value - check if it looks like a claim_type
          if (c.source_type === 'fact' || c.source_type === 'opinion') {
            // Move the value to claim_type if claim_type is missing
            if (!c.claim_type) {
              c.claim_type = c.source_type;
            }
            // Default source_type to 'editorial' (safe middle ground)
            c.source_type = 'editorial';
          }
        }
      }
      return claim;
    };
    if (Array.isArray(parsed.pros)) {
      parsed.pros = parsed.pros.map(fixClaim);
    }
    if (Array.isArray(parsed.cons)) {
      parsed.cons = parsed.cons.map(fixClaim);
    }

    // Fix verdict: truncate if too long (max 200 chars)
    if (parsed.verdict && typeof parsed.verdict === 'string' && parsed.verdict.length > 200) {
      parsed.verdict = parsed.verdict.slice(0, 197) + '...';
    }

    // Fix shortDescription: truncate if too long (max 200 chars)
    if (parsed.shortDescription && typeof parsed.shortDescription === 'string' && parsed.shortDescription.length > 200) {
      parsed.shortDescription = parsed.shortDescription.slice(0, 197) + '...';
    }

    // Sanitize websiteUrl using utility (handles missing protocol, invalid formats)
    const sanitizedUrl = sanitizeUrl(parsed.websiteUrl);
    if (sanitizedUrl) {
      parsed.websiteUrl = sanitizedUrl;
    } else {
      delete parsed.websiteUrl;
    }

    const validated = AnalysisSchema.parse(parsed);

    // Use actual token count from API response, fallback to heuristic
    const tokensUsed = result.usageMetadata?.totalTokenCount
      ?? Math.ceil((prompt.length + content.length) / 4);

    return {
      analysis: validated as HunterAnalysis,
      tokensUsed,
    };
  }

  /**
   * Generate text embeddings for semantic search
   */
  async generateEmbedding(
    text: string,
    withRetry?: <T>(fn: () => Promise<T>, operation: string) => Promise<T>
  ): Promise<number[]> {
    const model = this.client.getGenerativeModel({ model: 'text-embedding-004' });

    const embedFn = async () => {
      return geminiCircuit.execute(async () => {
        try {
          return await model.embedContent(text);
        } catch (error) {
          throw classifyGeminiError(error);
        }
      });
    };
    const response = withRetry
      ? await withRetry(embedFn, 'Gemini embedding')
      : await embedFn();

    return response.embedding.values;
  }
}
