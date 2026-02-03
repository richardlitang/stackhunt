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
import { scrapeUrl, identifyPricingUrls } from '../utils/scraper';
import { serperRateLimiter } from './rate-limiter';
import { serperCircuit } from './circuit-breaker';

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
  companySnippets: string[];      // Company info, funding, history
  technicalSnippets: string[];    // API, export, integrations
  // V3.1: Tribal Knowledge Snippets (The "Human Touch")
  budgetAnalystSnippets: string[];  // Hidden costs, billing logic, implementation fees
  tribalKnowledgeSnippets: string[]; // Reddit reviews, honest feedback, power tips, "worth it" discussions
  // V4: Corporate Profiler Snippets (prevents employee count hallucination)
  corporateProfilerSnippets: string[];  // Crunchbase, LinkedIn, stock ticker, official company data
  rawResponses: SerperResponse[];
  sources: Array<{
    url: string;
    title: string;
    snippet: string;
    domain: string;
  }>;
  video?: VideoResult;
  // Deep-dive content for pricing pages (full markdown, not just snippets)
  pricingDeepContent?: string;
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
    return serperCircuit.execute(async () => {
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
    });
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
   * Scout for tool information with 12 specialized queries + video search + deep scraping
   *
   * Queries cover:
   * 1. Reviews and user feedback
   * 2. Pricing and features
   * 3. Pricing comparison (annual vs monthly) - catches hidden annual pricing
   * 4. Alternatives and competitors
   * 5. Company info (funding, founded, HQ)
   * 6. Technical capabilities (API, export, integrations)
   *
   * V3.1: Tribal Knowledge Queries (The "Human Touch")
   * 7. Hidden costs and billing logic (Budget Analyst)
   * 8. Implementation fees and setup costs (Budget Analyst)
   * 9. Reddit reviews and honest feedback (User Advocate - Vibe)
   * 10. "What I wish I knew before" gotchas (User Advocate)
   * 11. Advanced tips and power user tricks (User Advocate - Power Tip)
   * 12. Value perception and ROI discussions (User Advocate - Worth It)
   *
   * Deep Scraping:
   * - Identifies pricing pages from results
   * - Fetches full page content via Jina.ai Reader
   * - Returns markdown for LLM to extract pricing tables
   */
  async scout(
    toolName: string,
    contextTitle?: string,
    withRetry?: <T>(fn: () => Promise<T>, operation: string) => Promise<T>
  ): Promise<SearchResult> {
    const queries = [
      // Factual queries (existing)
      `${toolName} reviews ${contextTitle || ''}`.trim(),
      `${toolName} pricing plans features`,
      `${toolName} pricing annual vs monthly cost`,
      `${toolName} alternatives competitors vs`,
      `${toolName} company founded funding headquarters`,
      `${toolName} API integrations data export import`,

      // Budget Analyst queries (TCO & hidden costs)
      `${toolName} hidden costs billing logic`,
      `${toolName} implementation fees setup cost minimum seats`,

      // User Advocate queries (tribal knowledge & vibe)
      `${toolName} reddit review pros cons`,
      `${toolName} what I wish I knew before using`,
      `${toolName} advanced tips tricks shortcuts power user`,
      `is ${toolName} worth it reddit honest review`,

      // V4: Corporate Profiler query (prevents employee count hallucination)
      `"${toolName}" company employees revenue headquarters stock ticker Crunchbase LinkedIn`,
    ];

    // Execute searches with rate limiting (with retry if provided)
    const [results, video] = await Promise.all([
      // Web searches - rate limited to prevent API throttling
      serperRateLimiter.executeAll(
        queries.map((q) => () => {
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

    // DEEP DIVE: Scrape pricing pages for full content
    // Combine results from pricing queries (index 1 and 2)
    const pricingResults = [
      ...(results[1]?.organic || []),
      ...(results[2]?.organic || []),
    ];
    const pricingUrls = identifyPricingUrls(pricingResults, 3);

    let pricingDeepContent: string | undefined;
    if (pricingUrls.length > 0) {
      console.log(`[Serper] Deep diving into ${pricingUrls.length} pricing pages...`);
      const scrapedPages = await Promise.all(
        pricingUrls.map(async (url) => {
          const content = await scrapeUrl(url);
          if (content) {
            return `\n=== PRICING PAGE: ${url} ===\n${content}\n`;
          }
          return null;
        })
      );

      const validContent = scrapedPages.filter(Boolean).join('\n');
      if (validContent) {
        pricingDeepContent = validContent;
        console.log(`[Serper] Scraped ${scrapedPages.filter(Boolean).length}/${pricingUrls.length} pricing pages successfully`);
      }
    }

    // Combine Budget Analyst queries (hidden costs + implementation fees)
    const budgetAnalystSnippets = [
      ...extractSnippets(results[6]),  // hidden costs
      ...extractSnippets(results[7]),  // implementation fees
    ];

    // Combine User Advocate queries (Reddit + gotchas + power tips + worth it)
    const tribalKnowledgeSnippets = [
      ...extractSnippets(results[8]),   // reddit reviews
      ...extractSnippets(results[9]),   // what I wish I knew
      ...extractSnippets(results[10]),  // advanced tips/tricks
      ...extractSnippets(results[11]),  // is it worth it
    ];

    // V4: Corporate Profiler query (employee counts, stock ticker, official data)
    const corporateProfilerSnippets = extractSnippets(results[12]);

    return {
      reviewsSnippets: extractSnippets(results[0]),
      pricingSnippets: extractSnippets(results[1]),
      alternativesSnippets: extractSnippets(results[3]),
      companySnippets: extractSnippets(results[4]),
      technicalSnippets: extractSnippets(results[5]),
      budgetAnalystSnippets,
      tribalKnowledgeSnippets,
      corporateProfilerSnippets,
      rawResponses: results,
      sources: Array.from(sourceMap.values()),
      video: video || undefined,
      pricingDeepContent,
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
