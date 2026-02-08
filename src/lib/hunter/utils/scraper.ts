/**
 * Page Scraper - Jina.ai Reader wrapper
 *
 * Converts URLs to LLM-friendly Markdown for deep content extraction.
 * Used to get actual pricing tables instead of just snippets.
 *
 * @module hunter/utils/scraper
 */

import type { SourcePolicyGate } from '../services/source-policy';

export interface ScrapeResult {
  url: string;
  content: string | null;
  success: boolean;
  error?: string;
}

const SCRAPER_CACHE_TTL_MS = (() => {
  const raw = typeof process !== 'undefined' ? process.env.SCRAPER_CACHE_TTL_MS : undefined;
  const parsed = raw ? Number(raw) : NaN;
  if (Number.isFinite(parsed)) {
    return parsed;
  }
  return 24 * 60 * 60 * 1000;
})();

const SCRAPER_CACHE = new Map<string, { expiresAt: number; content: string | null }>();
const ROBOTS_CACHE_TTL_MS = (() => {
  const raw = typeof process !== 'undefined' ? process.env.ROBOTS_CACHE_TTL_MS : undefined;
  const parsed = raw ? Number(raw) : NaN;
  if (Number.isFinite(parsed)) return parsed;
  return 6 * 60 * 60 * 1000;
})();
const ROBOTS_FAIL_CLOSED =
  typeof process !== 'undefined' ? process.env.ROBOTS_FAIL_CLOSED === 'true' : false;
const ROBOTS_USER_AGENT =
  typeof process !== 'undefined' && process.env.ROBOTS_USER_AGENT
    ? process.env.ROBOTS_USER_AGENT
    : 'stackhunt-bot';
const ROBOTS_CACHE = new Map<string, { expiresAt: number; rules: RobotsRules }>();

type RobotsRule = { type: 'allow' | 'disallow'; pattern: string };
type RobotsRules = { allowAll: boolean; rules: RobotsRule[] };

/**
 * Uses Jina.ai Reader to convert a URL into clean Markdown.
 * Includes timeout to prevent pipeline hangs.
 *
 * @param url - The URL to scrape
 * @param timeoutMs - Timeout in milliseconds (default 10s)
 * @returns Markdown content or null on failure
 */
export async function scrapeUrl(
  url: string,
  timeoutMs = 10000,
  policy?: SourcePolicyGate | null
): Promise<string | null> {
  if (!policy) {
    console.warn(`[Scraper] Blocked (no policy) for ${url}`);
    return null;
  }
  if (policy.acquisition_mode !== 'SCRAPE_ALLOWED' || policy.llm_ingestion_allowed === 'NO') {
    console.warn(`[Scraper] Blocked (policy) for ${url}`);
    return null;
  }
  const robotsAllowed = await isRobotsAllowed(url, timeoutMs);
  if (!robotsAllowed) {
    console.warn(`[Scraper] Blocked (robots) for ${url}`);
    return null;
  }

  if (SCRAPER_CACHE_TTL_MS > 0) {
    const cached = SCRAPER_CACHE.get(url);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.content;
    }
  }

  const jinaUrl = `https://r.jina.ai/${url}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(jinaUrl, {
      headers: {
        'X-Retain-Images': 'none', // Save bandwidth/tokens
        'X-No-Cache': 'true', // Fresh content for pricing pages
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`[Scraper] Failed for ${url}: HTTP ${response.status}`);
      return null;
    }

    const text = await response.text();

    // Truncate massive pages (save tokens, Gemini Flash handles it but costs add up)
    const maxLength =
      typeof policy.max_chars_ingested === 'number' && policy.max_chars_ingested > 0
        ? policy.max_chars_ingested
        : 50000;
    if (text.length > maxLength) {
      return text.substring(0, maxLength) + '\n...[TRUNCATED]';
    }

    if (SCRAPER_CACHE_TTL_MS > 0) {
      SCRAPER_CACHE.set(url, {
        content: text,
        expiresAt: Date.now() + SCRAPER_CACHE_TTL_MS,
      });
    }

    return text;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn(`[Scraper] Timeout for ${url}`);
    } else {
      console.warn(`[Scraper] Error for ${url}:`, error);
    }
    if (SCRAPER_CACHE_TTL_MS > 0) {
      SCRAPER_CACHE.set(url, {
        content: null,
        expiresAt: Date.now() + Math.min(SCRAPER_CACHE_TTL_MS, 5 * 60 * 1000),
      });
    }
    return null;
  }
}

async function isRobotsAllowed(url: string, timeoutMs: number): Promise<boolean> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return false;
  }

  const origin = parsedUrl.origin;
  const pathname = parsedUrl.pathname || '/';
  const cached = ROBOTS_CACHE.get(origin);
  if (cached && cached.expiresAt > Date.now()) {
    return evaluateRobots(cached.rules, pathname);
  }

  const robotsUrl = `${origin}/robots.txt`;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), Math.min(timeoutMs, 4000));
    const response = await fetch(robotsUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      // 404/no robots = crawl allowed unless fail-closed is enabled.
      return !ROBOTS_FAIL_CLOSED;
    }

    const body = await response.text();
    const rules = parseRobots(body, ROBOTS_USER_AGENT);
    if (ROBOTS_CACHE_TTL_MS > 0) {
      ROBOTS_CACHE.set(origin, { rules, expiresAt: Date.now() + ROBOTS_CACHE_TTL_MS });
    }
    return evaluateRobots(rules, pathname);
  } catch {
    return !ROBOTS_FAIL_CLOSED;
  }
}

function parseRobots(content: string, userAgent: string): RobotsRules {
  type Group = { agents: string[]; rules: RobotsRule[] };
  const groups: Group[] = [];
  let current: Group | null = null;
  let sawRuleInCurrent = false;

  const lines = content.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.split('#')[0]?.trim();
    if (!line) continue;
    const idx = line.indexOf(':');
    if (idx < 0) continue;

    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();

    if (key === 'user-agent') {
      if (!current || sawRuleInCurrent) {
        current = { agents: [], rules: [] };
        groups.push(current);
        sawRuleInCurrent = false;
      }
      current.agents.push(value.toLowerCase());
      continue;
    }

    if ((key === 'allow' || key === 'disallow') && current) {
      sawRuleInCurrent = true;
      current.rules.push({ type: key, pattern: value });
    }
  }

  const agent = userAgent.toLowerCase();
  const exact = groups.find((group) => group.agents.includes(agent) && group.rules.length > 0);
  if (exact) return { allowAll: false, rules: exact.rules };

  const wildcard = groups.find((group) => group.agents.includes('*') && group.rules.length > 0);
  if (wildcard) return { allowAll: false, rules: wildcard.rules };

  return { allowAll: true, rules: [] };
}

function evaluateRobots(rules: RobotsRules, pathname: string): boolean {
  if (rules.allowAll) return true;

  let winner: { type: 'allow' | 'disallow'; length: number } | null = null;
  for (const rule of rules.rules) {
    if (!rule.pattern) {
      // "Disallow:" with empty value means allow all.
      if (rule.type === 'disallow') continue;
    }
    if (!matchesPattern(pathname, rule.pattern)) continue;
    const len = rule.pattern.length;
    if (!winner || len > winner.length || (len === winner.length && rule.type === 'allow')) {
      winner = { type: rule.type, length: len };
    }
  }

  if (!winner) return true;
  return winner.type !== 'disallow';
}

function matchesPattern(pathname: string, pattern: string): boolean {
  if (!pattern) return true;
  const escaped = pattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\\\$$/, '$');
  const regex = new RegExp(`^${escaped}`);
  return regex.test(pathname);
}

/**
 * Scrape multiple URLs in parallel with results tracking.
 *
 * @param urls - Array of URLs to scrape
 * @param timeoutMs - Timeout per URL
 * @returns Array of scrape results
 */
export async function scrapeUrls(urls: string[], timeoutMs = 10000): Promise<ScrapeResult[]> {
  return Promise.all(
    urls.map(async (url) => {
      const content = await scrapeUrl(url, timeoutMs);
      return {
        url,
        content,
        success: content !== null,
        error: content === null ? 'Failed to scrape' : undefined,
      };
    })
  );
}

/**
 * Identify pricing-related URLs from search results.
 * Heuristic: URLs or titles containing pricing keywords.
 *
 * @param results - Array of search results with link and title
 * @param limit - Max URLs to return (default 3)
 * @returns Deduplicated array of pricing URLs
 */
export function identifyPricingUrls(
  results: Array<{ link: string; title: string }>,
  limit = 3
): string[] {
  const pricingKeywords = ['pricing', 'plans', 'price', 'cost', 'subscription'];

  return results
    .filter((r) => {
      const linkLower = r.link.toLowerCase();
      const titleLower = r.title.toLowerCase();
      return pricingKeywords.some((kw) => linkLower.includes(kw) || titleLower.includes(kw));
    })
    .map((r) => r.link)
    .filter((value, index, self) => self.indexOf(value) === index) // Deduplicate
    .slice(0, limit);
}
