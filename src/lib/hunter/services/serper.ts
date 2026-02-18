/**
 * Serper Service - Google Search API wrapper
 *
 * Handles web searches via Serper API with automatic retry logic.
 *
 * @module hunter/services/serper
 */

import axios from 'axios';
import type {
  CuratedSources,
  RawSource,
  ScoutFacts,
  ScoutQuality,
  ScrapePlan,
  SerperResponse,
  SourceIntent,
} from '../types';
import { classifySerperError } from '../errors';
import { scrapeUrl } from '../utils/scraper';
import type { SourcePolicyGate } from './source-policy';
import { serperRateLimiter } from './rate-limiter';
import { rankSources } from './source-ranking';
import { serperCircuit } from './circuit-breaker';
import { canonicalizeUrl } from '@/lib/utils/url';

const RESTRICTED_FALLBACK_DOMAINS = [
  'reddit.com',
  'news.ycombinator.com',
  'g2.com',
  'capterra.com',
  'trustpilot.com',
  'getapp.com',
  'softwareadvice.com',
];

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

export interface SerperConfig {
  apiKey: string;
  policyProvider?: {
    getPolicyGate: (url: string) => Promise<SourcePolicyGate | null>;
    recordUnknownDomain: (
      domain: string,
      sampleUrl?: string,
      sampleTitle?: string
    ) => Promise<void>;
  };
}

export interface VideoResult {
  videoId: string;
  title: string;
  channel: string;
  duration?: string;
}

export interface SearchResult {
  raw_sources: RawSource[];
  curated_sources: CuratedSources;
  scrape_plan: ScrapePlan;
  facts: ScoutFacts;
  quality: ScoutQuality;
  video?: VideoResult;
  // Internal use: deep-dive content for pricing pages (not stored in scout output)
  pricingDeepContent?: string;
  faqs?: Array<{
    question: string;
    answer: string;
    source: 'paa' | 'forum' | 'reddit';
    source_url?: string;
  }>;
}

export class SerperService {
  private apiKey: string;
  private policyProvider?: SerperConfig['policyProvider'];

  constructor(config: SerperConfig) {
    this.apiKey = config.apiKey;
    this.policyProvider = config.policyProvider;
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

  private async executePlanResilient(
    plan: Array<{ type: QueryType; query: string }>,
    withRetry?: <T>(fn: () => Promise<T>, operation: string) => Promise<T>,
    recencyResolver?: (type: QueryType) => string | undefined
  ): Promise<{
    results: SerperResponse[];
    successfulPlan: Array<{ type: QueryType; query: string }>;
    failed: Array<{ type: QueryType; query: string; error: string }>;
  }> {
    const settled = await Promise.allSettled(
      plan.map(({ query, type }) =>
        serperRateLimiter.execute(async () => {
          const searchFn = () => this.search(query, { tbs: recencyResolver?.(type) });
          return withRetry ? withRetry(searchFn, `Search: ${query}`) : searchFn();
        })
      )
    );

    const results: SerperResponse[] = [];
    const successfulPlan: Array<{ type: QueryType; query: string }> = [];
    const failed: Array<{ type: QueryType; query: string; error: string }> = [];

    settled.forEach((entry, idx) => {
      const planEntry = plan[idx];
      if (entry.status === 'fulfilled') {
        results.push(entry.value);
        successfulPlan.push(planEntry);
      } else {
        const message = entry.reason instanceof Error ? entry.reason.message : String(entry.reason);
        failed.push({ ...planEntry, error: message });
      }
    });

    return { results, successfulPlan, failed };
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
      const priorityKeywords = [
        'official',
        'demo',
        'review',
        'tutorial',
        'walkthrough',
        'overview',
        'getting started',
      ];

      // Score and sort videos
      const scoredVideos = videos
        .filter((v) => v.link.includes('youtube.com/watch'))
        .map((v) => {
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
    const classifyDossierQuery = (query: string): QueryType => {
      const q = query.toLowerCase();
      if (
        q.includes('release notes') ||
        q.includes('changelog') ||
        q.includes('updates') ||
        q.includes('release')
      ) {
        return 'release_notes';
      }
      if (
        q.includes('pricing') ||
        q.includes('price') ||
        q.includes('plans') ||
        q.includes('cost')
      ) {
        return q.includes('annual') || q.includes('monthly') ? 'pricing_compare' : 'pricing';
      }
      if (q.includes('alternative') || q.includes('competitor') || q.includes('vs')) {
        return 'alternatives';
      }
      if (
        q.includes('company') ||
        q.includes('funding') ||
        q.includes('headquarter') ||
        q.includes('employees')
      ) {
        return 'company';
      }
      if (
        q.includes('api') ||
        q.includes('integration') ||
        q.includes('export') ||
        q.includes('import')
      ) {
        return 'technical';
      }
      if (q.includes('review') || q.includes('ratings')) {
        return 'reviews';
      }
      return 'dossier';
    };

    const recencyTbsForType = (type: QueryType): string | undefined => {
      const recentTypes: QueryType[] = ['pricing', 'pricing_compare', 'company', 'release_notes'];
      return recentTypes.includes(type) ? 'qdr:y' : undefined;
    };

    const buildQueryPlans = (): {
      core: Array<{ type: QueryType; query: string }>;
      supplemental: Array<{ type: QueryType; query: string }>;
    } => {
      if (dossierQueries && dossierQueries.length > 0) {
        const core: Array<{ type: QueryType; query: string }> = [
          ...dossierQueries.map((query) => ({
            type: classifyDossierQuery(query) as QueryType,
            query,
          })),
          {
            type: 'tribal_reddit_hate',
            query: `site:reddit.com "${toolName}" "sucks" OR "slow" OR "broken" OR "issues"`,
          },
        ];
        const supplemental: Array<{ type: QueryType; query: string }> = [
          {
            type: 'tribal_hn_pricing',
            query: `site:news.ycombinator.com "${toolName}" pricing OR limits`,
          },
          {
            type: 'tribal_reddit_gotchas',
            query: `site:reddit.com "${toolName}" "wish I knew" OR "gotcha"`,
          },
          { type: 'forums', query: `"${toolName}" (forum OR community OR discourse OR boards)` },
          {
            type: 'corp_profiler',
            query: `"${toolName}" company employees revenue headquarters stock ticker Crunchbase LinkedIn`,
          },
          { type: 'release_notes', query: `"${toolName}" release notes OR changelog OR updates` },
        ];
        return { core, supplemental };
      }

      const core: Array<{ type: QueryType; query: string }> = [
        { type: 'reviews', query: `${toolName} reviews ${contextTitle || ''}`.trim() },
        { type: 'pricing', query: `${toolName} pricing plans features` },
        { type: 'pricing_compare', query: `${toolName} pricing annual vs monthly cost` },
        { type: 'alternatives', query: `${toolName} alternatives competitors vs` },
        { type: 'company', query: `${toolName} company founded funding headquarters` },
        { type: 'technical', query: `${toolName} API integrations data export import` },
      ];

      const supplemental: Array<{ type: QueryType; query: string }> = [
        { type: 'budget_hidden', query: `${toolName} hidden costs billing logic` },
        { type: 'budget_setup', query: `${toolName} implementation fees setup cost minimum seats` },
        {
          type: 'tribal_reddit_hate',
          query: `site:reddit.com "${toolName}" "sucks" OR "slow" OR "broken" OR "issues" -intitle:"alternatives"`,
        },
        {
          type: 'tribal_hn_pricing',
          query: `site:news.ycombinator.com "${toolName}" pricing OR limits OR "rate limit"`,
        },
        {
          type: 'tribal_reddit_vs',
          query: `site:reddit.com "${toolName} vs" OR "switched from" OR "switched to"`,
        },
        {
          type: 'tribal_reddit_gotchas',
          query: `site:reddit.com "${toolName}" "wish I knew" OR "gotcha" OR "warning"`,
        },
        { type: 'forums', query: `"${toolName}" (forum OR community OR discourse OR boards)` },
        {
          type: 'corp_profiler',
          query: `"${toolName}" company employees revenue headquarters stock ticker Crunchbase LinkedIn`,
        },
        { type: 'release_notes', query: `"${toolName}" release notes OR changelog OR updates` },
      ];
      return { core, supplemental };
    };

    const { core: corePlan, supplemental: supplementalPlan } = buildQueryPlans();

    const [coreExecution, video] = await Promise.all([
      this.executePlanResilient(corePlan, withRetry, recencyTbsForType),
      this.searchVideos(`${toolName} demo tutorial overview`),
    ]);
    const coreResults = coreExecution.results;
    const successfulCorePlan = coreExecution.successfulPlan;
    if (coreExecution.failed.length > 0) {
      console.warn(
        `[Serper] Core queries failed: ${coreExecution.failed.length}/${corePlan.length}`
      );
    }
    if (coreResults.length === 0) {
      throw new Error(`Serper core query plan failed for ${toolName}`);
    }

    const extractSnippets = (response: SerperResponse): string[] =>
      response.organic?.slice(0, 5).map((r) => `[${r.link}] ${r.title}: ${r.snippet}`) || [];

    const coreSnippets = coreResults.flatMap(extractSnippets);
    const coreDomains = new Set(
      coreResults
        .flatMap((r) => r.organic || [])
        .map((r) => {
          try {
            return new URL(r.link).hostname.replace(/^www\./, '');
          } catch {
            return '';
          }
        })
        .filter(Boolean)
    );

    const shouldRunSupplemental = coreSnippets.length < 18 || coreDomains.size < 7;

    const supplementalExecution = shouldRunSupplemental
      ? await this.executePlanResilient(supplementalPlan, withRetry, recencyTbsForType)
      : { results: [], successfulPlan: [], failed: [] };
    const supplementalResults = supplementalExecution.results;
    const successfulSupplementalPlan = supplementalExecution.successfulPlan;
    if (supplementalExecution.failed.length > 0) {
      console.warn(
        `[Serper] Supplemental queries failed: ${supplementalExecution.failed.length}/${supplementalPlan.length}`
      );
    }

    if (!shouldRunSupplemental) {
      console.log(
        `[Serper] Skipping supplemental queries (core coverage: ${coreSnippets.length} snippets, ${coreDomains.size} domains)`
      );
    }

    // Include URL in snippets so AI can cite sources
    const results = [...coreResults, ...supplementalResults];
    const queryPlan = [...successfulCorePlan, ...successfulSupplementalPlan];

    // Extract sources for storage (deduplicated by URL)
    const retrievedAt = new Date().toISOString();
    const sourceMap = new Map<string, RawSource>();
    for (const response of results) {
      for (const result of response.organic?.slice(0, 5) || []) {
        if (!sourceMap.has(result.link)) {
          try {
            const domain = new URL(result.link).hostname.replace(/^www\./, '');
            const policyDecision = await this.getPolicyDecision(result.link, result.title);
            const gate = policyDecision?.gate;
            sourceMap.set(result.link, {
              url: result.link,
              title: result.title,
              snippet: result.snippet,
              domain,
              retrieved_at: retrievedAt,
              published_at: (result as any).date || (result as any).dateString || undefined,
              canonical_url: canonicalizeUrl(result.link),
              source_type: classifyScoutSourceType(result.link, undefined),
              intent_tags: [],
              policy: {
                acquisition_mode: gate?.acquisition_mode || 'LINK_ONLY',
                llm_ingestion_allowed: gate?.llm_ingestion_allowed || 'NO',
                display_mode: gate?.display_mode || 'LINK_ONLY',
                reason: policyDecision?.blockReason || (gate ? undefined : 'policy_missing'),
                policy_version: gate?.policy_version || undefined,
              },
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

    const cleanText = (value: string): string => value.replace(/\s+/g, ' ').trim();
    const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const toolNameLower = toolName.toLowerCase();
    const toolTokens = toolNameLower.split(/\s+/).filter((token) => token.length > 2);
    const toolTokenRegexes = toolTokens.map(
      (token) => new RegExp(`\\b${escapeRegExp(token)}\\b`, 'i')
    );
    const isShortSingleToken = toolTokens.length === 1 && toolTokens[0].length <= 4;
    const normalizeQuestionKey = (value: string): string =>
      value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
    const isQuestionLike = (value: string): boolean => {
      const text = value.toLowerCase().trim();
      if (text.includes('?')) return true;
      if (/^(how|what|why|is|are|can|does|do|should|which|where|when|who)\b/.test(text))
        return true;
      if (text.includes(' vs ')) return true;
      if (text.includes('alternatives')) return true;
      if (text.includes('worth it')) return true;
      return false;
    };
    const normalizeAnswer = (value: string): string => cleanText(value);
    const hasToolMention = (text: string): boolean =>
      toolTokenRegexes.some((regex) => regex.test(text)) ||
      text.toLowerCase().includes(`${toolNameLower}.com`);
    const hasToolContext = (text: string): boolean =>
      /\b(app|software|platform|tool|service|automation|saas|workflow)\b/i.test(text);
    const isComparisonQuestion = (text: string): boolean =>
      /\b(vs|versus|alternative|alternatives|competitor|compare)\b/i.test(text);
    const isRelevantToTool = (question: string, answer: string, sourceUrl?: string): boolean => {
      const combined = `${question} ${answer}`;
      const hasMention =
        hasToolMention(combined) ||
        (sourceUrl ? sourceUrl.toLowerCase().includes(toolNameLower.replace(/\s+/g, '')) : false);
      if (!hasMention) return false;

      if (isShortSingleToken) {
        const hasDomain = combined.toLowerCase().includes(`${toolNameLower}.com`);
        const hasContext = hasToolContext(combined) || isComparisonQuestion(combined);
        if (!hasDomain && !hasContext) return false;
      }

      return true;
    };
    const isForumSource = (domain: string, url: string): boolean => {
      const haystack = `${domain} ${url}`.toLowerCase();
      const indicators = [
        'forum',
        'forums',
        'community',
        'discourse',
        'boards',
        'support',
        'help',
        'stackexchange',
      ];
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
      const answer = normalizeAnswer(candidate.answer);
      if (!question || !answer || answer.length < 30) return;
      if (!isQuestionLike(question)) return;
      if (!isRelevantToTool(question, answer, candidate.source_url)) return;
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
    const sourcesByUrl = new Map(sources.map((s) => [s.url, s]));
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

    const defaultIntentTags = (source: RawSource, type: QueryType): SourceIntent[] => {
      switch (type) {
        case 'pricing':
        case 'pricing_compare':
        case 'budget_hidden':
        case 'budget_setup':
          return ['pricing'];
        case 'technical':
          return ['integrations', 'portability', 'limits'];
        case 'release_notes':
          return ['limits'];
        case 'alternatives':
          return ['alternatives'];
        case 'reviews':
        case 'tribal_reddit_hate':
        case 'tribal_reddit_vs':
        case 'tribal_reddit_gotchas':
        case 'tribal_hn_pricing':
        case 'forums':
          return ['reviews'];
        case 'company':
        case 'corp_profiler':
        case 'dossier':
        default:
          return [];
      }
    };

    const addIntentTags = (type: QueryType, resultsForType: SerperResponse[]) => {
      for (const response of resultsForType) {
        for (const result of response.organic || []) {
          const existing = sourcesByUrl.get(result.link);
          if (!existing) continue;
          const tags = defaultIntentTags(existing, type);
          if (tags.length === 0) continue;
          const merged = new Set(existing.intent_tags);
          tags.forEach((tag) => merged.add(tag));
          existing.intent_tags = Array.from(merged);
        }
      }
    };

    resultsByType.forEach((responses, type) => addIntentTags(type, responses));

    const toolHostHint = detectToolHostHint(sources, toolName);
    const policyLookupWithFallback = async (url: string): Promise<SourcePolicyGate | null> => {
      const gate = await this.getPolicyGate(url);
      const override = inferOfficialOverrideGate(url, toolHostHint || undefined, gate || undefined);
      if (override) return override;
      if (gate) return gate;
      return inferOfficialFallbackGate(url, toolHostHint || undefined);
    };
    for (const source of sources) {
      source.source_type = classifyScoutSourceType(source.url, toolHostHint || undefined);
      const overrideGate = inferOfficialOverrideGate(
        source.url,
        toolHostHint || undefined,
        source.policy as SourcePolicyGate
      );
      if (overrideGate) {
        source.policy = {
          acquisition_mode: overrideGate.acquisition_mode,
          llm_ingestion_allowed: overrideGate.llm_ingestion_allowed,
          display_mode: overrideGate.display_mode,
          reason:
            source.policy.reason === 'policy_missing'
              ? 'inferred_official_fallback'
              : 'target_vendor_override',
          policy_version: overrideGate.policy_version || undefined,
        };
      } else if (
        source.policy.reason === 'policy_missing' &&
        source.policy.acquisition_mode === 'LINK_ONLY' &&
        source.policy.llm_ingestion_allowed === 'NO'
      ) {
        const fallbackGate = inferOfficialFallbackGate(source.url, toolHostHint || undefined);
        if (fallbackGate) {
          source.policy = {
            acquisition_mode: fallbackGate.acquisition_mode,
            llm_ingestion_allowed: fallbackGate.llm_ingestion_allowed,
            display_mode: fallbackGate.display_mode,
            reason: 'inferred_official_fallback',
            policy_version: fallbackGate.policy_version || undefined,
          };
        }
      }
      if (source.intent_tags.length === 0) {
        source.intent_tags = inferIntentTags(source.url, source.title);
      }
    }

    const curated_sources = await buildCuratedSources(
      sources,
      toolHostHint || undefined,
      toolName,
      policyLookupWithFallback
    );

    const scrape_plan = buildScrapePlan(curated_sources, sources);

    let pricingDeepContent: string | undefined;
    const pricingSelected = scrape_plan.pricing?.selected || [];
    if (pricingSelected.length > 0) {
      console.log(`[Serper] Deep diving into ${pricingSelected.length} pricing pages...`);
      const scrapeSettled = await Promise.allSettled(
        pricingSelected.map(async (url) => {
          const policyGate = await policyLookupWithFallback(url);
          const content = await scrapeUrl(url, 10000, policyGate);
          if (content) {
            return `\n=== PRICING PAGE: ${url} ===\n${content}\n`;
          }
          return null;
        })
      );
      const scrapedPages = scrapeSettled.map((entry, idx) => {
        if (entry.status === 'fulfilled') return entry.value;
        const message = entry.reason instanceof Error ? entry.reason.message : String(entry.reason);
        console.warn(`[Serper] Pricing deep scrape failed for ${pricingSelected[idx]}: ${message}`);
        return null;
      });

      const validContent = scrapedPages.filter(Boolean).join('\n');
      if (validContent) {
        pricingDeepContent = validContent;
        console.log(
          `[Serper] Scraped ${scrapedPages.filter(Boolean).length}/${pricingSelected.length} pricing pages successfully`
        );
      }
    }

    const facts = buildScoutFacts(sources, curated_sources, toolName, toolHostHint || undefined);
    const quality = buildScoutQuality(facts, curated_sources);

    return {
      raw_sources: sources,
      curated_sources,
      scrape_plan,
      facts,
      quality,
      video: video || undefined,
      pricingDeepContent,
      faqs,
    };
  }

  private async getPolicyDecision(
    url: string,
    title?: string
  ): Promise<{
    gate: SourcePolicyGate | null;
    isDeepScrapeAllowed: boolean;
    blockReason?: string;
  } | null> {
    if (!this.policyProvider) {
      return { gate: null, isDeepScrapeAllowed: false, blockReason: 'policy_unavailable' };
    }

    const gate = await this.policyProvider.getPolicyGate(url);
    if (!gate) {
      const domain = this.extractDomain(url);
      if (domain) {
        await this.policyProvider.recordUnknownDomain(domain, url, title);
      }
      return { gate: null, isDeepScrapeAllowed: false, blockReason: 'policy_missing' };
    }

    const isDeepScrapeAllowed =
      gate.acquisition_mode === 'SCRAPE_ALLOWED' && gate.llm_ingestion_allowed !== 'NO';
    return {
      gate,
      isDeepScrapeAllowed,
      blockReason: isDeepScrapeAllowed ? undefined : 'policy_restricted',
    };
  }

  private async getPolicyGate(url: string): Promise<SourcePolicyGate | null> {
    if (!this.policyProvider) return null;
    return await this.policyProvider.getPolicyGate(url);
  }

  private extractDomain(url: string): string | null {
    try {
      return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
    } catch {
      return null;
    }
  }

  /**
   * Scout for pricing-only refreshes (minimal query set + deep pricing scrape)
   */
  async scoutPricingOnly(
    toolName: string,
    withRetry?: <T>(fn: () => Promise<T>, operation: string) => Promise<T>
  ): Promise<SearchResult> {
    const queryPlan: Array<{ type: QueryType; query: string }> = [
      { type: 'pricing', query: `${toolName} pricing plans features` },
      { type: 'pricing_compare', query: `${toolName} pricing annual vs monthly cost` },
    ];

    const pricingExecution = await this.executePlanResilient(queryPlan, withRetry, () => 'qdr:y');
    const results = pricingExecution.results;
    if (pricingExecution.failed.length > 0) {
      console.warn(
        `[Serper] Pricing-only queries failed: ${pricingExecution.failed.length}/${queryPlan.length}`
      );
    }
    if (results.length === 0) {
      throw new Error(`Serper pricing queries failed for ${toolName}`);
    }

    const retrievedAt = new Date().toISOString();
    const sourceMap = new Map<string, RawSource>();
    for (const response of results) {
      for (const result of response.organic?.slice(0, 5) || []) {
        if (!sourceMap.has(result.link)) {
          try {
            const domain = new URL(result.link).hostname.replace(/^www\./, '');
            const policyDecision = await this.getPolicyDecision(result.link, result.title);
            const gate = policyDecision?.gate;
            sourceMap.set(result.link, {
              url: result.link,
              title: result.title,
              snippet: result.snippet,
              domain,
              retrieved_at: retrievedAt,
              published_at: (result as any).date || (result as any).dateString || undefined,
              canonical_url: canonicalizeUrl(result.link),
              source_type: classifyScoutSourceType(result.link, undefined),
              intent_tags: ['pricing'],
              policy: {
                acquisition_mode: gate?.acquisition_mode || 'LINK_ONLY',
                llm_ingestion_allowed: gate?.llm_ingestion_allowed || 'NO',
                display_mode: gate?.display_mode || 'LINK_ONLY',
                reason: policyDecision?.blockReason || (gate ? undefined : 'policy_missing'),
                policy_version: gate?.policy_version || undefined,
              },
            });
          } catch {
            // Skip invalid URLs
          }
        }
      }
    }
    const sources = Array.from(sourceMap.values());
    const toolHostHint = detectToolHostHint(sources, toolName);
    const policyLookupWithFallback = async (url: string): Promise<SourcePolicyGate | null> => {
      const gate = await this.getPolicyGate(url);
      const override = inferOfficialOverrideGate(url, toolHostHint || undefined, gate || undefined);
      if (override) return override;
      if (gate) return gate;
      return inferOfficialFallbackGate(url, toolHostHint || undefined);
    };
    for (const source of sources) {
      source.source_type = classifyScoutSourceType(source.url, toolHostHint || undefined);
      const overrideGate = inferOfficialOverrideGate(
        source.url,
        toolHostHint || undefined,
        source.policy as SourcePolicyGate
      );
      if (overrideGate) {
        source.policy = {
          acquisition_mode: overrideGate.acquisition_mode,
          llm_ingestion_allowed: overrideGate.llm_ingestion_allowed,
          display_mode: overrideGate.display_mode,
          reason:
            source.policy.reason === 'policy_missing'
              ? 'inferred_official_fallback'
              : 'target_vendor_override',
          policy_version: overrideGate.policy_version || undefined,
        };
      } else if (
        source.policy.reason === 'policy_missing' &&
        source.policy.acquisition_mode === 'LINK_ONLY' &&
        source.policy.llm_ingestion_allowed === 'NO'
      ) {
        const fallbackGate = inferOfficialFallbackGate(source.url, toolHostHint || undefined);
        if (fallbackGate) {
          source.policy = {
            acquisition_mode: fallbackGate.acquisition_mode,
            llm_ingestion_allowed: fallbackGate.llm_ingestion_allowed,
            display_mode: fallbackGate.display_mode,
            reason: 'inferred_official_fallback',
            policy_version: fallbackGate.policy_version || undefined,
          };
        }
      }
    }

    const curated_sources = await buildCuratedSources(
      sources,
      toolHostHint || undefined,
      toolName,
      policyLookupWithFallback
    );

    const scrape_plan = buildScrapePlan(curated_sources, sources);
    let pricingDeepContent: string | undefined;
    const pricingSelected = scrape_plan.pricing?.selected || [];
    if (pricingSelected.length > 0) {
      console.log(`[Serper] Deep diving into ${pricingSelected.length} pricing pages...`);
      const scrapeSettled = await Promise.allSettled(
        pricingSelected.map(async (url) => {
          const policyGate = await policyLookupWithFallback(url);
          const content = await scrapeUrl(url, 10000, policyGate);
          if (content) {
            return `\n=== PRICING PAGE: ${url} ===\n${content}\n`;
          }
          return null;
        })
      );
      const scrapedPages = scrapeSettled.map((entry, idx) => {
        if (entry.status === 'fulfilled') return entry.value;
        const message = entry.reason instanceof Error ? entry.reason.message : String(entry.reason);
        console.warn(`[Serper] Pricing deep scrape failed for ${pricingSelected[idx]}: ${message}`);
        return null;
      });

      const validContent = scrapedPages.filter(Boolean).join('\n');
      if (validContent) {
        pricingDeepContent = validContent;
        console.log(
          `[Serper] Scraped ${scrapedPages.filter(Boolean).length}/${pricingSelected.length} pricing pages successfully`
        );
      }
    }

    const facts = buildScoutFacts(sources, curated_sources, toolName, toolHostHint || undefined);
    const quality = buildScoutQuality(facts, curated_sources);

    return {
      raw_sources: sources,
      curated_sources,
      scrape_plan,
      facts,
      quality,
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
    const queries = [contextQuery, `${contextQuery} reviews comparison`, `${contextQuery} pricing`];

    const settled = await Promise.allSettled(queries.map((q) => this.search(q)));
    const results: Array<SerperResponse | null> = settled.map((entry) =>
      entry.status === 'fulfilled' ? entry.value : null
    );

    const extractSnippets = async (response: SerperResponse | null): Promise<string[]> => {
      if (!response?.organic || response.organic.length === 0) return [];
      const snippets: string[] = [];
      const candidates = response.organic.slice(0, 10);
      for (const result of candidates) {
        const policyDecision = await this.getPolicyDecision(result.link, result.title);
        if (!policyDecision?.isDeepScrapeAllowed) {
          continue;
        }
        snippets.push(`[${result.link}] ${result.title}: ${result.snippet}`);
        if (snippets.length >= 8) break;
      }
      return snippets;
    };

    const [toolsSnippets, reviewsSnippets, pricingSnippets] = await Promise.all([
      extractSnippets(results[0]),
      extractSnippets(results[1]),
      extractSnippets(results[2]),
    ]);

    return {
      toolsSnippets,
      reviewsSnippets,
      pricingSnippets,
    };
  }
}

function detectToolHostHint(sources: RawSource[], toolName: string): string | null {
  const toolNameLower = toolName.toLowerCase();
  const toolTokens = toolNameLower.split(/\s+/).filter((token) => token.length > 2);
  const candidates = sources
    .map((source) => source.domain.toLowerCase())
    .filter(
      (domain) =>
        (domain.includes(toolNameLower) || toolTokens.some((token) => domain.includes(token))) &&
        !domain.includes('reddit') &&
        !domain.includes('ycombinator')
    );
  if (candidates.length === 0) return null;
  const counts = new Map<string, number>();
  for (const domain of candidates) {
    counts.set(domain, (counts.get(domain) || 0) + 1);
  }
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
}

function inferOfficialFallbackGate(url: string, toolWebsite?: string): SourcePolicyGate | null {
  if (!toolWebsite) return null;

  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
    if (
      RESTRICTED_FALLBACK_DOMAINS.some(
        (blocked) => hostname === blocked || hostname.endsWith(`.${blocked}`)
      )
    ) {
      return null;
    }

    const toolHostname = new URL(
      toolWebsite.startsWith('http') ? toolWebsite : `https://${toolWebsite}`
    ).hostname
      .replace(/^www\./, '')
      .toLowerCase();
    if (hostname !== toolHostname && !hostname.endsWith(`.${toolHostname}`)) {
      return null;
    }

    return {
      acquisition_mode: 'SCRAPE_ALLOWED',
      llm_ingestion_allowed: 'YES_LIMITED',
      display_mode: 'LINK_ONLY',
      policy_version: 'inferred_official_fallback_v1',
      max_chars_ingested: 6000,
    };
  } catch {
    return null;
  }
}

function inferOfficialOverrideGate(
  url: string,
  toolWebsite?: string,
  existingGate?: SourcePolicyGate
): SourcePolicyGate | null {
  const fallback = inferOfficialFallbackGate(url, toolWebsite);
  if (!fallback) return null;

  // Never override explicit policy entries. Fallback only applies when registry has no policy.
  if (!existingGate) {
    return fallback;
  }

  return null;
}

function classifyScoutSourceType(url: string, toolWebsite?: string): RawSource['source_type'] {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
    if (toolWebsite) {
      const toolHostname = new URL(
        toolWebsite.startsWith('http') ? toolWebsite : `https://${toolWebsite}`
      ).hostname
        .replace(/^www\./, '')
        .toLowerCase();
      if (hostname === toolHostname || hostname.endsWith(`.${toolHostname}`)) {
        return 'official';
      }
    }

    if (
      hostname.includes('docs.') ||
      hostname.includes('developer.') ||
      hostname.includes('api.')
    ) {
      return 'docs';
    }

    if (hostname.includes('help.') || hostname.includes('support.') || hostname.includes('kb.')) {
      return 'support';
    }

    if (hostname.includes('privacy') || hostname.includes('legal') || hostname.includes('terms')) {
      return 'legal';
    }

    const directoryHosts = [
      'g2.com',
      'capterra.com',
      'getapp.com',
      'softwareadvice.com',
      'trustradius.com',
      'sourceforge.net',
      'alternativeto.net',
      'slant.co',
      'crozdesk.com',
      'saasworthy.com',
      'financesonline.com',
    ];
    if (directoryHosts.some((host) => hostname === host || hostname.endsWith(`.${host}`))) {
      return 'directory';
    }

    const communityHosts = [
      'reddit.com',
      'news.ycombinator.com',
      'stackexchange.com',
      'stackoverflow.com',
      'quora.com',
      'medium.com',
      'dev.to',
      'indiehackers.com',
      'lobste.rs',
      'slashdot.org',
    ];
    if (communityHosts.some((host) => hostname === host || hostname.endsWith(`.${host}`))) {
      return 'community';
    }

    return 'editorial';
  } catch {
    return 'editorial';
  }
}

function inferIntentTags(url: string, title: string): SourceIntent[] {
  const haystack = `${url} ${title}`.toLowerCase();
  const intents: SourceIntent[] = [];
  if (/(pricing|plans|cost|subscription|billing)/.test(haystack)) intents.push('pricing');
  if (/(security|compliance|soc|iso|gdpr|dpa|privacy)/.test(haystack)) intents.push('security');
  if (/(export|import|csv|migration|portability)/.test(haystack)) intents.push('portability');
  if (/(integrations|api|webhook|zapier|connect)/.test(haystack)) intents.push('integrations');
  if (/(limits|rate|quota|cap|constraint)/.test(haystack)) intents.push('limits');
  if (/(review|ratings|testimonial|forum|community|reddit|hn)/.test(haystack))
    intents.push('reviews');
  if (/(alternatives|competitor|vs|compare)/.test(haystack)) intents.push('alternatives');
  return intents.length > 0 ? intents : [];
}

async function buildCuratedSources(
  sources: RawSource[],
  toolWebsite: string | undefined,
  toolName: string,
  policyLookup: (url: string) => Promise<SourcePolicyGate | null>
): Promise<CuratedSources> {
  const intents: SourceIntent[] = [
    'pricing',
    'security',
    'portability',
    'integrations',
    'limits',
    'reviews',
    'alternatives',
  ];

  const curated: CuratedSources = {
    pricing: [],
    security: [],
    portability: [],
    integrations: [],
    limits: [],
    reviews: [],
    alternatives: [],
  };

  const normalizedToolWebsite = toolWebsite
    ? toolWebsite.startsWith('http')
      ? toolWebsite
      : `https://${toolWebsite}`
    : undefined;

  for (const intent of intents) {
    const ranked = await rankSources(
      sources.map((source) => ({
        url: source.url,
        title: source.title,
        snippet: source.snippet,
        domain: source.domain,
        published_at: source.published_at,
        source_type: source.source_type,
      })),
      intent,
      policyLookup,
      { toolWebsite: normalizedToolWebsite, toolName }
    );

    const toolHost = normalizedToolWebsite ? extractDomain(normalizedToolWebsite) : null;
    // Compliance hard gate:
    // BLOCKED/LINK_ONLY/API_ONLY sources may remain in raw_sources for evidence locker,
    // but must not influence curated extraction/facts.
    const eligible = ranked.filter((source) => source.deep_scrape_allowed);
    curated[intent] = eligible.slice(0, 5).map((source) => ({
      url: source.url,
      canonical_url: canonicalizeUrl(source.url),
      domain: source.domain,
      score: source.score,
      authority:
        toolHost && source.domain === toolHost ? 'A' : source.deep_scrape_allowed ? 'B' : 'C',
      deep_scrape_allowed: source.deep_scrape_allowed,
      notes: source.reasons.join(', '),
    }));
  }

  return curated;
}

function extractDomain(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
}

function buildScrapePlan(curated: CuratedSources, sources: RawSource[]): ScrapePlan {
  const plan: ScrapePlan = {
    pricing: { candidates: [], selected: [], blocked: [] },
    security: { candidates: [], selected: [], blocked: [] },
    portability: { candidates: [], selected: [], blocked: [] },
    integrations: { candidates: [], selected: [], blocked: [] },
    limits: { candidates: [], selected: [], blocked: [] },
    reviews: { candidates: [], selected: [], blocked: [] },
    alternatives: { candidates: [], selected: [], blocked: [] },
  };

  const sourceMap = new Map(sources.map((s) => [s.url, s]));

  (Object.keys(curated) as SourceIntent[]).forEach((intent) => {
    const ranked = curated[intent] || [];
    const blockedFromRaw = sources
      .filter(
        (source) =>
          source.intent_tags.includes(intent) &&
          (source.policy.acquisition_mode !== 'SCRAPE_ALLOWED' ||
            source.policy.llm_ingestion_allowed === 'NO')
      )
      .map((source) => ({
        url: source.canonical_url,
        reason: source.policy.reason || 'policy_restricted',
      }));

    const candidates = Array.from(
      new Set([...ranked.map((entry) => entry.canonical_url), ...blockedFromRaw.map((b) => b.url)])
    );
    plan[intent].candidates = candidates;
    const selected = ranked.filter((entry) => entry.deep_scrape_allowed).slice(0, 2);
    plan[intent].selected = selected.map((entry) => entry.canonical_url);
    plan[intent].blocked = blockedFromRaw.length
      ? blockedFromRaw
      : ranked
          .filter((entry) => !entry.deep_scrape_allowed)
          .map((entry) => ({
            url: entry.canonical_url,
            reason: sourceMap.get(entry.url)?.policy.reason || 'policy_restricted',
          }));
  });

  return plan;
}

function buildScoutFacts(
  sources: RawSource[],
  curated: CuratedSources,
  toolName: string,
  toolWebsite?: string
): ScoutFacts {
  const facts: ScoutFacts = {
    facts_ledger: [],
  };

  if (toolName) {
    facts.identity = { official_name: toolName };
  }

  if (toolWebsite) {
    const normalizedWebsite = toolWebsite.startsWith('http')
      ? toolWebsite
      : `https://${toolWebsite}`;
    facts.identity = { ...(facts.identity || {}), website_url: normalizedWebsite };
  }

  const pricingSource = curated.pricing?.[0];
  if (pricingSource) {
    facts.pricing = {
      pricing_page_url: pricingSource.url,
    };
    facts.facts_ledger.push({
      key: 'pricing.pricing_page_url',
      value: pricingSource.url,
      confidence: 'high',
      evidence: [{ url: pricingSource.url, domain: pricingSource.domain }],
    });
  }

  if (facts.identity?.website_url) {
    facts.facts_ledger.push({
      key: 'identity.website_url',
      value: facts.identity.website_url,
      confidence: 'med',
      evidence: curated.pricing?.[0]
        ? [{ url: curated.pricing[0].url, domain: curated.pricing[0].domain }]
        : sources.slice(0, 1).map((source) => ({ url: source.url, domain: source.domain })),
    });
  }

  return facts;
}

function buildScoutQuality(facts: ScoutFacts, curated: CuratedSources): ScoutQuality {
  const missing: string[] = [];
  const notes: string[] = [];
  if (!facts.identity?.website_url) missing.push('identity.website_url');
  if (!facts.pricing?.pricing_page_url) missing.push('pricing.pricing_page_url');

  const freshness: ScoutQuality['freshness'] = {
    pricing: 'unknown',
    security: 'unknown',
    portability: 'unknown',
    integrations: 'unknown',
    limits: 'unknown',
    reviews: 'unknown',
    alternatives: 'unknown',
  };

  const volatileIntents: SourceIntent[] = [
    'pricing',
    'security',
    'portability',
    'integrations',
    'limits',
  ];

  for (const intent of volatileIntents) {
    const hasInventoryGrade = (curated[intent] || []).some((entry) =>
      (entry.notes || '').includes('inventory_grade')
    );
    if (!hasInventoryGrade) {
      missing.push(`${intent}.inventory_grade_source`);
      notes.push(`${intent}: no inventory-grade source in curated pool`);
    }
  }

  const needs_review = missing.length > 0 || curated.pricing.length === 0;

  return {
    conflicts: [],
    missing,
    freshness,
    needs_review,
    notes,
  };
}
