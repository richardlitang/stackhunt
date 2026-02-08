/**
 * Verification Service - AI-powered claim verification
 *
 * Verifies user-submitted corrections against scraped data.
 * Used by the weekly verification cron to batch-process corrections.
 *
 * @module verification
 */

import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import axios from 'axios';
import { generateContentWithThinkingFallback } from '@/lib/hunter/services/gemini-compat';

export interface VerificationConfig {
  geminiApiKey: string;
  serperApiKey: string;
}

export interface CorrectionToVerify {
  id: string;
  toolId: string;
  toolName: string;
  toolWebsite: string | null;
  fieldName: string;
  correctionText: string;
}

export interface VerificationResult {
  correctionId: string;
  result: 'confirmed' | 'rejected' | 'inconclusive';
  notes: string;
  scrapedData?: string;
  tokensUsed: number;
}

export interface BatchVerificationResult {
  batchId: string;
  results: VerificationResult[];
  totalTokensUsed: number;
  confirmedCount: number;
  rejectedCount: number;
  inconclusiveCount: number;
}

/**
 * Verification Service
 * Lightweight AI verification for user-submitted corrections
 */
export class VerificationService {
  private gemini: GoogleGenAI;
  private serperApiKey: string;

  constructor(config: VerificationConfig) {
    this.gemini = new GoogleGenAI({ apiKey: config.geminiApiKey });
    this.serperApiKey = config.serperApiKey;
  }

  /**
   * Search for specific information about a tool
   */
  private async searchForData(toolName: string, fieldName: string): Promise<string[]> {
    const queryMap: Record<string, string> = {
      pricing: `${toolName} pricing plans cost per month`,
      pros: `${toolName} advantages benefits review`,
      cons: `${toolName} disadvantages limitations review`,
      summary: `${toolName} what is overview features`,
      score: `${toolName} rating review score`,
      other: `${toolName} official information`,
    };

    const query = queryMap[fieldName] || queryMap.other;

    try {
      const response = await axios.post<{
        organic?: Array<{ title: string; snippet: string; link: string }>;
      }>(
        'https://google.serper.dev/search',
        { q: query, num: 5 },
        {
          headers: {
            'X-API-KEY': this.serperApiKey,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data.organic?.map((r) => `[${r.link}] ${r.title}: ${r.snippet}`) || [];
    } catch (error) {
      console.error('Search error:', error);
      return [];
    }
  }

  /**
   * Verify a single correction using AI
   */
  async verifySingleCorrection(correction: CorrectionToVerify): Promise<VerificationResult> {
    // 1. Search for current data
    const searchResults = await this.searchForData(correction.toolName, correction.fieldName);

    if (searchResults.length === 0) {
      return {
        correctionId: correction.id,
        result: 'inconclusive',
        notes: 'Could not find any search results to verify this claim.',
        tokensUsed: 0,
      };
    }

    // 2. Ask AI to verify the claim
    const prompt = `You are a fact-checker verifying a user-submitted correction about software.

TOOL: ${correction.toolName}
FIELD: ${correction.fieldName}
USER CLAIM: "${correction.correctionText}"

CURRENT SEARCH RESULTS:
${searchResults.join('\n\n')}

Based on the search results, determine if the user's claim is:
1. CONFIRMED - The search results support the user's claim
2. REJECTED - The search results contradict the user's claim
3. INCONCLUSIVE - Not enough information to verify either way

Respond with ONLY valid JSON in this exact format:
{
  "result": "confirmed" | "rejected" | "inconclusive",
  "notes": "Brief explanation (1-2 sentences) of why you reached this conclusion",
  "evidence": "Key quote or data point from search results that supports your conclusion"
}`;

    try {
      const response = await generateContentWithThinkingFallback(this.gemini, {
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          temperature: 0.1,
          responseMimeType: 'application/json',
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.LOW, // Fast verification
          },
        },
      });

      const content = response.text;

      if (!content) {
        return {
          correctionId: correction.id,
          result: 'inconclusive',
          notes: 'AI returned empty response.',
          tokensUsed: 0,
        };
      }

      const parsed = JSON.parse(content) as {
        result: 'confirmed' | 'rejected' | 'inconclusive';
        notes: string;
        evidence?: string;
      };

      // Estimate tokens
      const tokensUsed = Math.ceil((prompt.length + content.length) / 4);

      return {
        correctionId: correction.id,
        result: parsed.result,
        notes: parsed.evidence ? `${parsed.notes} Evidence: ${parsed.evidence}` : parsed.notes,
        scrapedData: searchResults.slice(0, 2).join('\n'),
        tokensUsed,
      };
    } catch (error) {
      console.error('AI verification error:', error);
      return {
        correctionId: correction.id,
        result: 'inconclusive',
        notes: `AI verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        tokensUsed: 0,
      };
    }
  }

  /**
   * Verify a batch of corrections for a single tool
   * (Deduplication: multiple corrections about the same tool = one search)
   */
  async verifyToolCorrections(
    toolName: string,
    toolWebsite: string | null,
    corrections: CorrectionToVerify[]
  ): Promise<VerificationResult[]> {
    // Group corrections by field type
    const byField = new Map<string, CorrectionToVerify[]>();
    for (const c of corrections) {
      const existing = byField.get(c.fieldName) || [];
      existing.push(c);
      byField.set(c.fieldName, existing);
    }

    const results: VerificationResult[] = [];

    // Verify each field type once (deduplication win)
    for (const [fieldName, fieldCorrections] of byField) {
      // Search once per field type
      const searchResults = await this.searchForData(toolName, fieldName);

      if (searchResults.length === 0) {
        // Mark all as inconclusive
        for (const c of fieldCorrections) {
          results.push({
            correctionId: c.id,
            result: 'inconclusive',
            notes: 'Could not find search results to verify.',
            tokensUsed: 0,
          });
        }
        continue;
      }

      // Verify each correction in this field group
      for (const correction of fieldCorrections) {
        const result = await this.verifyWithSearchResults(correction, searchResults);
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Verify a correction using pre-fetched search results
   */
  private async verifyWithSearchResults(
    correction: CorrectionToVerify,
    searchResults: string[]
  ): Promise<VerificationResult> {
    const prompt = `You are a fact-checker verifying a user-submitted correction about software.

TOOL: ${correction.toolName}
FIELD: ${correction.fieldName}
USER CLAIM: "${correction.correctionText}"

SEARCH RESULTS:
${searchResults.join('\n\n')}

Based on the search results, determine if the user's claim is:
1. CONFIRMED - The search results support the user's claim
2. REJECTED - The search results contradict the user's claim
3. INCONCLUSIVE - Not enough information to verify

Respond with ONLY valid JSON:
{
  "result": "confirmed" | "rejected" | "inconclusive",
  "notes": "Brief explanation (1-2 sentences)"
}`;

    try {
      const response = await generateContentWithThinkingFallback(this.gemini, {
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          temperature: 0.1,
          responseMimeType: 'application/json',
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.LOW, // Fast verification
          },
        },
      });

      const content = response.text;

      if (!content) {
        return {
          correctionId: correction.id,
          result: 'inconclusive',
          notes: 'AI returned empty response.',
          tokensUsed: 0,
        };
      }

      const parsed = JSON.parse(content) as {
        result: 'confirmed' | 'rejected' | 'inconclusive';
        notes: string;
      };

      const tokensUsed = Math.ceil((prompt.length + content.length) / 4);

      return {
        correctionId: correction.id,
        result: parsed.result,
        notes: parsed.notes,
        tokensUsed,
      };
    } catch (error) {
      return {
        correctionId: correction.id,
        result: 'inconclusive',
        notes: `Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        tokensUsed: 0,
      };
    }
  }
}

/**
 * Create a verification service instance
 */
export function createVerificationService(): VerificationService {
  const geminiApiKey = import.meta.env.GEMINI_API_KEY;
  const serperApiKey = import.meta.env.SERPER_API_KEY;

  if (!geminiApiKey || !serperApiKey) {
    throw new Error('Missing GEMINI_API_KEY or SERPER_API_KEY');
  }

  return new VerificationService({
    geminiApiKey,
    serperApiKey,
  });
}
