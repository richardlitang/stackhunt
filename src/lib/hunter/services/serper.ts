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
    retrieved_at?: string;
    published_at?: string;
    time_since?: string;
  }>;
  video?: VideoResult;
  // Deep-dive content for pricing pages (full markdown, not just snippets)
  pricingDeepContent?: string;
  // V6: Deep-dive content for tribal threads (full Reddit/HN discussions, not snippets)
  // The "Source Resolution" fix - actual content instead of 160-char snippets
  tribalDeepContent?: string;
  faqs?: Array<{
    question: string;
    answer: string;
    source: 'paa' | 'forum' | 'reddit';
    source_url?: string;
  }>;
}

export class SerperService {
  private apiKey: string;

  constructor(config: SerperConfig) {
    this.apiKey = config.apiKey;
  }

  private static cache = new Map<string, { expiresAt: number; value: SerperResponse }>();
  private static cacheTtlMs = (() => {
    const raw = typeof process !== 'undefined' ? process.env.SERPER_CACHE_TTL_MS : undefined;
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 12 * 60 * 60 * 1000;
  })();

  private static getCached(key: string): SerperResponse | null {
    const entry = SerperService.cache.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      SerperService.cache.delete(key);
      return null;
    }
    return entry.value;
  }

  private static setCached(key: string, value: SerperResponse): void {
    SerperService.cache.set(key, {
      value,
      expiresAt: Date.now() + SerperService.cacheTtlMs,
    });
  }

  /**
   * Perform a single search query
   */
  async search(query: string, options?: { tbs?: string }): Promise<SerperResponse> {
    const cacheKey = `${query}::${options?.tbs || ''}`;
    const cached = SerperService.getCached(cacheKey);
    if (cached) {
      return cached;
    }

    return serperCircuit.execute(async () => {
      try {
        const response = await axios.post<SerperResponse>(
          'https://google.serper.dev/search',
          { q: query, num: 10, tbs: options?.tbs },
          {
            headers: {
              'X-API-KEY': this.apiKey,
              'Content-Type': 'application/json',
            },
            timeout: 30000, // 30 second timeout
          }
        );
        SerperService.setCached(cacheKey, response.data);
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
    withRetry?: <T>(fn: () => Promise<T>, operation: string) => Promise<T>,
    dossierQueries?: string[] // NEW: Pre-generated queries from Classifier's Research Dossier
  ): Promise<SearchResult> {
    type QueryType =
      | 'reviews'
      | 'pricing'
      | 'pricing_compare'
      | 'alternatives'
      | 'company'
      | 'technical'
      | 'release_notes'
      | 'budget_hidden'
      | 'budget_setup'
      | 'forums'
      | 'tribal_reddit_hate'
      | 'tribal_hn_pricing'
      | 'tribal_reddit_vs'
      | 'tribal_reddit_gotchas'
      | 'corp_profiler'
      | 'dossier';

    const classifyDossierQuery = (query: string): QueryType => {
      const q = query.toLowerCase();
      if (q.includes('release notes') || q.includes('changelog') || q.includes('updates') || q.includes('release')) {
        return 'release_notes';
      }
      if (q.includes('pricing') || q.includes('price') || q.includes('plans') || q.includes('cost')) {
        return q.includes('annual') || q.includes('monthly') ? 'pricing_compare' : 'pricing';
      }
      if (q.includes('alternative') || q.includes('competitor') || q.includes('vs')) {
        return 'alternatives';
      }
      if (q.includes('company') || q.includes('funding') || q.includes('headquarter') || q.includes('employees')) {
        return 'company';
      }
      if (q.includes('api') || q.includes('integration') || q.includes('export') || q.includes('import')) {
        return 'technical';
      }
      if (q.includes('review') || q.includes('ratings')) {
        return 'reviews';
      }
      return 'dossier';
    };

    const recencyTbsForType = (type: QueryType): string | undefined => {
      const recentTypes: QueryType[] = [
        'pricing',
        'pricing_compare',
        'company',
        'release_notes',
      ];
      return recentTypes.includes(type) ? 'qdr:y' : undefined;
    };

    const buildQueryPlans = (): {
      core: Array<{ type: QueryType; query: string }>;
      supplemental: Array<{ type: QueryType; query: string }>;
    } => {
      if (dossierQueries && dossierQueries.length > 0) {
        const core = [
          ...dossierQueries.map((query) => ({ type: classifyDossierQuery(query), query })),
          { type: 'tribal_reddit_hate', query: `site:reddit.com "${toolName}" "sucks" OR "slow" OR "broken" OR "issues"` },
        ];
        const supplemental = [
          { type: 'tribal_hn_pricing', query: `site:news.ycombinator.com "${toolName}" pricing OR limits` },
          { type: 'tribal_reddit_gotchas', query: `site:reddit.com "${toolName}" "wish I knew" OR "gotcha"` },
          { type: 'forums', query: `"${toolName}" (forum OR community OR discourse OR boards)` },
          { type: 'corp_profiler', query: `"${toolName}" company employees revenue headquarters stock ticker Crunchbase LinkedIn` },
          { type: 'release_notes', query: `"${toolName}" release notes OR changelog OR updates` },
        ];
        return { core, supplemental };
      }

      const core = [
        { type: 'reviews', query: `${toolName} reviews ${contextTitle || ''}`.trim() },
        { type: 'pricing', query: `${toolName} pricing plans features` },
        { type: 'pricing_compare', query: `${toolName} pricing annual vs monthly cost` },
        { type: 'alternatives', query: `${toolName} alternatives competitors vs` },
        { type: 'company', query: `${toolName} company founded funding headquarters` },
        { type: 'technical', query: `${toolName} API integrations data export import` },
      ];

      const supplemental = [
        { type: 'budget_hidden', query: `${toolName} hidden costs billing logic` },
        { type: 'budget_setup', query: `${toolName} implementation fees setup cost minimum seats` },
        { type: 'tribal_reddit_hate', query: `site:reddit.com "${toolName}" "sucks" OR "slow" OR "broken" OR "issues" -intitle:"alternatives"` },
        { type: 'tribal_hn_pricing', query: `site:news.ycombinator.com "${toolName}" pricing OR limits OR "rate limit"` },
        { type: 'tribal_reddit_vs', query: `site:reddit.com "${toolName} vs" OR "switched from" OR "switched to"` },
        { type: 'tribal_reddit_gotchas', query: `site:reddit.com "${toolName}" "wish I knew" OR "gotcha" OR "warning"` },
        { type: 'forums', query: `"${toolName}" (forum OR community OR discourse OR boards)` },
        { type: 'corp_profiler', query: `"${toolName}" company employees revenue headquarters stock ticker Crunchbase LinkedIn` },
        { type: 'release_notes', query: `"${toolName}" release notes OR changelog OR updates` },
      ];
      return { core, supplemental };
    };

    const { core: corePlan, supplemental: supplementalPlan } = buildQueryPlans();

    // Execute searches with rate limiting (with retry if provided)
    const executePlan = (plan: Array<{ type: QueryType; query: string }>) =>
      serperRateLimiter.executeAll(
        plan.map(({ query, type }) => () => {
          const searchFn = () => this.search(query, { tbs: recencyTbsForType(type) });
          return withRetry ? withRetry(searchFn, `Search: ${query}`) : searchFn();
        })
      );

    const [coreResults, video] = await Promise.all([
      executePlan(corePlan),
      this.searchVideos(`${toolName} demo tutorial overview`),
    ]);

    const extractSnippets = (response: SerperResponse): string[] =>
      response.organic?.slice(0, 5).map((r) => `[${r.link}] ${r.title}: ${r.snippet}`) || [];

    const coreSnippets = coreResults.flatMap(extractSnippets);
    const coreDomains = new Set(
      coreResults.flatMap(r => r.organic || []).map(r => {
        try {
          return new URL(r.link).hostname.replace(/^www\./, '');
        } catch {
          return '';
        }
      }).filter(Boolean)
    );

    const shouldRunSupplemental =
      coreSnippets.length < 18 || coreDomains.size < 7;

    const supplementalResults = shouldRunSupplemental
      ? await executePlan(supplementalPlan)
      : [];

    if (!shouldRunSupplemental) {
      console.log(`[Serper] Skipping supplemental queries (core coverage: ${coreSnippets.length} snippets, ${coreDomains.size} domains)`);
    }

    // Include URL in snippets so AI can cite sources
    const results = [...coreResults, ...supplementalResults];
    const queryPlan = [...corePlan, ...supplementalPlan];

    // Extract sources for storage (deduplicated by URL)
    const retrievedAt = new Date().toISOString();
    const sourceMap = new Map<string, { url: string; title: string; snippet: string; domain: string; retrieved_at: string; published_at?: string; time_since?: string }>();
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
              retrieved_at: retrievedAt,
              published_at: (result as any).date || (result as any).dateString || undefined,
              time_since: (result as any).timeSince || undefined,
            });
          } catch {
            // Skip invalid URLs
          }
        }
      }
    }

    const resultsByType = new Map<QueryType, SerperResponse[]>();
    queryPlan.forEach((plan, index) => {
      const bucket = resultsByType.get(plan.type) || [];
      const result = results[index];
      if (result) {
        bucket.push(result);
        resultsByType.set(plan.type, bucket);
      }
    });

    const getSnippetsForTypes = (types: QueryType[]) =>
      types.flatMap((type) => (resultsByType.get(type) || []).flatMap(extractSnippets));

    const getOrganicForTypes = (types: QueryType[]) =>
      types.flatMap((type) => (resultsByType.get(type) || []).flatMap((r) => r.organic || []));

    const cleanText = (value: string): string => value.replace(/\s+/g, ' ').trim();
    const normalizeQuestionKey = (value: string): string =>
      value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const isQuestionLike = (value: string): boolean => {
      const text = value.toLowerCase().trim();
      if (text.includes('?')) return true;
      if (/^(how|what|why|is|are|can|does|do|should|which|where|when|who)\b/.test(text)) return true;
      if (text.includes(' vs ')) return true;
      if (text.includes('alternatives')) return true;
      if (text.includes('worth it')) return true;
      return false;
    };
    const truncateAnswer = (value: string, max = 200): string => {
      const text = cleanText(value);
      if (text.length <= max) return text;
      const trimmed = text.slice(0, max).replace(/\s+\S*$/, '');
      return `${trimmed}...`;
    };
    const isForumSource = (domain: string, url: string): boolean => {
      const haystack = `${domain} ${url}`.toLowerCase();
      const indicators = ['forum', 'forums', 'community', 'discourse', 'boards', 'support', 'help', 'stackexchange'];
      return indicators.some((indicator) => haystack.includes(indicator));
    };

    const faqCandidates: Array<{
      question: string;
      answer: string;
      source: 'paa' | 'forum' | 'reddit';
      source_url?: string;
    }> = [];

    const addFaqCandidate = (candidate: {
      question: string;
      answer: string;
      source: 'paa' | 'forum' | 'reddit';
      source_url?: string;
    }) => {
      const question = cleanText(candidate.question);
      const answer = truncateAnswer(candidate.answer);
      if (!question || !answer || answer.length < 30) return;
      if (!isQuestionLike(question)) return;
      faqCandidates.push({ ...candidate, question, answer });
    };

    // People Also Ask (if provided by Serper)
    for (const response of results) {
      for (const paa of response.peopleAlsoAsk || []) {
        if (!paa.question || !paa.snippet) continue;
        addFaqCandidate({
          question: paa.question,
          answer: paa.snippet,
          source: 'paa',
          source_url: paa.link,
        });
      }
    }

    const sources = Array.from(sourceMap.values());
    for (const source of sources) {
      if (source.domain.includes('reddit.com')) {
        addFaqCandidate({
          question: source.title,
          answer: source.snippet,
          source: 'reddit',
          source_url: source.url,
        });
        continue;
      }

      if (source.domain.includes('ycombinator.com')) continue;

      if (isForumSource(source.domain, source.url)) {
        addFaqCandidate({
          question: source.title,
          answer: source.snippet,
          source: 'forum',
          source_url: source.url,
        });
      }
    }

    const faqPriority: Record<'paa' | 'forum' | 'reddit', number> = {
      paa: 0,
      forum: 1,
      reddit: 2,
    };
    const dedupedFaqs: typeof faqCandidates = [];
    const seenQuestions = new Set<string>();
    faqCandidates
      .sort((a, b) => faqPriority[a.source] - faqPriority[b.source])
      .forEach((candidate) => {
        const key = normalizeQuestionKey(candidate.question);
        if (!key || seenQuestions.has(key)) return;
        seenQuestions.add(key);
        dedupedFaqs.push(candidate);
      });

    const faqs = dedupedFaqs.slice(0, 5);

    // DEEP DIVE: Scrape pricing pages for full content
    const pricingResults = getOrganicForTypes(['pricing', 'pricing_compare']);
    const pricingUrls = identifyPricingUrls(pricingResults, coreSnippets.length >= 24 ? 2 : 3);

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

    const budgetAnalystSnippets = getSnippetsForTypes(['budget_hidden', 'budget_setup']);

    const tribalKnowledgeSnippets = getSnippetsForTypes([
      'tribal_reddit_hate',
      'tribal_hn_pricing',
      'tribal_reddit_vs',
      'tribal_reddit_gotchas',
    ]);

    // DEEP DIVE: Scrape tribal threads for FULL discussions (not snippets)
    // This is the "Source Resolution" fix - we need actual content, not 160-char snippets
    const tribalResults = getOrganicForTypes([
      'tribal_reddit_hate',
      'tribal_hn_pricing',
      'tribal_reddit_vs',
      'tribal_reddit_gotchas',
    ]);

    // Filter to ONLY reddit.com and news.ycombinator.com (the nerds, not marketers)
    const tribalUrls = tribalResults
      .filter((result) => {
        try {
          const domain = new URL(result.link).hostname;
          return domain.includes('reddit.com') || domain.includes('ycombinator.com');
        } catch {
          return false;
        }
      })
      .slice(0, 7) // Top 7 tribal sources for better source diversity
      .map((r) => r.link);

    let tribalDeepContent: string | undefined;
    const shouldDeepReadTribal = tribalUrls.length >= 2 && shouldRunSupplemental;
    if (shouldDeepReadTribal) {
      console.log(`[Serper] Deep reading ${tribalUrls.length} tribal threads (Reddit/HN)...`);
      const scrapedThreads = await Promise.all(
        tribalUrls.map(async (url) => {
          const content = await scrapeUrl(url);
          if (content) {
            // Limit each thread to ~2000 words to avoid token explosion
            const truncated = content.split(/\s+/).slice(0, 2000).join(' ');
            return `\n=== TRIBAL THREAD: ${url} ===\n${truncated}\n`;
          }
          return null;
        })
      );

      const validContent = scrapedThreads.filter(Boolean).join('\n');
      if (validContent) {
        tribalDeepContent = validContent;
        console.log(
          `[Serper] Scraped ${scrapedThreads.filter(Boolean).length}/${tribalUrls.length} tribal threads successfully`
        );
      } else {
        console.log('[Serper] No tribal threads could be scraped, falling back to snippets');
      }
    }

    // V4: Corporate Profiler query (employee counts, stock ticker, official data)
    const corporateProfilerSnippets = getSnippetsForTypes(['corp_profiler']);

    const reviewsSnippets = getSnippetsForTypes(['reviews', 'dossier']);
    const pricingSnippets = getSnippetsForTypes(['pricing', 'pricing_compare']);
    const alternativesSnippets = getSnippetsForTypes(['alternatives']);
    const companySnippets = getSnippetsForTypes(['company']);
    const technicalSnippets = getSnippetsForTypes(['technical', 'release_notes']);

    return {
      reviewsSnippets,
      pricingSnippets,
      alternativesSnippets,
      companySnippets,
      technicalSnippets,
      budgetAnalystSnippets,
      tribalKnowledgeSnippets,
      corporateProfilerSnippets,
      rawResponses: results,
      sources: Array.from(sourceMap.values()),
      video: video || undefined,
      pricingDeepContent,
      tribalDeepContent, // V6: Full Reddit/HN threads (not snippets) for authentic insights
      faqs,
    };
  }

  /**
   * Scout for pricing-only refreshes (minimal query set + deep pricing scrape)
   */
  async scoutPricingOnly(
    toolName: string,
    withRetry?: <T>(fn: () => Promise<T>, operation: string) => Promise<T>
  ): Promise<SearchResult> {
    const queryPlan = [
      { type: 'pricing', query: `${toolName} pricing plans features` },
      { type: 'pricing_compare', query: `${toolName} pricing annual vs monthly cost` },
    ];

    const results = await serperRateLimiter.executeAll(
      queryPlan.map(({ query }) => () => {
        const searchFn = () => this.search(query, { tbs: 'qdr:y' });
        return withRetry ? withRetry(searchFn, `Search: ${query}`) : searchFn();
      })
    );

    const extractSnippets = (response: SerperResponse): string[] =>
      response.organic?.slice(0, 5).map((r) => `[${r.link}] ${r.title}: ${r.snippet}`) || [];

    const retrievedAt = new Date().toISOString();
    const sourceMap = new Map<string, { url: string; title: string; snippet: string; domain: string; retrieved_at: string; published_at?: string; time_since?: string }>();
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
              retrieved_at: retrievedAt,
              published_at: (result as any).date || (result as any).dateString || undefined,
              time_since: (result as any).timeSince || undefined,
            });
          } catch {
            // Skip invalid URLs
          }
        }
      }
    }

    const pricingResults = results.flatMap((r) => r.organic || []);
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

    return {
      reviewsSnippets: [],
      pricingSnippets: results.flatMap(extractSnippets),
      alternativesSnippets: [],
      companySnippets: [],
      technicalSnippets: [],
      budgetAnalystSnippets: [],
      tribalKnowledgeSnippets: [],
      corporateProfilerSnippets: [],
      rawResponses: results,
      sources: Array.from(sourceMap.values()),
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
