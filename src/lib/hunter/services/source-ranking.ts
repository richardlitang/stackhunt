import type { SourcePolicyGate } from './source-policy';

export type SourceIntent =
  | 'pricing'
  | 'security'
  | 'portability'
  | 'integrations'
  | 'limits'
  | 'reviews'
  | 'alternatives';

export type SerperSource = {
  url: string;
  title: string;
  snippet: string;
  domain: string;
  published_at?: string;
  time_since?: string;
};

export type RankedSource = SerperSource & {
  score: number;
  deep_scrape_allowed: boolean;
  reasons: string[];
};

export async function rankSources(
  sources: SerperSource[],
  intent: SourceIntent,
  policyLookup: (url: string) => Promise<SourcePolicyGate | null>,
  options?: { toolWebsite?: string; toolName?: string }
): Promise<RankedSource[]> {
  const toolHost = options?.toolWebsite ? extractDomain(options.toolWebsite) : null;
  const toolNameToken = options?.toolName
    ? options.toolName.toLowerCase().replace(/\s+/g, '')
    : null;

  const deduped = dedupeSources(sources);

  const ranked = await Promise.all(
    deduped.map(async (source) => {
      const reasons: string[] = [];
      let score = 0;

      const gate = await policyLookup(source.url);
      const deepScrapeAllowed =
        gate?.acquisition_mode === 'SCRAPE_ALLOWED' && gate?.llm_ingestion_allowed !== 'NO';
      if (!deepScrapeAllowed) {
        score -= 100;
        reasons.push('policy_blocked');
      } else {
        score += 10;
      }

      const domain = source.domain.toLowerCase();
      if (toolHost && domain === toolHost) {
        score += 30;
        reasons.push('official_domain');
      } else if (toolNameToken && domain.replace(/\./g, '').includes(toolNameToken)) {
        score += 15;
        reasons.push('name_domain_match');
      }

      if (matchesIntent(source.url, source.title, intent)) {
        score += 20;
        reasons.push('intent_match');
      }

      if (source.published_at || source.time_since) {
        score += 5;
        reasons.push('freshness_hint');
      }

      return { ...source, score, deep_scrape_allowed: deepScrapeAllowed, reasons };
    })
  );

  return ranked.sort((a, b) => b.score - a.score);
}

function matchesIntent(url: string, title: string, intent: SourceIntent): boolean {
  const haystack = `${url} ${title}`.toLowerCase();
  const patterns: Record<SourceIntent, RegExp> = {
    pricing: /(pricing|plans|cost|subscription|billing)/,
    security: /(security|compliance|soc|iso|gdpr|dpa|privacy)/,
    portability: /(export|import|csv|migration|portability)/,
    integrations: /(integrations|api|webhook|zapier|connect)/,
    limits: /(limits|rate|quota|cap|constraint)/,
    reviews: /(review|ratings|testimonial)/,
    alternatives: /(alternatives|competitor|vs|compare)/,
  };
  return patterns[intent].test(haystack);
}

function dedupeSources(sources: SerperSource[]): SerperSource[] {
  const map = new Map<string, SerperSource>();
  for (const source of sources) {
    const key = canonicalizeUrl(source.url);
    if (!map.has(key)) map.set(key, source);
  }
  return Array.from(map.values());
}

function canonicalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.forEach((_, key) => {
      if (key.startsWith('utm_') || key === 'ref' || key === 'source') {
        parsed.searchParams.delete(key);
      }
    });
    return parsed.toString();
  } catch {
    return url;
  }
}

function extractDomain(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
}
