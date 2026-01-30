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

export interface VideoResult {
  videoId: string;
  title: string;
  channel: string;
  duration?: string;
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
  video?: VideoResult;
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
   * Search for YouTube videos
   */
  async searchVideos(query: string): Promise<VideoResult | null> {
    try {
      const response = await axios.post<{
        videos?: Array<{
          title: string;
          link: string;
          channel: string;
          duration?: string;
        }>;
      }>(
        'https://google.serper.dev/videos',
        { q: query, num: 5 },
        {
          headers: {
            'X-API-KEY': this.apiKey,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      // Find best video: prefer official channels, demos, reviews, tutorials
      const videos = response.data.videos || [];
      const priorityKeywords = ['official', 'demo', 'review', 'tutorial', 'walkthrough', 'overview', 'getting started'];

      // Score and sort videos
      const scoredVideos = videos
        .filter(v => v.link.includes('youtube.com/watch'))
        .map(v => {
          let score = 0;
          const titleLower = v.title.toLowerCase();
          const channelLower = v.channel.toLowerCase();

          // Boost for priority keywords
          for (const keyword of priorityKeywords) {
            if (titleLower.includes(keyword)) score += 2;
          }

          // Boost for official channels (channel name matches query)
          const queryWords = query.toLowerCase().split(' ');
          for (const word of queryWords) {
            if (word.length > 3 && channelLower.includes(word)) {
              score += 3; // Strong preference for official channels
            }
          }

          // Slight penalty for very long videos (likely full courses)
          if (v.duration) {
            const match = v.duration.match(/(\d+):(\d+)/);
            if (match) {
              const minutes = parseInt(match[1]);
              if (minutes > 30) score -= 1;
              if (minutes >= 5 && minutes <= 15) score += 1; // Sweet spot
            }
          }

          return { ...v, score };
        })
        .sort((a, b) => b.score - a.score);

      if (scoredVideos.length === 0) return null;

      const best = scoredVideos[0];
      const videoId = this.extractYouTubeId(best.link);

      if (!videoId) return null;

      return {
        videoId,
        title: best.title,
        channel: best.channel,
        duration: best.duration,
      };
    } catch {
      // Video search is optional - don't fail the whole hunt
      return null;
    }
  }

  /**
   * Extract YouTube video ID from URL
   */
  private extractYouTubeId(url: string): string | null {
    const match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
  }

  /**
   * Scout for tool information with 3 specialized queries + video search
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

    // Execute searches in parallel (with retry if provided)
    const [results, video] = await Promise.all([
      // Web searches
      Promise.all(
        queries.map((q) => {
          const searchFn = () => this.search(q);
          return withRetry ? withRetry(searchFn, `Search: ${q}`) : searchFn();
        })
      ),
      // Video search (runs in parallel with web searches)
      this.searchVideos(`${toolName} demo tutorial overview`),
    ]);

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
      video: video || undefined,
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
