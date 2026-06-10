/**
 * Claim-language policy: regex-driven sanitization, hedging, and
 * risk-classification rules applied to AI-generated claims before persistence.
 *
 * These rules encode StackHunt's legal/content policy (see
 * .claude/docs/LEGAL_COMPLIANCE.md). Behavior changes here must be covered
 * by the characterization tests in tests/lib/hunter/claim-language.test.ts.
 */
import type { ClaimWithSource } from '../types';
import { detectRiskyCopyTerms, hasScopeQualifier } from '@/lib/claim-policy';

const CONDITIONAL_MARKERS = /\b(if|when|unless|only if|as soon as|before|after)\b/i;
const NEGATIVE_CUES =
  /\b(no|not|lacks|lack|doesn't|cannot|can't|won't|avoid|veto|issue|problem|risk|limit|limited|slow|expensive|broken|bug|fails|failure)\b/i;
const RISKY_ABSOLUTE_TERMS =
  /\b(always|never|broken|scam|unreliable|guaranteed|everyone|nobody)\b/i;
const UNVERIFIED_QUANT_VALUE =
  /\b\d+\s*x\b|\b\d+\s*-\s*\d+\s*(seconds?|minutes?|hours?|days?)\b|\b\d+(?:\.\d+)?%\b/i;
const COMPARATOR_TOKENS =
  /\b(vs\.?|versus|compared to|more than|less than|faster than|slower than|better than|worse than|higher than|lower than|double|doubles|doubling|half|halve|premium)\b/i;
const COMPARATOR_QUANT_TOKENS = /\b\d+(?:\.\d+)?\s*x\b|\b\d+(?:\.\d+)?%/i;
const DERIVED_METRIC_TOKENS = /\b(density|ratio|score|index|rate|lift|uplift)\b/i;
const SALES_GATED_TOKENS = /\b(sales[-\s]?gated|contact sales|talk to sales|sales contact)\b/i;
const ENTERPRISE_SCOPE_TOKENS = /\b(enterprise|business|advanced plan|custom plan)\b/i;
const CONTACT_SALES_TOKENS = /\b(contact sales|talk to sales|request demo|enterprise)\b/i;
const SELF_SERVE_TOKENS =
  /\b(start now|get started|sign up|try free|free trial|create account|api key|start building)\b/i;
const RANKING_CLAIM_TOKENS =
  /\b(rank(?:ed|ing)?|#\d+|top\s*\d+|world.?s\s+\w+-ranked|leaderboard)\b/i;
const TIME_QUANT_TOKENS = /\b\d+\s*-\s*\d+\s*(seconds?|minutes?|hours?|days?)\b/i;
const LE_CHAT_SCOPE_TOKENS = /\b(flash answers?|deep research|file uploads?)\b/i;
const LE_CHAT_NAME_TOKENS = /\b(le\s*chat)\b/i;
const TERMINAL_PUNCTUATION = /[.:;!?…"'`”’)\]]+$/g;
const CONTROL_CHARS_REGEX = /[\p{Cc}\u200B-\u200D\u2060\uFEFF]/gu;
const INCOMPLETE_CLAUSE_ENDING =
  /\b(to|for|with|from|into|onto|on|at|by|of|in|as|than|that|which|who|when|where|if|because|while|and|or|but|via|per)\s*$/i;
const COMMUNITY_HEDGING_PREFIX =
  /^(users report(?: that)?|community (?:reports|mentions|consensus (?:is|suggests)|feedback)|according to (?:reddit|hn|community)|based on user discussions)/i;
const AUTHORITATIVE_SOURCE_TYPES = new Set(['official', 'docs', 'support', 'legal']);

export function isConditional(text: string): boolean {
  return CONDITIONAL_MARKERS.test(text);
}

export function containsNegativeCue(text: string): boolean {
  return NEGATIVE_CUES.test(text);
}

export function containsRiskyAbsolute(text: string): boolean {
  return RISKY_ABSOLUTE_TERMS.test(text);
}

export function hasComparatorToken(text: string): boolean {
  return COMPARATOR_TOKENS.test(text) || COMPARATOR_QUANT_TOKENS.test(text);
}

export function sanitizeNarrativeClaimText(text: string): string {
  return text.normalize('NFKC').replace(CONTROL_CHARS_REGEX, '').replace(/\s+/g, ' ').trim();
}

export function stripTerminalPunctuation(text: string): string {
  return text.replace(TERMINAL_PUNCTUATION, '').trim();
}

export function hasCommunityHedgingLanguage(text: string): boolean {
  return COMMUNITY_HEDGING_PREFIX.test(stripTerminalPunctuation(sanitizeNarrativeClaimText(text)));
}

export function isRenderableClaimText(text: string): boolean {
  const cleaned = stripTerminalPunctuation(sanitizeNarrativeClaimText(text));
  if (!cleaned) return false;
  if (cleaned.length < 12) return true;
  return !INCOMPLETE_CLAUSE_ENDING.test(cleaned);
}

export function sourceTierForClaim(url?: string | null): 'A' | 'B' | 'C' {
  if (!url) return 'C';
  const lower = url.toLowerCase();
  if (
    lower.includes('/docs') ||
    lower.includes('docs.') ||
    lower.includes('/help') ||
    lower.includes('help-center') ||
    lower.includes('/support') ||
    lower.includes('/developers') ||
    lower.includes('/api') ||
    lower.includes('/trust') ||
    lower.includes('/security') ||
    lower.includes('/legal')
  ) {
    return 'A';
  }
  if (lower.includes('/pricing') || lower.includes('/plans')) return 'B';
  return 'C';
}

export function hasAbsoluteMarketingTerm(text: string): boolean {
  return /\b(unlimited|never|guaranteed)\b/i.test(text);
}

export function softenAbsoluteMarketingLanguage(text: string): string {
  let next = text;
  next = next.replace(/\bunlimited\b/gi, 'expanded');
  next = next.replace(/\bnever\b/gi, 'rarely');
  next = next.replace(/\bguaranteed\b/gi, 'designed to');
  return next.replace(/\s{2,}/g, ' ').trim();
}

export function sanitizeRiskyClaimLanguage(text: string): string {
  let next = text;
  next = next.replace(/\bverified\b/gi, 'source-backed');
  next = next.replace(/\baccurate\b/gi, 'source-aligned');
  next = next.replace(/\bguaranteed\b/gi, 'designed to');
  if (/\bno free tier\b/i.test(next) && !hasScopeQualifier(next)) {
    next = next.replace(/\bno free tier\b/gi, 'no self-serve free tier is listed');
  }
  const risky = detectRiskyCopyTerms(next).filter((term) => term !== 'best');
  if (risky.length > 0) {
    return next.replace(/\bbest\b/gi, 'strong');
  }
  return next;
}

export function collectFirstPartyCorpus(
  sources: Array<{
    url: string;
    title: string;
    snippet: string;
  }>,
  toolWebsite?: string
): string {
  if (!toolWebsite) return '';
  let toolHost: string | null = null;
  try {
    toolHost = new URL(toolWebsite).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }

  return sources
    .filter((source) => {
      try {
        const sourceHost = new URL(source.url).hostname.replace(/^www\./, '').toLowerCase();
        return sourceHost === toolHost || sourceHost.endsWith(`.${toolHost}`);
      } catch {
        return false;
      }
    })
    .map((source) => `${source.title || ''} ${source.snippet || ''}`.trim())
    .join(' ')
    .toLowerCase();
}

export function suppressSalesGatedClaim(
  text: string,
  sourceUrl: string | undefined,
  sources: Array<{
    url: string;
    title: string;
    snippet: string;
  }>,
  toolWebsite?: string
): boolean {
  if (!SALES_GATED_TOKENS.test(text)) return false;
  const corpus = collectFirstPartyCorpus(sources, toolWebsite);
  const sourceText = (() => {
    if (!sourceUrl) return '';
    const source = sources.find((entry) => entry.url === sourceUrl);
    return `${source?.title || ''} ${source?.snippet || ''}`.toLowerCase();
  })();

  const hasSelfServe = SELF_SERVE_TOKENS.test(corpus) || SELF_SERVE_TOKENS.test(sourceText);
  const hasContactSales =
    CONTACT_SALES_TOKENS.test(corpus) || CONTACT_SALES_TOKENS.test(sourceText);
  const scopedToEnterprise = ENTERPRISE_SCOPE_TOKENS.test(text);

  if (!hasContactSales) return true;
  if (hasSelfServe && !scopedToEnterprise) return true;
  return false;
}

export function rewriteVendorRankingClaim(text: string, sourceDate?: string): string {
  const normalized = text
    .replace(/\s{2,}/g, ' ')
    .trim()
    .replace(/\.$/, '');
  const dated = sourceDate ? ` (${sourceDate.slice(0, 10)})` : '';
  return `Vendor materials describe this claim as: ${normalized}${dated}.`;
}

export function stripUnsupportedQuantitativePhrases(text: string): string {
  let next = text;
  next = next.replace(TIME_QUANT_TOKENS, '').replace(/\b\d+(?:\.\d+)?\s*x\b/gi, '');
  next = next
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([.,;!?])/g, '$1')
    .trim();
  return next;
}

export function enforceOfferingScope(
  text: string,
  sourceUrl: string | undefined,
  sources: Array<{
    url: string;
    title: string;
    snippet: string;
  }>
): string | null {
  if (!LE_CHAT_SCOPE_TOKENS.test(text)) return text;
  if (LE_CHAT_NAME_TOKENS.test(text)) return text;

  const sourceText = (() => {
    if (!sourceUrl) return '';
    const source = sources.find((entry) => entry.url === sourceUrl);
    return `${source?.title || ''} ${source?.snippet || ''}`.toLowerCase();
  })();
  const corpus = sources
    .map((source) => `${source.title || ''} ${source.snippet || ''}`)
    .join(' ')
    .toLowerCase();
  const hasLeChatEvidence =
    LE_CHAT_NAME_TOKENS.test(sourceText) || LE_CHAT_NAME_TOKENS.test(corpus);
  if (!hasLeChatEvidence) return null;
  return `In Le Chat, ${text.charAt(0).toLowerCase()}${text.slice(1)}`;
}

export function detectClaimKind(
  text: string,
  claimType: 'fact' | 'opinion'
): 'verbatim_feature' | 'derived_metric' | 'comparison' | 'inference' {
  if (COMPARATOR_TOKENS.test(text) || COMPARATOR_QUANT_TOKENS.test(text)) return 'comparison';
  if (DERIVED_METRIC_TOKENS.test(text) || /\b\d+(?:\.\d+)?%\b/i.test(text)) return 'derived_metric';
  if (claimType === 'fact') return 'verbatim_feature';
  return 'inference';
}

export function downgradeComparativeClause(text: string): string | null {
  let next = text;
  next = next.replace(/\([^)]*(?:vs\.?|versus|compared to)[^)]*\)/gi, '');
  next = next.replace(/\b(?:compared to|vs\.?|versus)\b[^.?!;]*/gi, '');
  next = next.replace(
    /\b(?:more|less|faster|slower|better|worse|higher|lower)\s+than\b[^.?!;]*/gi,
    ''
  );
  next = next.replace(/\b(?:double|doubles|doubling|half|halve|premium)\b[^.?!;]*/gi, '');
  next = next.replace(COMPARATOR_QUANT_TOKENS, '').trim();
  next = next.replace(/\b\d+(?:\.\d+)?%/g, '').trim();
  next = next
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([.,;!?])/g, '$1')
    .trim();
  if (next.length < 10) return null;
  return next;
}

export function isIntegrationGapClaim(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    (lower.includes('zapier') ||
      lower.includes('make.com') ||
      /\bn8n\b/.test(lower) ||
      lower.includes('integration')) &&
    (lower.includes('lack') ||
      lower.includes('lacks') ||
      lower.includes('missing') ||
      lower.includes('no ') ||
      lower.includes('without') ||
      lower.includes('necessitating'))
  );
}

export function isAuthoritativeClaim(claim: ClaimWithSource): boolean {
  return AUTHORITATIVE_SOURCE_TYPES.has((claim.source_type || '').toLowerCase());
}

export function validateNegativeClaim(
  claim: ClaimWithSource,
  allSources: Array<{
    url: string;
    canonical_url?: string;
    title: string;
    snippet: string;
    domain: string;
    source_type?:
      | 'official'
      | 'docs'
      | 'support'
      | 'legal'
      | 'editorial'
      | 'community'
      | 'directory';
    acquisition_mode?: 'LINK_ONLY' | 'API_ONLY' | 'SCRAPE_ALLOWED' | 'BLOCKED';
    llm_ingestion_allowed?: 'NO' | 'YES_LIMITED' | 'YES';
    retrieved_at?: string;
    published_at?: string;
    time_since?: string;
  }>
): {
  isValid: boolean;
  warning?: string;
  corroboratingSourceCount: number;
  corroboratingSources?: string[];
} {
  if (!claim.source_url) {
    return {
      isValid: false,
      warning: 'Missing source URL for negative claim.',
      corroboratingSourceCount: 0,
    };
  }
  if (claim.claim_type === 'fact' && AUTHORITATIVE_SOURCE_TYPES.has(claim.source_type)) {
    return { isValid: true, corroboratingSourceCount: 1 };
  }

  const LOW_TRUST_DIRECTORY_DOMAINS = [
    'g2.com',
    'capterra.com',
    'trustpilot.com',
    'getapp.com',
    'softwareadvice.com',
  ];
  const corroborationPool = allSources.filter((source) => {
    if (source.acquisition_mode && source.acquisition_mode !== 'SCRAPE_ALLOWED') return false;
    if (source.llm_ingestion_allowed === 'NO') return false;
    if (source.source_type === 'directory') return false;
    const domain = (source.domain || '').toLowerCase();
    if (
      LOW_TRUST_DIRECTORY_DOMAINS.some(
        (candidate) => domain === candidate || domain.endsWith(`.${candidate}`)
      )
    ) {
      return false;
    }
    return true;
  });

  const normalizedClaimText = claim.text.toLowerCase();
  const significantWords = normalizedClaimText
    .split(/\s+/)
    .map((word) => word.replace(/[^a-z0-9]/g, ''))
    .filter(
      (word) =>
        word.length > 4 &&
        ![
          'users',
          'report',
          'according',
          'community',
          'feedback',
          'tool',
          'product',
          'service',
          'platform',
        ].includes(word)
    );

  const corroboratingSources: string[] = [];
  const seenDomains = new Set<string>();

  for (const source of corroborationPool) {
    const sourceText = `${source.title} ${source.snippet}`.toLowerCase();
    const matchingWords = significantWords.filter((word) => sourceText.includes(word));

    if (matchingWords.length >= Math.max(2, Math.ceil(significantWords.length * 0.3))) {
      const domain = source.domain.toLowerCase();
      if (!seenDomains.has(domain)) {
        seenDomains.add(domain);
        corroboratingSources.push(source.url);
      }
    }
  }

  const corroboratingSourceCount = corroboratingSources.length;
  const isValid = corroboratingSourceCount >= 2;

  if (!isValid) {
    return {
      isValid: false,
      warning: `Negative claim lacks sufficient corroboration (${corroboratingSourceCount}/2 sources).`,
      corroboratingSourceCount,
      corroboratingSources,
    };
  }

  return {
    isValid: true,
    corroboratingSourceCount,
    corroboratingSources,
  };
}

export { RANKING_CLAIM_TOKENS, UNVERIFIED_QUANT_VALUE };
