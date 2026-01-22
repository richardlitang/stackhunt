/**
 * Gemini Service - Google AI wrapper
 *
 * Handles text generation and embeddings via Google's Gemini API.
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

export interface GeminiConfig {
  apiKey: string;
}

export interface ExtractKnowledgeCardInput {
  toolName: string;
  reviewsSnippets: string[];
  pricingSnippets: string[];
  alternativesSnippets: string[];
}

export interface SynthesizeInput {
  toolName: string;
  contextTitle?: string;
  reviewsSnippets: string[];
  pricingSnippets: string[];
  alternativesSnippets: string[];
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
   * Extract structured facts (Pass 1 - The Librarian)
   */
  async extractKnowledgeCard(
    input: ExtractKnowledgeCardInput,
    withRetry?: <T>(fn: () => Promise<T>, operation: string) => Promise<T>
  ): Promise<{ knowledgeCard: KnowledgeCard; tokensUsed: number }> {
    const prompt = `You are a fact extraction system. Extract ONLY verifiable facts about "${input.toolName}" from the search results.

CRITICAL RULES:
- Only extract facts that are explicitly mentioned or strongly implied in the sources
- Use null for any field where information is not available
- Prefer verified information from official sources
- Set data_quality to "high" if most facts are from official sources, "medium" if from reviews, "low" if limited data

Search Results:
## Official & Reviews:
${input.reviewsSnippets.join('\n')}

## Pricing & Features:
${input.pricingSnippets.join('\n')}

## Alternatives & Comparisons:
${input.alternativesSnippets.join('\n')}

Extract the knowledge card JSON:`;

    const model = this.client.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        temperature: 0.1, // Low temperature for fact extraction
        responseMimeType: 'application/json',
        responseSchema: GeminiKnowledgeCardSchema as never,
      },
    });

    const generateFn = () => model.generateContent(prompt);
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

    // Validate with Zod
    const validated = KnowledgeCardSchema.parse(parsed);

    const tokensUsed = Math.ceil((prompt.length + content.length) / 4);

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

    const generateFn = () => model.generateContent(prompt);
    const response = withRetry
      ? await withRetry(generateFn, 'Gemini synthesis')
      : await generateFn();

    const result = response.response;
    const content = result.text();
    if (!content) throw new Error('Empty response from Gemini');

    const parsed = JSON.parse(content);
    const validated = AnalysisSchema.parse(parsed);

    // Estimate token count
    const tokensUsed = Math.ceil((prompt.length + content.length) / 4);

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

    const embedFn = () => model.embedContent(text);
    const response = withRetry
      ? await withRetry(embedFn, 'Gemini embedding')
      : await embedFn();

    return response.embedding.values;
  }
}
