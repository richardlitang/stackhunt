/**
 * Hunter Utility Functions
 *
 * Pure utility functions with no side effects.
 * These functions are independently testable and reusable.
 *
 * @module hunter/utils
 */

import type { KnowledgeCard } from '../knowledge-card';
import type { RawSource } from './types';

/**
 * Convert a string to a URL-safe slug.
 *
 * @param text - The text to slugify
 * @returns URL-safe slug (lowercase, hyphens, no special chars)
 *
 * @example
 * slugify("Hello World!") // => "hello-world"
 * slugify("Notion's App") // => "notions-app"
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Interpolate template variables in a string.
 *
 * Supports two patterns:
 * - Simple variables: {{varName}} => replaced with value
 * - Conditionals: {{#varName}}content{{/varName}} => shown only if varName is truthy
 *
 * @param template - Template string with {{variables}}
 * @param vars - Object with variable values
 * @returns Interpolated string
 *
 * @example
 * interpolateTemplate("Hello {{name}}!", { name: "World" })
 * // => "Hello World!"
 *
 * @example
 * interpolateTemplate("{{#context}}Context: {{context}}{{/context}}", { context: "" })
 * // => "" (conditional removed when empty)
 */
export function interpolateTemplate(template: string, vars: Record<string, string>): string {
  let result = template;

  // Handle conditionals: {{#var}}content{{/var}}
  for (const [key, value] of Object.entries(vars)) {
    const conditionalRegex = new RegExp(`\\{\\{#${key}\\}\\}([\\s\\S]*?)\\{\\{/${key}\\}\\}`, 'g');
    result = result.replace(conditionalRegex, value ? '$1' : '');
  }

  // Handle simple variables: {{var}}
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || '');
  }

  return result;
}

/**
 * Build a human-readable markdown summary from a KnowledgeCard.
 *
 * This summary is used in AI prompts to provide verified facts as context.
 * The Architect (synthesis phase) uses this to avoid contradicting known facts.
 *
 * @param card - The KnowledgeCard with verified facts
 * @returns Markdown-formatted fact summary
 *
 * @example
 * const card = { official_name: "Notion", pricing: { model: "freemium" }, ... };
 * const summary = buildFactSummary(card);
 * // Returns multi-line markdown with sections: Pricing, Platforms, Features, etc.
 */
export function buildFactSummary(card: KnowledgeCard): string {
  const lines: string[] = [];

  lines.push(`## Verified Facts for ${card.official_name}`);

  // Pricing
  lines.push(`\n### Pricing`);
  lines.push(`- Model: ${card.pricing.model}`);
  lines.push(`- Free Tier: ${card.pricing.has_free_tier ? 'Yes' : 'No'}`);
  lines.push(
    `- Free Trial: ${card.pricing.has_free_trial ? (card.pricing.trial_days ? `${card.pricing.trial_days} days` : 'Yes') : 'No'}`
  );
  if (card.pricing.starting_price) lines.push(`- Starting Price: ${card.pricing.starting_price}`);

  // Platforms
  const availablePlatforms = card.platforms.filter((p) => p.available).map((p) => p.platform);
  if (availablePlatforms.length > 0) {
    lines.push(`\n### Platforms`);
    lines.push(`- Available on: ${availablePlatforms.join(', ')}`);
  }

  // Features
  if (card.features.core.length > 0) {
    lines.push(`\n### Core Features`);
    card.features.core.forEach((f) => lines.push(`- ${f}`));
  }
  if (card.features.unique.length > 0) {
    lines.push(`\n### Unique Differentiators`);
    card.features.unique.forEach((f) => lines.push(`- ${f}`));
  }

  // Integrations
  lines.push(`\n### Integrations`);
  lines.push(`- API: ${card.integrations.has_api ? 'Yes' : 'No'}`);
  lines.push(`- Zapier: ${card.integrations.has_zapier ? 'Yes' : 'No'}`);
  if (card.integrations.notable.length > 0) {
    lines.push(`- Notable: ${card.integrations.notable.map((i) => i.name).join(', ')}`);
  }

  // Audience
  if (card.audience.primary.length > 0) {
    lines.push(`\n### Target Audience`);
    lines.push(`- Primary: ${card.audience.primary.join(', ')}`);
  }
  if (card.audience.use_cases.length > 0) {
    lines.push(`- Use Cases: ${card.audience.use_cases.join(', ')}`);
  }

  // Competitive
  if (card.competitive.main_alternatives.length > 0) {
    lines.push(`\n### Competitive Landscape`);
    lines.push(`- Main Alternatives: ${card.competitive.main_alternatives.join(', ')}`);
  }
  if (card.competitive.best_for) {
    lines.push(`- Best For: ${card.competitive.best_for}`);
  }
  if (card.competitive.not_ideal_for) {
    lines.push(`- Not Ideal For: ${card.competitive.not_ideal_for}`);
  }

  // Security
  const securityFeatures: string[] = [];
  if (card.security.sso_available) securityFeatures.push('SSO');
  if (card.security.two_factor) securityFeatures.push('2FA');
  if (card.security.soc2_certified) securityFeatures.push('SOC 2');
  if (card.security.gdpr_compliant) securityFeatures.push('GDPR');
  if (card.security.self_hosted_option) securityFeatures.push('Self-hosted option');
  if (securityFeatures.length > 0) {
    lines.push(`\n### Security`);
    lines.push(`- Features: ${securityFeatures.join(', ')}`);
  }

  lines.push(`\n### Data Quality: ${card.meta.data_quality}`);

  return lines.join('\n');
}

// ============================================================================
// SOURCE ATTRIBUTION UTILITIES (Legal Protection)
// ============================================================================

/**
 * Known domains classified by source type for legal protection.
 * Blocked review aggregators should not be classified here; they are excluded by source policy.
 */
const DOMAIN_CLASSIFICATIONS: Record<string, 'official' | 'editorial' | 'community'> = {
  // Editorial/analysis publications
  'gartner.com': 'editorial',
  'pcmag.com': 'editorial',
  'techradar.com': 'editorial',
  'cnet.com': 'editorial',
  'zdnet.com': 'editorial',
  'forbes.com': 'editorial',
  'wired.com': 'editorial',
  'theverge.com': 'editorial',

  // Community/UGC sources (require hedging)
  'reddit.com': 'community',
  'news.ycombinator.com': 'community',
  'twitter.com': 'community',
  'x.com': 'community',
  'quora.com': 'community',
  'medium.com': 'community',
  'dev.to': 'community',
  'stackoverflow.com': 'community',
  'producthunt.com': 'community',
  'indiehackers.com': 'community',
  'lobste.rs': 'community',
  'slashdot.org': 'community',
};

function isLikelyCommunityHost(hostname: string): boolean {
  const communityPrefixes = ['community.', 'forum.', 'forums.', 'discuss.', 'discourse.', 'talk.'];
  return communityPrefixes.some((prefix) => hostname.startsWith(prefix));
}

/**
 * Classify a source URL into official, editorial, or community
 *
 * @param url - The source URL
 * @param toolWebsite - Optional tool's official website for matching
 * @returns Source type classification
 *
 * @example
 * classifySourceType("https://reddit.com/r/notion") // => "community"
 * classifySourceType("https://techradar.com/reviews/notion") // => "editorial"
 * classifySourceType("https://notion.so/pricing") // => "official" (if toolWebsite matches)
 */
export function classifySourceType(
  url: string,
  toolWebsite?: string
): 'official' | 'editorial' | 'community' {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace(/^www\./, '').toLowerCase();
    const pathname = parsed.pathname.toLowerCase();

    // Forum/community subdomains and paths are always community, even on first-party domains.
    if (isLikelyCommunityHost(hostname) || /^\/(community|forum|forums|discuss)(\/|$)/.test(pathname)) {
      return 'community';
    }

    // Check if this is the tool's official website
    if (toolWebsite) {
      const toolHostname = new URL(toolWebsite).hostname.replace(/^www\./, '').toLowerCase();
      if (hostname === toolHostname || hostname.endsWith(`.${toolHostname}`)) {
        return 'official';
      }
    }

    // Check known domain classifications
    for (const [domain, type] of Object.entries(DOMAIN_CLASSIFICATIONS)) {
      if (hostname === domain || hostname.endsWith(`.${domain}`)) {
        return type;
      }
    }

    // Default to editorial for unknown domains (blog posts, news sites, etc.)
    // This is a conservative default that provides reasonable authority
    return 'editorial';
  } catch {
    // Invalid URL, default to community (most restrictive)
    return 'community';
  }
}

/**
 * Hedging prefixes for claims based on source type
 * These protect against defamation claims by clearly attributing opinions
 */
const HEDGING_PREFIXES = {
  community: [
    'Users report that',
    'According to observed community reports,',
    'Based on user discussions,',
    'Community members note that',
    'Reported usage patterns suggest that',
  ],
  editorial: [
    'According to editorial analysis,',
    'Analysts note that',
    'Industry analysts observe that',
    'Based on independent coverage,',
  ],
  official: [], // No hedging needed for official sources - these are facts
};

/**
 * Get a hedging prefix for a claim based on source type
 *
 * @param sourceType - The source type classification
 * @param index - Optional index for variety (cycles through options)
 * @returns Hedging prefix or empty string for official sources
 *
 * @example
 * getHedgingPrefix("community", 0) // => "Users report that"
 * getHedgingPrefix("official", 0)  // => ""
 */
export function getHedgingPrefix(
  sourceType: 'official' | 'editorial' | 'community',
  index: number = 0
): string {
  const prefixes = HEDGING_PREFIXES[sourceType];
  if (prefixes.length === 0) return '';
  return prefixes[index % prefixes.length];
}

/**
 * Format a claim with appropriate hedging based on source type
 *
 * @param claim - The claim object with text and source info
 * @returns Formatted claim text with hedging if needed
 *
 * @example
 * formatClaimWithHedging({
 *   text: "the customer support is slow",
 *   source_type: "community",
 *   claim_type: "opinion"
 * })
 * // => "Users report that the customer support is slow"
 */
export function formatClaimWithHedging(
  claim: {
    text: string;
    source_type: 'official' | 'editorial' | 'community';
    claim_type: 'fact' | 'opinion';
  },
  index: number = 0
): string {
  // Facts from official sources don't need hedging
  if (claim.claim_type === 'fact' && claim.source_type === 'official') {
    return claim.text;
  }

  // Opinions always need hedging (even from editorial sources for extra protection)
  // Community claims always need hedging regardless of claim type
  if (claim.claim_type === 'opinion' || claim.source_type === 'community') {
    const prefix = getHedgingPrefix(claim.source_type, index);
    if (prefix) {
      // Lowercase the first letter of the claim text if adding prefix
      const text = claim.text.charAt(0).toLowerCase() + claim.text.slice(1);
      return `${prefix} ${text}`;
    }
  }

  return claim.text;
}

export type ScoutSnippetBuckets = {
  reviewsSnippets: string[];
  pricingSnippets: string[];
  alternativesSnippets: string[];
  companySnippets: string[];
  technicalSnippets: string[];
  budgetAnalystSnippets: string[];
  tribalKnowledgeSnippets: string[];
};

const DEFAULT_SNIPPET_LIMIT = 8;

function formatSnippet(source: RawSource): string {
  return `[${source.url}] ${source.title}: ${source.snippet}`;
}

function capSnippets(snippets: string[], limit = DEFAULT_SNIPPET_LIMIT): string[] {
  return snippets.slice(0, limit);
}

export function buildSnippetBucketsFromScout(rawSources: RawSource[]): ScoutSnippetBuckets {
  const reviews: string[] = [];
  const pricing: string[] = [];
  const alternatives: string[] = [];
  const company: string[] = [];
  const technical: string[] = [];
  const budget: string[] = [];
  const tribal: string[] = [];

  const companyRegex = /(about|company|press|newsroom|funding|headquarters|careers|team|investor)/i;
  const budgetRegex = /(hidden cost|billing|overage|implementation|setup fee|min seat|commitment|annual)/i;

  for (const source of rawSources) {
    // Hard guardrail: only sources explicitly allowed for ingestion should influence synthesis.
    if (
      source.policy.acquisition_mode !== 'SCRAPE_ALLOWED' ||
      source.policy.llm_ingestion_allowed === 'NO'
    ) {
      continue;
    }

    const snippet = formatSnippet(source);
    const haystack = `${source.title} ${source.snippet} ${source.url}`;

    if (source.intent_tags.includes('reviews')) {
      reviews.push(snippet);
    }

    if (source.intent_tags.includes('pricing')) {
      pricing.push(snippet);
      if (budgetRegex.test(haystack)) {
        budget.push(snippet);
      }
    }

    if (source.intent_tags.includes('alternatives')) {
      alternatives.push(snippet);
    }

    if (
      source.intent_tags.includes('integrations') ||
      source.intent_tags.includes('portability') ||
      source.intent_tags.includes('limits')
    ) {
      technical.push(snippet);
    }

    if (source.source_type === 'community') {
      tribal.push(snippet);
    }

    if (companyRegex.test(haystack)) {
      company.push(snippet);
    }
  }

  return {
    reviewsSnippets: capSnippets(reviews),
    pricingSnippets: capSnippets(pricing),
    alternativesSnippets: capSnippets(alternatives),
    companySnippets: capSnippets(company),
    technicalSnippets: capSnippets(technical),
    budgetAnalystSnippets: capSnippets(budget),
    tribalKnowledgeSnippets: capSnippets(tribal),
  };
}

/**
 * Check if a claim needs a source citation to be legally safe
 *
 * @param claimType - Whether this is fact or opinion
 * @param sourceType - The authority level of the source
 * @returns True if source citation should be prominently displayed
 */
export function claimNeedsCitation(
  claimType: 'fact' | 'opinion',
  sourceType: 'official' | 'editorial' | 'community'
): boolean {
  // All opinions need citations
  if (claimType === 'opinion') return true;

  // Community-sourced "facts" need citations (they might be wrong)
  if (sourceType === 'community') return true;

  // Editorial facts are generally trustworthy but still benefit from citation
  if (sourceType === 'editorial') return true;

  // Official facts (from the tool's own site) don't strictly need citation
  return false;
}
