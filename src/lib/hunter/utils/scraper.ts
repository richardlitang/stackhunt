/**
 * Page Scraper - Jina.ai Reader wrapper
 *
 * Converts URLs to LLM-friendly Markdown for deep content extraction.
 * Used to get actual pricing tables instead of just snippets.
 *
 * @module hunter/utils/scraper
 */

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

/**
 * Uses Jina.ai Reader to convert a URL into clean Markdown.
 * Includes timeout to prevent pipeline hangs.
 *
 * @param url - The URL to scrape
 * @param timeoutMs - Timeout in milliseconds (default 10s)
 * @returns Markdown content or null on failure
 */
export async function scrapeUrl(url: string, timeoutMs = 10000): Promise<string | null> {
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
    const maxLength = 50000;
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
