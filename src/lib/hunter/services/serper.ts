/**
 * Serper Service - Google Search API wrapper
 *
 * Handles web searches via Serper API with automatic retry logic.
 *
 * @module hunter/services/serper
 */

import axios from 'axios';
import type { SerperResponse } from '../types';
import { classifySerperError } from '../errors';

export interface SerperConfig {
  apiKey: string;
}

export interface SearchResult {
  reviewsSnippets: string[];
  pricingSnippets: string[];
  alternativesSnippets: string[];
  rawResponses: SerperResponse[];
  sources: Array<{
    url: string;
    title: string;
    snippet: string;
    domain: string;
  }>;
}

export class SerperService {
  private apiKey: string;

  constructor(config: SerperConfig) {
    this.apiKey = config.apiKey;
  }

  /**
   * Perform a single search query
   */
  async search(query: string): Promise<SerperResponse> {
    try {
      const response = await axios.post<SerperResponse>(
        'https://google.serper.dev/search',
        { q: query, num: 10 },
        {
          headers: {
            'X-API-KEY': this.apiKey,
            'Content-Type': 'application/json',
          },
          timeout: 30000, // 30 second timeout
        }
      );
      return response.data;
    } catch (error) {
      throw classifySerperError(error);
    }
  }

  /**
   * Scout for tool information with 3 specialized queries
   */
  async scout(
    toolName: string,
    contextTitle?: string,
    withRetry?: <T>(fn: () => Promise<T>, operation: string) => Promise<T>
  ): Promise<SearchResult> {
    const queries = [
      `${toolName} reviews ${contextTitle || ''}`.trim(),
      `${toolName} pricing features`,
      `${toolName} alternatives comparison`,
    ];

    // Execute searches (with retry if provided)
    const results = await Promise.all(
      queries.map((q) => {
        const searchFn = () => this.search(q);
        return withRetry ? withRetry(searchFn, `Search: ${q}`) : searchFn();
      })
    );

    // Include URL in snippets so AI can cite sources
    const extractSnippets = (response: SerperResponse): string[] =>
      response.organic?.slice(0, 5).map((r) => `[${r.link}] ${r.title}: ${r.snippet}`) || [];

    // Extract sources for storage (deduplicated by URL)
    const sourceMap = new Map<string, { url: string; title: string; snippet: string; domain: string }>();
    for (const response of results) {
      for (const result of response.organic?.slice(0, 5) || []) {
        if (!sourceMap.has(result.link)) {
          try {
            const domain = new URL(result.link).hostname.replace(/^www\./, '');
            sourceMap.set(result.link, {
              url: result.link,
              title: result.title,
              snippet: result.snippet,
              domain,
            });
          } catch {
            // Skip invalid URLs
          }
        }
      }
    }

    return {
      reviewsSnippets: extractSnippets(results[0]),
      pricingSnippets: extractSnippets(results[1]),
      alternativesSnippets: extractSnippets(results[2]),
      rawResponses: results,
      sources: Array.from(sourceMap.values()),
    };
  }

  /**
   * Scout for context discovery (Best X for Y articles)
   */
  async scoutForContext(contextQuery: string): Promise<{
    toolsSnippets: string[];
    reviewsSnippets: string[];
    pricingSnippets: string[];
  }> {
    const queries = [
      contextQuery,
      `${contextQuery} reviews comparison`,
      `${contextQuery} pricing`,
    ];

    const results = await Promise.all(queries.map((q) => this.search(q)));

    const extractSnippets = (response: SerperResponse): string[] =>
      response.organic?.slice(0, 8).map((r) => `[${r.link}] ${r.title}: ${r.snippet}`) || [];

    return {
      toolsSnippets: extractSnippets(results[0]),
      reviewsSnippets: extractSnippets(results[1]),
      pricingSnippets: extractSnippets(results[2]),
    };
  }
}
