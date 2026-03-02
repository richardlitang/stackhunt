/**
 * Persistence Phase - Dedup + Save + Graph Links
 *
 * Phase 3 of the Hunter pipeline:
 * 1. Check for similar context (deduplication)
 * 2. Save tool to database with Knowledge Card metadata
 * 3. Create Knowledge Graph links (functions, audiences, platforms)
 * 4. Create or reuse context
 * 5. Create review linking tool to context
 *
 * @module hunter/phases/persistence
 */

import type {
  HunterContext,
  HunterDependencies,
  PersistenceOutput,
  ClaimWithSource,
} from '../types';
import { slugify, classifySourceType } from '../utils';
import { normalizeCategory } from '../../config/taxonomy';
import { ensureParentSuite } from '../utils/suite-manager';
import { updateNormalizedPricing } from '../../pricing/persist';
import { mapSmpPricingToV2 } from '../../pricing';
import { persistItemFactPack } from '../fact-pack';
import { mergeDefined } from '@/lib/utils/merge-defined';
import type { ToolSpecs } from '@/types/database';
import { guardFaqVolatileFacts } from '../validation/faq-volatile-guard';
import {
  classifyClaimVolatility,
  computeClaimRecheckBy,
  detectRiskyCopyTerms,
  hasScopeQualifier,
  inferClaimScope,
  isClaimStale,
} from '@/lib/claim-policy';
import {
  evaluateIndexReadiness,
  resolvePopularityTier,
  type PopularityTier,
} from '@/lib/quality-gate';
import { sanitizeUrl } from '@/lib/utils/url';

export interface DatabaseTypes {
  ToolInsert: Record<string, unknown>;
  ContextInsert: Record<string, unknown>;
  ReviewInsert: Record<string, unknown>;
  AffiliateOfferInsert: Record<string, unknown>;
}

/**
 * Infer target_market from pricing plans
 * Logic:
 * - Has business/enterprise plans → 'business'
 * - Only individual/free plans → 'consumer'
 * - Has both individual AND team/business → 'prosumer'
 */
function inferTargetMarket(plans: any[]): 'consumer' | 'prosumer' | 'business' | 'enterprise' {
  if (!plans || plans.length === 0) return 'business'; // Default for tools without pricing

  const audiences = plans.map((p) => p.target_audience).filter(Boolean);

  const hasEnterprise = audiences.includes('enterprise');
  const hasBusiness = audiences.includes('business');
  const hasTeam = audiences.includes('team');
  const hasIndividual = audiences.includes('individual');

  // Enterprise-focused tools
  if (hasEnterprise && !hasIndividual) return 'enterprise';

  // Business-focused tools
  if ((hasBusiness || hasEnterprise) && !hasIndividual) return 'business';

  // Prosumer tools (serve both individuals and businesses)
  if (hasIndividual && (hasTeam || hasBusiness || hasEnterprise)) return 'prosumer';

  // Consumer-only tools
  if (hasIndividual && !hasTeam && !hasBusiness && !hasEnterprise) return 'consumer';

  // Default to business if unclear
  return 'business';
}

const CONDITIONAL_MARKERS = /\b(if|when|unless|only if|as soon as|before|after)\b/i;
const NEGATIVE_CUES =
  /\b(no|not|lacks|lack|doesn't|cannot|can't|won't|avoid|veto|issue|problem|risk|limit|limited|slow|expensive|broken|bug|fails|failure)\b/i;
const RISKY_ABSOLUTE_TERMS =
  /\b(always|never|broken|scam|unreliable|guaranteed|everyone|nobody)\b/i;
const PRICING_LIKE_VALUE_TERMS =
  /\b(price|pricing|cost|costs|fee|fees|billing|billed|monthly|annual|yearly|enterprise|pro\b|max\b|plan|seat)\b/i;
const UNVERIFIED_QUANT_VALUE =
  /\b\d+\s*x\b|\b\d+\s*-\s*\d+\s*(seconds?|minutes?|hours?|days?)\b|\b\d+(?:\.\d+)?%\b/i;
const SEAT_ACCESS_ABSOLUTE =
  /\bsingle seat\b.*\b(access|includes|provides)\b.*\b(design|dev mode|figjam|slides)\b/i;
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

const POPULARITY_PROFILES: Record<
  PopularityTier,
  {
    minScore: number;
    allowedDataQualities: Array<'high' | 'medium' | 'low'>;
    maxFilteredCons: number;
    minValidCons: number;
    minAuthoritativeSources: number;
    minAuthoritativeDomains: number;
    minDiscoveryOfficialSources: number;
    minDiscoveryOfficialDomains: number;
  }
> = {
  popular: {
    minScore: 70,
    allowedDataQualities: ['high', 'medium'],
    maxFilteredCons: 2,
    minValidCons: 1,
    minAuthoritativeSources: 2,
    minAuthoritativeDomains: 1,
    minDiscoveryOfficialSources: 2,
    minDiscoveryOfficialDomains: 1,
  },
  standard: {
    minScore: 75,
    allowedDataQualities: ['high', 'medium'],
    maxFilteredCons: 2,
    minValidCons: 1,
    minAuthoritativeSources: 3,
    minAuthoritativeDomains: 2,
    minDiscoveryOfficialSources: 2,
    minDiscoveryOfficialDomains: 1,
  },
  below_standard: {
    minScore: 80,
    allowedDataQualities: ['high'],
    maxFilteredCons: 1,
    minValidCons: 2,
    minAuthoritativeSources: 4,
    minAuthoritativeDomains: 2,
    minDiscoveryOfficialSources: 3,
    minDiscoveryOfficialDomains: 2,
  },
};

function meetsAuthoritativeSourceThreshold(
  tier: PopularityTier,
  count: number,
  minRequired: number,
  score: number
): boolean {
  if (count >= minRequired) return true;
  if (tier === 'popular' && count >= 1 && score >= 88) return true;
  return false;
}

function meetsAuthoritativeDomainThreshold(
  tier: PopularityTier,
  domains: number,
  minRequired: number,
  sourceCount: number,
  score: number
): boolean {
  if (domains >= minRequired) return true;
  if (tier === 'standard' && domains >= 1 && sourceCount >= 4 && score >= 80) return true;
  return false;
}

function isConditional(text: string): boolean {
  return CONDITIONAL_MARKERS.test(text);
}

function containsNegativeCue(text: string): boolean {
  return NEGATIVE_CUES.test(text);
}

function containsRiskyAbsolute(text: string): boolean {
  return RISKY_ABSOLUTE_TERMS.test(text);
}

function hasComparatorToken(text: string): boolean {
  return COMPARATOR_TOKENS.test(text) || COMPARATOR_QUANT_TOKENS.test(text);
}

function sanitizeNarrativeClaimText(text: string): string {
  return text.normalize('NFKC').replace(CONTROL_CHARS_REGEX, '').replace(/\s+/g, ' ').trim();
}

function stripTerminalPunctuation(text: string): string {
  return text.replace(TERMINAL_PUNCTUATION, '').trim();
}

function hasCommunityHedgingLanguage(text: string): boolean {
  return COMMUNITY_HEDGING_PREFIX.test(stripTerminalPunctuation(sanitizeNarrativeClaimText(text)));
}

function isRenderableClaimText(text: string): boolean {
  const cleaned = stripTerminalPunctuation(sanitizeNarrativeClaimText(text));
  if (!cleaned) return false;
  if (cleaned.length < 12) return true;
  return !INCOMPLETE_CLAUSE_ENDING.test(cleaned);
}

function sourceTierForClaim(url?: string | null): 'A' | 'B' | 'C' {
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

function hasAbsoluteMarketingTerm(text: string): boolean {
  return /\b(unlimited|never|guaranteed)\b/i.test(text);
}

function softenAbsoluteMarketingLanguage(text: string): string {
  let next = text;
  next = next.replace(/\bunlimited\b/gi, 'expanded');
  next = next.replace(/\bnever\b/gi, 'rarely');
  next = next.replace(/\bguaranteed\b/gi, 'designed to');
  return next.replace(/\s{2,}/g, ' ').trim();
}

function sanitizeRiskyClaimLanguage(text: string): string {
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

function normalizeChecklistItems(value: unknown, max = 5): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const items: string[] = [];
  for (const raw of value) {
    if (typeof raw !== 'string') continue;
    const cleaned = raw.trim().replace(/\s+/g, ' ');
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(cleaned);
    if (items.length >= max) break;
  }
  return items;
}

function normalizeFeatureLabel(value: string): string {
  return value
    .toLowerCase()
    .replace(/[()]/g, ' ')
    .replace(/[^a-z0-9+\-/\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isGenericDifferentiator(value: string): boolean {
  const normalized = normalizeFeatureLabel(value);
  if (!normalized || normalized.length < 6) return true;
  const genericPatterns = [
    /\bai (chat|assistant|automation|generation)\b/,
    /\b(api|integrations?|webhooks?|automation)\b/,
    /\b(data export|export)\b/,
    /\b(collaboration|workflow|productivity)\b/,
    /\b(conversation memory|memory)\b/,
    /\b(code generation)\b/,
  ];
  return genericPatterns.some((pattern) => pattern.test(normalized));
}

function hasSpecificSignal(value: string): boolean {
  return (
    /\b\d/.test(value) ||
    /\b(pro|max|enterprise|team|business|starter|free)\b/i.test(value) ||
    /\b(scim|sso|dpa|soc 2|hipaa|gdpr|api)\b/i.test(value) ||
    /\b[A-Z]{2,}\b/.test(value)
  );
}

function featureOverlapRatio(a: string, b: string): number {
  const tokenize = (value: string) =>
    new Set(
      normalizeFeatureLabel(value)
        .split(' ')
        .filter((token) => token.length >= 3)
    );
  const aa = tokenize(a);
  const bb = tokenize(b);
  if (aa.size === 0 || bb.size === 0) return 0;
  let overlap = 0;
  for (const token of aa) {
    if (bb.has(token)) overlap += 1;
  }
  return overlap / aa.size;
}

async function enrichComparativeFeatureSignals(
  knowledgeCard: any,
  deps: HunterDependencies,
  params: { categoryId?: string | null; toolSlug: string }
): Promise<void> {
  if (!knowledgeCard || typeof knowledgeCard !== 'object') return;
  if (!knowledgeCard.features || typeof knowledgeCard.features !== 'object') return;

  const rawCore = Array.isArray(knowledgeCard.features.core) ? knowledgeCard.features.core : [];
  const rawUnique = Array.isArray(knowledgeCard.features.unique) ? knowledgeCard.features.unique : [];
  const rawDifferentiators = Array.isArray(knowledgeCard?.competitive?.differentiators)
    ? knowledgeCard.competitive.differentiators
    : [];
  const candidates = [...rawUnique, ...rawDifferentiators]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .map((value) => value.trim());

  if (candidates.length === 0) return;

  const peerFeatureCorpus: string[] = [];
  let peerCount = 0;

  if (params.categoryId) {
    const { data: links } = await deps.supabase
      .from('item_category_links')
      .select('item_id')
      .eq('category_id', params.categoryId)
      .limit(80);
    const peerIds = (links || []).map((entry: any) => entry.item_id).filter(Boolean);
    if (peerIds.length > 0) {
      const { data: peers } = await deps.supabase
        .from('items')
        .select('slug, metadata')
        .in('id', peerIds)
        .neq('slug', params.toolSlug)
        .limit(50);

      for (const peer of peers || []) {
        const metadata = peer?.metadata && typeof peer.metadata === 'object' ? peer.metadata : null;
        const features =
          metadata && typeof (metadata as any).features === 'object'
            ? ((metadata as any).features as Record<string, unknown>)
            : null;
        if (!features) continue;
        peerCount += 1;
        const peerCore = Array.isArray(features.core) ? features.core : [];
        const peerUnique = Array.isArray(features.unique) ? features.unique : [];
        for (const entry of [...peerCore, ...peerUnique]) {
          if (typeof entry === 'string' && entry.trim().length > 0) {
            peerFeatureCorpus.push(entry.trim());
          }
        }
      }
    }
  }

  const seen = new Set<string>();
  const scored = candidates
    .map((candidate) => {
      const key = normalizeFeatureLabel(candidate);
      if (!key || seen.has(key)) return null;
      seen.add(key);
      const overlapHits = peerFeatureCorpus.reduce((hits, peerFeature) => {
        return hits + (featureOverlapRatio(candidate, peerFeature) >= 0.6 ? 1 : 0);
      }, 0);
      const overlapRate =
        peerFeatureCorpus.length > 0 ? overlapHits / Math.max(peerFeatureCorpus.length, 1) : 0;
      return { candidate, overlapRate };
    })
    .filter((entry): entry is { candidate: string; overlapRate: number } => Boolean(entry));

  const selected = scored
    .filter(({ candidate, overlapRate }) => {
      if (isGenericDifferentiator(candidate) && !hasSpecificSignal(candidate)) return false;
      if (peerFeatureCorpus.length === 0) return true;
      if (hasSpecificSignal(candidate)) return overlapRate <= 0.35;
      return overlapRate <= 0.2;
    })
    .sort((a, b) => a.overlapRate - b.overlapRate)
    .map((entry) => entry.candidate)
    .slice(0, 4);

  const fallbackSelected = candidates
    .filter((candidate) => !isGenericDifferentiator(candidate))
    .slice(0, 3);
  const effectiveUnique = (selected.length > 0 ? selected : fallbackSelected).slice(0, 4);
  if (effectiveUnique.length === 0) return;

  const cleanedCore = rawCore
    .filter((value: unknown): value is string => typeof value === 'string' && value.trim().length > 0)
    .map((value: string) => value.trim())
    .filter((value: string, index: number, arr: string[]) => {
      const key = normalizeFeatureLabel(value);
      return arr.findIndex((entry) => normalizeFeatureLabel(entry) === key) === index;
    })
    .slice(0, 6);

  knowledgeCard.features.core = cleanedCore;
  knowledgeCard.features.unique = effectiveUnique;
  if (knowledgeCard.competitive && typeof knowledgeCard.competitive === 'object') {
    knowledgeCard.competitive.differentiators = effectiveUnique;
  }
  if (!knowledgeCard.meta || typeof knowledgeCard.meta !== 'object') {
    knowledgeCard.meta = {};
  }
  knowledgeCard.meta.comparative_feature_refresh = new Date().toISOString();
  knowledgeCard.meta.comparative_feature_peer_count = peerCount;

  deps.log(
    `[Comparative Features] ${params.toolSlug}: selected ${effectiveUnique.length}/${candidates.length} differentiators (peers=${peerCount})`
  );
}

function deriveBuyerChecklists(analysis: any): { quickChecks: string[]; teamItChecks: string[] } {
  const quickChecks = normalizeChecklistItems(analysis?.canonicalFacts?.quick_checks, 5);
  const teamItChecks = normalizeChecklistItems(analysis?.canonicalFacts?.team_it_checks, 5);

  if (quickChecks.length > 0 || teamItChecks.length > 0) {
    return { quickChecks, teamItChecks };
  }

  const fallbackQuickChecks = [
    'Confirm pricing cadence and seat model for your expected usage.',
    'Verify plan-gated features required for your first 30 days.',
    'Run one real workflow before committing.',
    'Check export and cancellation paths before lock-in.',
  ];
  const fallbackTeamItChecks = [
    'Confirm SSO, SCIM, and admin controls for your team setup.',
    'Verify DPA, retention policy, and audit log availability.',
    'Validate API limits, integration constraints, and access controls.',
  ];
  return {
    quickChecks: fallbackQuickChecks,
    teamItChecks: fallbackTeamItChecks,
  };
}

function extractNamedFeatures(text: string): string[] {
  const quoted = Array.from(text.matchAll(/["'“”]([^"'“”]{3,80})["'“”]/g)).map((m) => m[1].trim());
  const titleCase = Array.from(
    text.matchAll(/\b([A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+){1,4})\b/g)
  ).map((m) => m[1].trim());
  const candidates = [...quoted, ...titleCase];
  const deny = new Set(['OpenAI', 'Anthropic', 'Google', 'xAI', 'API', 'Enterprise', 'Pro', 'Max']);
  return Array.from(
    new Set(
      candidates.filter((item) => {
        if (item.length < 4) return false;
        if (deny.has(item)) return false;
        if (/^(The|This|That|These|Those)\b/.test(item)) return false;
        return true;
      })
    )
  );
}

function overlapRatio(a: string, b: string): number {
  const aw = new Set(
    a
      .toLowerCase()
      .split(/\s+/)
      .map((w) => w.replace(/[^a-z0-9]/g, ''))
      .filter((w) => w.length > 3)
  );
  const bw = new Set(
    b
      .toLowerCase()
      .split(/\s+/)
      .map((w) => w.replace(/[^a-z0-9]/g, ''))
      .filter((w) => w.length > 3)
  );
  if (aw.size === 0 || bw.size === 0) return 0;
  let matches = 0;
  for (const token of aw) {
    if (bw.has(token)) matches++;
  }
  return matches / aw.size;
}

function normalizeEvidenceUrl(rawUrl?: string | null): string | null {
  const sanitized = sanitizeUrl(rawUrl);
  if (!sanitized) return null;
  try {
    const parsed = new URL(sanitized);
    parsed.hash = '';
    for (const key of Array.from(parsed.searchParams.keys())) {
      if (key.startsWith('utm_') || key === 'ref' || key === 'source') {
        parsed.searchParams.delete(key);
      }
    }
    if (parsed.pathname !== '/' && parsed.pathname.endsWith('/')) {
      parsed.pathname = parsed.pathname.slice(0, -1);
    }
    return parsed.toString();
  } catch {
    return sanitized;
  }
}

function collectFirstPartyCorpus(
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

function suppressSalesGatedClaim(
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

function rewriteVendorRankingClaim(text: string, sourceDate?: string): string {
  const normalized = text
    .replace(/\s{2,}/g, ' ')
    .trim()
    .replace(/\.$/, '');
  const dated = sourceDate ? ` (${sourceDate.slice(0, 10)})` : '';
  return `Vendor materials describe this claim as: ${normalized}${dated}.`;
}

function stripUnsupportedQuantitativePhrases(text: string): string {
  let next = text;
  next = next.replace(TIME_QUANT_TOKENS, '').replace(/\b\d+(?:\.\d+)?\s*x\b/gi, '');
  next = next
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([.,;!?])/g, '$1')
    .trim();
  return next;
}

function enforceOfferingScope(
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

function detectClaimKind(
  text: string,
  claimType: 'fact' | 'opinion'
): 'verbatim_feature' | 'derived_metric' | 'comparison' | 'inference' {
  if (COMPARATOR_TOKENS.test(text) || COMPARATOR_QUANT_TOKENS.test(text)) return 'comparison';
  if (DERIVED_METRIC_TOKENS.test(text) || /\b\d+(?:\.\d+)?%\b/i.test(text)) return 'derived_metric';
  if (claimType === 'fact') return 'verbatim_feature';
  return 'inference';
}

function downgradeComparativeClause(text: string): string | null {
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

function buildCanonicalPricingPlans(pricingData: any): {
  entities: Array<{
    plan_id: string;
    plan_name: string;
    audience?: string | null;
    seat_type?: string | null;
    price_monthly?: number | null;
    price_annual?: number | null;
    source_url?: string | null;
    currency?: string | null;
  }>;
  conflicts: Array<{ key: string; values: unknown[]; urls: string[] }>;
} {
  const plans = Array.isArray(pricingData?.plans) ? pricingData.plans : [];
  const sourceUrl: string | null =
    typeof pricingData?.pricing_page_url === 'string' ? pricingData.pricing_page_url : null;
  const currency: string | null =
    typeof pricingData?.currency === 'string' ? pricingData.currency : null;

  const entities = plans.map((plan: any) => ({
    plan_id: String(plan?.id || slugify(String(plan?.name || 'plan'))),
    plan_name: String(plan?.name || 'Unknown'),
    audience: typeof plan?.target_audience === 'string' ? plan.target_audience : null,
    seat_type: typeof plan?.scaling_unit === 'string' ? plan.scaling_unit : null,
    price_monthly: typeof plan?.price_monthly === 'number' ? plan.price_monthly : null,
    price_annual: typeof plan?.price_annual === 'number' ? plan.price_annual : null,
    source_url: sourceUrl,
    currency,
  }));

  const byCanonicalPlan = new Map<
    string,
    { monthly: Set<number>; annual: Set<number>; urls: Set<string> }
  >();
  for (const entity of entities) {
    const key = `${entity.plan_id}|${(entity.audience || 'unknown').toLowerCase()}`;
    if (!byCanonicalPlan.has(key)) {
      byCanonicalPlan.set(key, {
        monthly: new Set<number>(),
        annual: new Set<number>(),
        urls: new Set<string>(),
      });
    }
    const bucket = byCanonicalPlan.get(key)!;
    if (typeof entity.price_monthly === 'number') bucket.monthly.add(entity.price_monthly);
    if (typeof entity.price_annual === 'number') bucket.annual.add(entity.price_annual);
    if (entity.source_url) bucket.urls.add(entity.source_url);
  }

  const conflicts: Array<{ key: string; values: unknown[]; urls: string[] }> = [];
  for (const [key, bucket] of byCanonicalPlan.entries()) {
    if (bucket.monthly.size > 1) {
      conflicts.push({
        key: `${key}:price_monthly`,
        values: Array.from(bucket.monthly.values()),
        urls: Array.from(bucket.urls.values()),
      });
    }
    if (bucket.annual.size > 1) {
      conflicts.push({
        key: `${key}:price_annual`,
        values: Array.from(bucket.annual.values()),
        urls: Array.from(bucket.urls.values()),
      });
    }
  }

  return { entities, conflicts };
}

function sanitizeOperationalFields(
  data: Record<string, unknown> | undefined,
  label: string,
  deps: HunterDependencies
): Record<string, unknown> {
  if (!data || typeof data !== 'object') return {};

  const result: Record<string, unknown> = {};
  let dropped = 0;

  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (
        PRICING_LIKE_VALUE_TERMS.test(trimmed) ||
        UNVERIFIED_QUANT_VALUE.test(trimmed) ||
        SEAT_ACCESS_ABSOLUTE.test(trimmed)
      ) {
        dropped++;
        continue;
      }
    }
    result[key] = value;
  }

  if (dropped > 0) {
    deps.log(
      `[Guardrail] Dropped ${dropped} ${label} field(s) with pricing/quantitative narrative risk`
    );
  }

  return result;
}

function isIntegrationGapClaim(text: string): boolean {
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

function isIntegrationCriticalContext(contextTitle?: string): boolean {
  if (!contextTitle) return false;
  const ctx = contextTitle.toLowerCase();
  return (
    ctx.includes('automation') ||
    ctx.includes('workflow') ||
    ctx.includes('integration') ||
    ctx.includes('zapier') ||
    ctx.includes('make') ||
    ctx.includes('n8n') ||
    ctx.includes('no-code')
  );
}

function sanitizeShortDescription(
  shortDescription: string | undefined,
  contextTitle?: string
): string | null {
  if (!shortDescription || typeof shortDescription !== 'string') return null;

  const criticalIntegration = isIntegrationCriticalContext(contextTitle);
  let sanitized = shortDescription.trim();
  if (!criticalIntegration) {
    sanitized = sanitized.replace(
      /(?:,?\s*(?:but|while)?\s*)?lacking\s+(?:(?:a\s+)?free tier\s+(?:or|and)\s+)?(?:a\s+)?(?:native\s+)?zapier integration\.?/i,
      ''
    );
    sanitized = sanitized
      .replace(/\s{2,}/g, ' ')
      .replace(/\s+\./g, '.')
      .trim();
  }
  sanitized = sanitized.replace(/\s*this action is redundant with the description above\.?/i, '');
  sanitized = sanitized
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+\./g, '.')
    .trim();

  return sanitized || null;
}

function sanitizeSetupComplexityWithEvidence(
  knowledgeCard: any,
  sources: Array<{
    url: string;
    title: string;
    snippet: string;
  }>,
  toolWebsite: string | undefined,
  deps: HunterDependencies
): void {
  const setup = knowledgeCard?.setup_complexity;
  if (!setup || typeof setup !== 'object') return;

  const hasCliCommandEvidence = Array.isArray(setup.steps)
    ? setup.steps.some(
        (step: any) => typeof step?.command === 'string' && step.command.trim().length > 0
      )
    : false;
  const firstPartyCorpus = collectFirstPartyCorpus(sources, toolWebsite);
  const hasCliTextEvidence =
    /\b(cli|command line|terminal|npm\s+install|pip\s+install|brew\s+install)\b/i.test(
      firstPartyCorpus
    );

  if (setup.setup_type === 'hybrid' && !hasCliCommandEvidence && !hasCliTextEvidence) {
    setup.setup_type = 'web';
    deps.log('[Setup Guard] Downgraded setup_type hybrid -> web (no CLI evidence)');
  }

  if (setup.red_tape && typeof setup.red_tape === 'object') {
    if (
      setup.red_tape.sales_gated === true &&
      suppressSalesGatedClaim('sales-gated', undefined, sources, toolWebsite)
    ) {
      setup.red_tape.sales_gated = false;
      deps.log('[Setup Guard] Removed sales_gated red-tape flag (self-serve flow detected)');
    }

    if (
      setup.red_tape.cc_required === true &&
      /\bno credit card required\b/i.test(firstPartyCorpus)
    ) {
      setup.red_tape.cc_required = false;
      deps.log('[Setup Guard] Removed cc_required red-tape flag (free signup evidence found)');
    }
  }

  knowledgeCard.setup_complexity = setup;
}

function isBackedByClaims(text: string, claims: ClaimWithSource[]): boolean {
  const words = text
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 4);
  if (words.length === 0) return false;
  return claims.some((claim) => {
    const claimText = claim.text.toLowerCase();
    const matchCount = words.filter((w) => claimText.includes(w)).length;
    return matchCount >= words.length * 0.4;
  });
}

function filterConditionalList(
  items: string[] | undefined,
  label: string,
  deps: HunterDependencies
): string[] {
  if (!items || items.length === 0) return [];
  const filtered = items.filter((item) => isConditional(item));
  const dropped = items.length - filtered.length;
  if (dropped > 0) {
    deps.log(`[Guardrail] Filtered ${dropped} ${label} item(s) without conditional framing`);
  }
  deps.log(`[Guardrail] ${label}: kept ${filtered.length}/${items.length} (conditional framing)`);
  return filtered;
}

function buildDerivedVerdict(
  cons: ClaimWithSource[],
  pros: ClaimWithSource[],
  vetos: Array<{ condition: string; alternative: string }> | null
): string | null {
  const summaryCons = selectSummaryClaims(cons);
  const summaryPros = selectSummaryClaims(pros);
  if (vetos && vetos.length > 0) {
    const veto = vetos[0];
    if (summaryPros.length > 0) {
      return `Choose when ${summaryPros[0].text}. Switch to ${veto.alternative} if ${veto.condition}.`;
    }
    return `Switch to ${veto.alternative} if ${veto.condition}.`;
  }
  if (summaryPros.length > 0 && summaryCons.length > 0) {
    return `Choose when ${summaryPros[0].text}. Avoid when ${summaryCons[0].text}.`;
  }
  if (summaryCons.length > 0) {
    return `Avoid when ${summaryCons[0].text}.`;
  }
  if (summaryPros.length > 0) {
    return `Choose when ${summaryPros[0].text}.`;
  }
  return null;
}

function isAuthoritativeClaim(claim: ClaimWithSource): boolean {
  return AUTHORITATIVE_SOURCE_TYPES.has((claim.source_type || '').toLowerCase());
}

function selectSummaryClaims(claims: ClaimWithSource[], limit = 1): ClaimWithSource[] {
  const valid = claims.filter(
    (claim) => Boolean(claim.source_url) && isRenderableClaimText(claim.text)
  );
  if (valid.length === 0) return [];

  const authoritative = valid.filter((claim) => isAuthoritativeClaim(claim));
  const preferred = authoritative.length > 0 ? authoritative : valid;

  const deduped: ClaimWithSource[] = [];
  const seen = new Set<string>();
  for (const claim of preferred) {
    const key = stripTerminalPunctuation(sanitizeNarrativeClaimText(claim.text)).toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    deduped.push(claim);
    if (deduped.length >= limit) break;
  }
  return deduped;
}

function buildDerivedSummary(
  cons: ClaimWithSource[],
  pros: ClaimWithSource[],
  vetos: Array<{ condition: string; alternative: string }> | null
): string | null {
  const summaryCons = selectSummaryClaims(cons);
  const summaryPros = selectSummaryClaims(pros);
  if (summaryCons.length === 0 && summaryPros.length === 0 && (!vetos || vetos.length === 0))
    return null;

  const lines: string[] = [];
  if (summaryPros.length > 0) {
    lines.push('**Choose if**');
    for (const claim of summaryPros.slice(0, 2)) {
      lines.push(`- ${claim.text}`);
    }
  }
  if (summaryCons.length > 0) {
    if (lines.length > 0) lines.push('');
    lines.push('**Avoid if**');
    for (const claim of summaryCons.slice(0, 2)) {
      lines.push(`- ${claim.text}`);
    }
  }
  if (vetos && vetos.length > 0) {
    if (lines.length > 0) lines.push('');
    lines.push('**Pick an alternative when**');
    lines.push(`- Switch to ${vetos[0].alternative} if ${vetos[0].condition}.`);
  }

  return lines.join('\n');
}

function buildDiscoverySummary(
  analysis: any,
  cons: ClaimWithSource[],
  pros: ClaimWithSource[]
): string | null {
  const derived = buildDerivedSummary(cons, pros, null);
  if (derived && derived.trim().length >= 40) return derived;

  const lines: string[] = [];
  const shortDescription =
    typeof analysis?.shortDescription === 'string' ? analysis.shortDescription.trim() : '';
  if (shortDescription.length > 0) {
    lines.push(shortDescription);
  }

  if (pros.length > 0) {
    lines.push(`Best fit: ${pros[0].text}`);
  }

  if (cons.length > 0) {
    lines.push(`Primary caution: ${cons[0].text}`);
  }

  const summary = lines.join('\n\n').trim();
  return summary.length >= 40 ? summary : null;
}

/**
 * Execute the Persistence Phase
 *
 * Saves all data to database with deduplication and graph linking.
 * Skipped if ctx.skipPersistence is true.
 *
 * @param ctx - Hunter context with research and analysis data
 * @param deps - Injected dependencies
 * @returns Persistence output with IDs of created entities
 */
export async function executePersistencePhase(
  ctx: HunterContext,
  deps: HunterDependencies
): Promise<PersistenceOutput> {
  if (!ctx.research) {
    throw new Error('[Phase 3] Cannot persist without research data');
  }

  if (ctx.huntType === 'price_only') {
    return await updatePricingOnly(ctx, deps);
  }

  // Two-stage pipeline: If skipSynthesis is true, store research data only
  if (ctx.skipSynthesis) {
    return await persistResearchOnly(ctx, deps);
  }

  if (!ctx.analysis) {
    throw new Error('[Phase 3] Cannot persist without analysis data');
  }

  deps.log(`[Phase 3: Persistence] Starting for: ${ctx.toolName}`);

  const toolSlug = slugify(ctx.toolName);
  let resolvedCategorySlug: string | null = null;

  // Step 1: Find category (auto-map from taxonomy or use explicit categorySlug)
  let categoryId: string | null = null;
  const analysis = ctx.analysis.analysis;
  const knowledgeCard = ctx.research.knowledgeCard;
  const guardrailSources = ctx.research.scoutResult.raw_sources.map((source) => ({
    url: source.url,
    title: source.title,
    snippet: source.snippet,
  }));

  sanitizeSetupComplexityWithEvidence(knowledgeCard, guardrailSources, analysis.websiteUrl, deps);

  if (ctx.categorySlug) {
    // Legacy: explicit category slug provided
    const { data: cat } = await deps.supabase
      .from('categories')
      .select('id')
      .eq('slug', ctx.categorySlug)
      .single();
    categoryId = cat?.id || null;
    resolvedCategorySlug = cat?.id ? ctx.categorySlug : null;
  } else if (knowledgeCard?.smp_taxonomy?.primary_function) {
    // Auto-map from extracted taxonomy
    const primaryFunction = knowledgeCard.smp_taxonomy.primary_function;
    deps.log(`[Category] Auto-mapping from taxonomy: "${primaryFunction}"`);

    // Map primary_function to category slug
    const funcToCategory: Record<string, string> = {
      'Project Management': 'project-management',
      Communication: 'communication',
      Notetaking: 'notetaking',
      'Note-Taking': 'notetaking',
      'Developer Tools': 'developer-tools',
      'Code Editor': 'developer-tools',
      Development: 'developer-tools',
      Design: 'design',
      CRM: 'crm-sales',
      Collaboration: 'collaboration',
      Productivity: 'productivity',
      'AI & Automation': 'ai-automation',
      'Artificial Intelligence': 'ai-automation',
      AI: 'ai-automation',
      'AI Code Assistant': 'ai-automation',
      'AI Tools': 'ai-automation',
      'AI Audio Platform': 'ai-automation',
      Analytics: 'seo-analytics',
      SEO: 'seo-analytics',
      'SEO Tools': 'seo-analytics',
      'Email Marketing': 'email-marketing',
      'Social Media': 'social-media',
      'Customer Support': 'customer-support',
      HR: 'hr-recruiting',
      'HR & Payroll': 'hr-recruiting',
      Accounting: 'accounting',
      'Accounting Software': 'accounting',
      Finance: 'accounting',
      'Spend Management': 'accounting',
      'Business Banking': 'payments',
      Payments: 'payments',
      'Video Editing': 'video-editing',
      'Practice Management': 'healthcare',
      'Dental Practice Management': 'healthcare',
      Automation: 'ai-automation',
      'Website Builder': 'no-code',
    };

    const categorySlug = funcToCategory[primaryFunction];
    if (categorySlug) {
      const { data: cat } = await deps.supabase
        .from('categories')
        .select('id')
        .eq('slug', categorySlug)
        .eq('type', 'function')
        .maybeSingle();

      if (cat) {
        categoryId = cat.id;
        resolvedCategorySlug = categorySlug;
        deps.log(`[Category] Mapped "${primaryFunction}" → ${categorySlug}`);
      } else {
        deps.log(`[Category] Warning: No category found for slug "${categorySlug}"`);
      }
    } else {
      deps.log(`[Category] Warning: No mapping for "${primaryFunction}"`);
    }
  }

  await enrichComparativeFeatureSignals(knowledgeCard, deps, {
    categoryId,
    toolSlug,
  });

  // Step 2: Upsert Item (with Knowledge Card + V2 fields)

  // Build V2/V3 specs from analysis + Knowledge Card
  const specs: ToolSpecs = {
    pricing_model: analysis.pricingType,
    platforms: analysis.graphTags?.platforms || [],
    integrations: (knowledgeCard?.integrations as any) || [],
  };

  // V3: Add SMP pricing data if extracted
  if (knowledgeCard?.smp_pricing) {
    specs.pricing_data = knowledgeCard.smp_pricing;
    specs.pricing_v2 = mapSmpPricingToV2(toolSlug, knowledgeCard.smp_pricing) ?? undefined;
  }

  // V3: Add SMP taxonomy data if extracted (with normalization)
  if (knowledgeCard?.smp_taxonomy) {
    const rawFunction = knowledgeCard.smp_taxonomy.primary_function;
    const canonicalFunction = normalizeCategory(rawFunction);

    specs.taxonomy = {
      ...knowledgeCard.smp_taxonomy,
      primary_function: canonicalFunction,
    };

    // Preserve original label if normalized (for display purposes)
    if (canonicalFunction !== rawFunction && specs.taxonomy) {
      specs.taxonomy.original_function = rawFunction;
      deps.log(`[Taxonomy] Normalized: "${rawFunction}" → "${canonicalFunction}"`);
    }
  }

  // V3: Add SMP portability data if extracted
  if (knowledgeCard?.smp_portability) {
    specs.portability = knowledgeCard.smp_portability;
  }

  // V4: Add constraints if extracted
  if (knowledgeCard?.constraints) {
    const constraints = knowledgeCard.constraints;

    // Resolve plan_name_match to plan_id
    if (constraints.hard_limits && knowledgeCard.smp_pricing?.plans) {
      const plans = knowledgeCard.smp_pricing.plans;
      const { resolvePlanId } = await import('@/lib/pricing/constraints.js');

      constraints.hard_limits = constraints.hard_limits.map((limit) => {
        const planId = resolvePlanId(limit.plan_name_match, plans);

        // Sanitize source_url or fall back to pricing_page_url
        let sourceUrl = limit.source_url;
        if (!sourceUrl || sourceUrl.includes('undefined')) {
          sourceUrl =
            knowledgeCard.smp_pricing?.pricing_page_url || knowledgeCard.website_url || undefined;
        }

        return {
          ...limit,
          plan_id: planId, // Resolved ID
          source_url: sourceUrl,
        };
      });
    }

    specs.constraints = constraints;
    deps.log(
      `[Persisted] Constraints: ${constraints.hard_limits?.length || 0} limits, ${constraints.hidden_costs?.length || 0} hidden costs`
    );
  }

  // V6: Cynical CTO - Add veto logic and reality checks (with source validation)
  const sources = ctx.research.scoutResult.raw_sources.map((source) => ({
    url: source.url,
    canonical_url: source.canonical_url,
    title: source.title,
    snippet: source.snippet,
    domain: source.domain,
    source_type: source.source_type,
    acquisition_mode: source.policy?.acquisition_mode,
    llm_ingestion_allowed: source.policy?.llm_ingestion_allowed,
    retrieved_at: source.retrieved_at,
    published_at: source.published_at,
  }));
  let vettedVetos: Array<any> | null = null;

  if (analysis.vetoLogic && analysis.vetoLogic.length > 0) {
    const validatedVetos = analysis.vetoLogic.filter((veto: any) => {
      // Validate negative claims in veto reason
      const validation = validateNegativeClaim(
        {
          text: veto.reason,
          source_url: veto.source_url,
          source_type: 'community',
          claim_type: 'opinion',
          retrieved_at: veto.retrieved_at || new Date().toISOString(),
        },
        sources
      );

      if (!validation.isValid) {
        const sourcesInfo =
          validation.corroboratingSources && validation.corroboratingSources.length > 0
            ? ` Sources found: ${validation.corroboratingSources.join(', ')}`
            : '';
        deps.log(
          `[Guardrail] Filtered veto: "${veto.reason.substring(0, 50)}..." - ${validation.warning}${sourcesInfo}`
        );
        return false;
      }
      return true;
    });

    if (validatedVetos.length > 0) {
      vettedVetos = validatedVetos;
      specs.vetoLogic = validatedVetos;
      deps.log(
        `[Persisted] Veto Logic: ${validatedVetos.length}/${analysis.vetoLogic.length} conditions (${analysis.vetoLogic.length - validatedVetos.length} filtered)`
      );
    } else {
      deps.log(
        `[Guardrail] All ${analysis.vetoLogic.length} veto conditions filtered due to insufficient corroboration`
      );
    }
  }

  if (analysis.realityChecks && analysis.realityChecks.length > 0) {
    const validatedChecks = analysis.realityChecks.filter((check: any) => {
      // Validate negative claims in reality field
      const validation = validateNegativeClaim(
        {
          text: check.text || check.reality,
          source_url: check.source_url,
          source_type: 'community',
          claim_type: 'opinion',
          retrieved_at: check.retrieved_at || new Date().toISOString(),
        },
        sources
      );

      if (!validation.isValid) {
        const sourcesInfo =
          validation.corroboratingSources && validation.corroboratingSources.length > 0
            ? ` Sources found: ${validation.corroboratingSources.join(', ')}`
            : '';
        deps.log(
          `[Guardrail] Filtered reality check: "${(check.text || check.reality || '').substring(0, 50)}..." - ${validation.warning}${sourcesInfo}`
        );
        return false;
      }
      return true;
    });

    if (validatedChecks.length > 0) {
      specs.realityChecks = validatedChecks;
      deps.log(
        `[Persisted] Reality Checks: ${validatedChecks.length}/${analysis.realityChecks.length} checks (${analysis.realityChecks.length - validatedChecks.length} filtered)`
      );
    } else {
      deps.log(
        `[Guardrail] All ${analysis.realityChecks.length} reality checks filtered due to insufficient corroboration`
      );
    }
  }

  // V4: Smart Schema - Add category-specific extracted data
  if (analysis.categorySpecificData && Object.keys(analysis.categorySpecificData).length > 0) {
    const sanitizedCategorySpecificData = sanitizeOperationalFields(
      analysis.categorySpecificData,
      'category-specific',
      deps
    );
    if (Object.keys(sanitizedCategorySpecificData).length > 0) {
      specs.categorySpecificData = sanitizedCategorySpecificData;
    }
    deps.log(
      `[Smart Schema] Saved ${Object.keys(sanitizedCategorySpecificData).length} category-specific fields`
    );
  }

  // V4: Tool Hints - Add VIP tool-specific data
  if (analysis.specifics && Object.keys(analysis.specifics).length > 0) {
    const sanitizedSpecifics = sanitizeOperationalFields(analysis.specifics, 'VIP specifics', deps);
    if (Object.keys(sanitizedSpecifics).length > 0) {
      specs.specifics = sanitizedSpecifics;
    }
    deps.log(`[Tool Hints] Saved ${Object.keys(sanitizedSpecifics).length} VIP-specific fields`);
  }

  if (analysis.canonicalFacts) {
    const existingCanonical = (specs.canonical as Record<string, any>) || {};
    const existingQuality = (existingCanonical.quality as Record<string, any>) || {};
    const derivedChecks = deriveBuyerChecklists(analysis);
    const canonical = {
      ...existingCanonical,
      latest_models_comparison:
        analysis.canonicalFacts.latest_models_comparison ||
        existingCanonical.latest_models_comparison ||
        [],
      model_inventory_raw:
        analysis.canonicalFacts.model_inventory_raw || existingCanonical.model_inventory_raw || [],
      quick_checks:
        normalizeChecklistItems(analysis.canonicalFacts.quick_checks, 5).length > 0
          ? normalizeChecklistItems(analysis.canonicalFacts.quick_checks, 5)
          : normalizeChecklistItems(existingCanonical.quick_checks, 5).length > 0
            ? normalizeChecklistItems(existingCanonical.quick_checks, 5)
            : derivedChecks.quickChecks,
      team_it_checks:
        normalizeChecklistItems(analysis.canonicalFacts.team_it_checks, 5).length > 0
          ? normalizeChecklistItems(analysis.canonicalFacts.team_it_checks, 5)
          : normalizeChecklistItems(existingCanonical.team_it_checks, 5).length > 0
            ? normalizeChecklistItems(existingCanonical.team_it_checks, 5)
            : derivedChecks.teamItChecks,
      setup_tracks:
        analysis.canonicalFacts.setup_tracks || existingCanonical.setup_tracks || undefined,
      quality: {
        ...existingQuality,
        ...((analysis.canonicalFacts.quality as Record<string, unknown>) || {}),
      },
    };
    if (
      canonical.latest_models_comparison.length > 0 ||
      canonical.model_inventory_raw.length > 0 ||
      (canonical.quick_checks && canonical.quick_checks.length > 0) ||
      (canonical.team_it_checks && canonical.team_it_checks.length > 0) ||
      (canonical.setup_tracks?.dev && canonical.setup_tracks.dev.length > 0) ||
      (canonical.setup_tracks?.non_dev && canonical.setup_tracks.non_dev.length > 0) ||
      (canonical.quality && Object.keys(canonical.quality).length > 0)
    ) {
      specs.canonical = canonical;
      deps.log(
        `[Canonical] Saved models split: latest=${canonical.latest_models_comparison.length}, raw=${canonical.model_inventory_raw.length}`
      );
    }
  }

  if (knowledgeCard?.smp_pricing) {
    const pricingCanonical = buildCanonicalPricingPlans(knowledgeCard.smp_pricing);
    const currentCanonical = (specs.canonical as Record<string, any>) || {};
    const currentQuality = (currentCanonical.quality as Record<string, any>) || {};
    const nextPricingConflictCount = pricingCanonical.conflicts.length;
    const existingConflictCount = Number(currentQuality.conflicts_count || 0);
    const priorPricingConflictCount = Number(currentQuality.pricing_conflicts_count || 0);
    const nextConflictCount =
      existingConflictCount - priorPricingConflictCount + nextPricingConflictCount;

    specs.canonical = {
      ...currentCanonical,
      pricing_plan_entities: pricingCanonical.entities,
      quality: {
        ...currentQuality,
        conflicts_count: Math.max(0, nextConflictCount),
        pricing_conflicts_count: nextPricingConflictCount,
        pricing_conflicts: pricingCanonical.conflicts,
      },
    };

    if (nextPricingConflictCount > 0) {
      deps.log(
        `[Pricing Guard] Detected ${nextPricingConflictCount} pricing contradiction(s); pricing sections will be suppressed`
      );
    }
  }

  // V4: Add pros/cons to item (not just contextual reviews)
  // This ensures every tool has pros/cons regardless of context
  const sourcesList = ctx.research.scoutResult.raw_sources.map((source) => ({
    url: source.url,
    canonical_url: source.canonical_url,
    title: source.title,
    snippet: source.snippet,
    domain: source.domain,
    source_type: source.source_type,
    acquisition_mode: source.policy?.acquisition_mode,
    llm_ingestion_allowed: source.policy?.llm_ingestion_allowed,
    retrieved_at: source.retrieved_at,
    published_at: source.published_at,
  }));
  let normalizedPros: ClaimWithSource[] = [];
  let validCons: ClaimWithSource[] = [];
  let filteredForMissingSource = 0;
  let filteredForMalformedText = 0;

  if (analysis.pros?.length || analysis.cons?.length) {
    // Normalize pros with source attribution
    const normalizedProsRaw = (analysis.pros || []).map((claim: string | ClaimWithSource) =>
      normalizeClaim(claim, sourcesList, analysis.websiteUrl)
    );

    // Normalize cons with source attribution and guardrail
    const rawNormalizedCons = (analysis.cons || []).map((claim: string | ClaimWithSource) =>
      normalizeClaim(claim, sourcesList, analysis.websiteUrl)
    );

    const normalizedProsFiltered = (normalizedProsRaw.filter(Boolean) as ClaimWithSource[]).filter(
      (claim) => {
        const keep = isRenderableClaimText(claim.text);
        if (!keep) {
          filteredForMalformedText += 1;
          deps.log(`[Guardrail] Filtered malformed pro claim: "${claim.text.substring(0, 60)}..."`);
        }
        return keep;
      }
    );
    filteredForMissingSource += normalizedProsRaw.length - normalizedProsFiltered.length;
    normalizedPros = normalizedProsFiltered;

    const normalizedConsCandidates = (
      rawNormalizedCons.filter(Boolean) as ClaimWithSource[]
    ).filter((claim) => {
      const keep = isRenderableClaimText(claim.text);
      if (!keep) {
        filteredForMalformedText += 1;
        deps.log(`[Guardrail] Filtered malformed con claim: "${claim.text.substring(0, 60)}..."`);
      }
      return keep;
    });
    filteredForMissingSource += rawNormalizedCons.length - normalizedConsCandidates.length;

    // Apply negative sentiment guardrail to cons
    for (const con of normalizedConsCandidates) {
      if (isIntegrationGapClaim(con.text) && !isIntegrationCriticalContext(ctx.contextTitle)) {
        deps.log(
          `[Item Guardrail] Filtered: "${con.text.substring(0, 40)}..." - not material for context`
        );
        continue;
      }
      const validation = validateNegativeClaim(con, sourcesList);
      if (validation.isValid) {
        validCons.push(con);
      } else {
        deps.log(
          `[Item Guardrail] Filtered: "${con.text.substring(0, 40)}..." - insufficient sources`
        );
      }
    }

    specs.pros = normalizedPros;
    specs.cons = validCons;
    deps.log(`[Item Content] Saved ${normalizedPros.length} pros, ${validCons.length} cons`);
    if (filteredForMissingSource > 0) {
      deps.log(
        `[Guardrail] Filtered ${filteredForMissingSource} claim(s) missing a verifiable source URL`
      );
    }
    if (filteredForMalformedText > 0) {
      deps.log(`[Guardrail] Filtered ${filteredForMalformedText} malformed/truncated claim(s)`);
    }
    if (normalizedPros.length === 0) {
      deps.log('[Guardrail] No valid pros after source validation');
    }
    if (validCons.length === 0) {
      deps.log('[Guardrail] No valid cons after source validation');
    }
  }

  if (validCons.length === 0 || validCons.length < 3) {
    const derivedCons = buildDerivedConsFromConstraints(
      knowledgeCard,
      analysis.websiteUrl,
      sourcesList
    );
    const vettedDerived = derivedCons.filter(
      (con) => validateNegativeClaim(con, sourcesList).isValid
    );
    if (vettedDerived.length > 0) {
      const existing = new Set(
        validCons.map((con) =>
          stripTerminalPunctuation(sanitizeNarrativeClaimText(con.text) || con.text).toLowerCase()
        )
      );
      const uniqueDerived = vettedDerived.filter((con) => {
        const key = stripTerminalPunctuation(sanitizeNarrativeClaimText(con.text) || con.text).toLowerCase();
        return key.length > 0 && !existing.has(key);
      });
      const cap = Math.max(0, 3 - validCons.length);
      const prioritized = [...uniqueDerived].sort((a, b) => {
        const aPricing = isPricingBiasedDerivedCon(a.text) ? 1 : 0;
        const bPricing = isPricingBiasedDerivedCon(b.text) ? 1 : 0;
        return aPricing - bPricing;
      });
      const additions = prioritized.slice(0, cap);
      validCons = [...validCons, ...additions];
      if (normalizedPros.length > 0) {
        specs.pros = normalizedPros;
      }
      specs.cons = validCons;
      const additionsNonPricingCount = additions.filter(
        (claim) => !isPricingBiasedDerivedCon(claim.text)
      ).length;
      deps.log(
        `[Guardrail] Added ${additions.length} derived cons (from ${vettedDerived.length} vetted candidates)`
      );
      if (additions.length > 0 && additionsNonPricingCount === 0) {
        deps.log(
          '[Guardrail] Derived fallback remained pricing-only (no vetted non-pricing negatives found).'
        );
      }
    } else if (derivedCons.length > 0) {
      deps.log('[Guardrail] Derived cons were filtered due to insufficient corroboration');
    }
  }

  // Prefer curated FAQs from analysis if present
  if (analysis.faqs && analysis.faqs.length > 0) {
    const inferFaqSource = (url?: string): 'paa' | 'forum' | 'reddit' | null => {
      if (!url) return null;
      const lower = url.toLowerCase();
      if (lower.includes('reddit.com')) return 'reddit';
      if (lower.includes('forum') || lower.includes('community') || lower.includes('discourse'))
        return 'forum';
      return 'paa';
    };
    const mappedFaqs = analysis.faqs
      .filter((faq) => !!faq.answer_source_url)
      .map((faq) => ({
        question: faq.question,
        answer: faq.answer,
        question_source: faq.question_source || inferFaqSource(faq.question_source_url),
        question_source_url: faq.question_source_url,
        answer_source_url: faq.answer_source_url,
        answer_source_type:
          faq.answer_source_type || classifySourceType(faq.answer_source_url, analysis.websiteUrl),
      }))
      .filter((faq) => faq.question_source && faq.answer_source_url);
    const canonicalModels = analysis.canonicalFacts?.latest_models_comparison || [];
    const faqGuard = guardFaqVolatileFacts(mappedFaqs, canonicalModels);
    knowledgeCard.faqs = faqGuard.accepted;
    specs.canonical = {
      ...(specs.canonical || {}),
      quality: {
        ...((specs.canonical as any)?.quality || {}),
        conflicts_count: faqGuard.conflictsCount,
      },
    };
    if (faqGuard.dropped.length > 0) {
      deps.log(`[FAQ Guard] Dropped ${faqGuard.dropped.length} volatile FAQ(s) in persistence`);
    }
    if (faqGuard.conflictsCount > 0) {
      deps.log(`[FAQ Guard] Canonical conflicts detected: ${faqGuard.conflictsCount}`);
    }
  }

  const { data: existingItemForMetadata } = await deps.supabase
    .from('items')
    .select('metadata')
    .eq('slug', toolSlug)
    .maybeSingle();
  const existingMetadata =
    existingItemForMetadata?.metadata && typeof existingItemForMetadata.metadata === 'object'
      ? (existingItemForMetadata.metadata as Record<string, unknown>)
      : null;

  // Build V2 metadata (Knowledge Card + extended fields)
  const metadata: Record<string, unknown> = {
    ...(existingMetadata || {}),
    ...knowledgeCard,
    // Space for company info and competitors to be added later
  };
  if (existingMetadata && typeof existingMetadata.popularity_tier === 'string') {
    metadata.popularity_tier = existingMetadata.popularity_tier;
  }
  const popularityTier = resolvePopularityTier(metadata);

  // Calculate data_confidence from Knowledge Card's data_quality
  // high=0.9, medium=0.7, low=0.5
  const dataConfidenceMap: Record<string, number> = {
    high: 0.9,
    medium: 0.7,
    low: 0.5,
  };
  const dataConfidence = dataConfidenceMap[knowledgeCard?.meta?.data_quality || 'low'] || 0.5;

  // Step 2.5: Handle suite bundling (parent/child relationship)
  let parentId: string | null = null;
  const bundledIn = knowledgeCard?.smp_pricing?.bundled_in;

  if (bundledIn) {
    deps.log(`[Suite] Tool is bundled in: ${bundledIn}`);
    try {
      parentId = await ensureParentSuite(deps.supabase, bundledIn);
      deps.log(`[Suite] Linked to parent suite (ID: ${parentId})`);
    } catch (error) {
      deps.log(`[Suite] Warning: Failed to link to parent suite: ${error}`);
      // Continue without parent link - non-fatal error
    }
  }

  const derivedVerdict = buildDerivedVerdict(validCons, normalizedPros, vettedVetos);
  if (!derivedVerdict) {
    deps.log('[Guardrail] Derived verdict unavailable (insufficient vetted claims)');
  }
  const sanitizedReviewContext = sanitizeReviewContext(analysis.reviewContext, validCons, deps);

  const itemData: Record<string, unknown> = {
    name: ctx.toolName,
    slug: toolSlug,
    website: analysis.websiteUrl || null,
    logo_path: ctx.analysis.logo?.path || null,
    logo_url: ctx.analysis.logo?.url || null,
    short_description: sanitizeShortDescription(analysis.shortDescription, ctx.contextTitle),
    pricing_type: analysis.pricingType,
    // V2: Enhanced fields
    metadata,
    specs,
    verdict: derivedVerdict || null, // Derived from vetted claims for legal safety
    // Video data from research
    video_id: ctx.research.video?.videoId || null,
    video_title: ctx.research.video?.title || null,
    // Migration 022: New fields
    data_confidence: dataConfidence,
    learning_curve: knowledgeCard?.learning_curve || null,
    // Migration 025: SMP pricing verification
    pricing_verified_at: knowledgeCard?.smp_pricing ? new Date().toISOString() : null,
    pricing_confidence: knowledgeCard?.smp_pricing?.confidence || null,
    // V3.1: Review Context (The "Human Touch" Layer)
    review_context: sanitizedReviewContext,
    // V3.2: Parent/Child Relationship (Suite Bundling)
    parent_id: parentId,
    // Infer target_market from pricing plans
    target_market: inferTargetMarket(knowledgeCard?.smp_pricing?.plans || []),
  };
  if (Array.isArray(ctx.analysis.embedding) && ctx.analysis.embedding.length > 0) {
    itemData.embedding = ctx.analysis.embedding;
  }

  const { data: item, error: itemError } = await deps.supabase
    .from('items')
    .upsert(itemData, { onConflict: 'slug' })
    .select('id')
    .single();

  if (itemError) throw new Error(`Failed to save item: ${itemError.message}`);

  deps.log(`Item saved: ${ctx.toolName} (id: ${item.id})`);

  try {
    const factPack = await persistItemFactPack({
      supabase: deps.supabase,
      itemId: item.id,
      itemName: ctx.toolName,
      itemSlug: toolSlug,
      categorySlug: resolvedCategorySlug || ctx.detectedCategory || null,
      knowledgeCard,
      analysis,
      specs: specs as Record<string, unknown>,
      rawSources: ctx.research.scoutResult.raw_sources,
    });
    deps.log(
      `[Fact Pack] Upserted ${factPack.schemaId} v${factPack.version} (coverage=${factPack.coverageRatio.toFixed(2)}, required=${factPack.requiredCoverageRatio.toFixed(2)}, conflicts=${factPack.conflictsCount})`
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    deps.log(`[Fact Pack] Warning: ${message}`);
  }

  if (categoryId) {
    const { error: linkError } = await deps.supabase.from('item_category_links').upsert(
      {
        item_id: item.id,
        category_id: categoryId,
        relevance_score: 1,
      },
      { onConflict: 'item_id,category_id' }
    );

    if (linkError) {
      throw new Error(`Failed to link item to category: ${linkError.message}`);
    }
  }

  // Update normalized pricing columns (for apples-to-apples comparison)
  const pricingResult = await updateNormalizedPricing(deps.supabase, item.id, specs);
  if (pricingResult.success) {
    deps.log(`✓ Normalized pricing computed`);
  } else {
    deps.log(`⚠️  Failed to compute normalized pricing: ${pricingResult.error}`);
  }

  // Log persisted SMP data for QA
  if (specs.pricing_data) {
    const pd = specs.pricing_data as unknown as Record<string, unknown>;
    deps.log(
      `[Persisted] SMP Pricing: model=${pd.model}, confidence=${pd.confidence}, plans=${(pd.plans as unknown[])?.length || 0}`
    );
  }
  if (specs.taxonomy) {
    deps.log(`[Persisted] SMP Taxonomy: saved`);
  }
  if (specs.portability) {
    deps.log(`[Persisted] SMP Portability: saved`);
  }
  if (specs.categorySpecificData) {
    const fields = Object.keys(specs.categorySpecificData as Record<string, unknown>);
    deps.log(
      `[Persisted] Category Data: ${fields.slice(0, 5).join(', ')}${fields.length > 5 ? '...' : ''}`
    );
  }
  if (specs.specifics) {
    const fields = Object.keys(specs.specifics as Record<string, unknown>);
    deps.log(`[Persisted] VIP Specifics: ${fields.join(', ')}`);
  }

  // Log persisted Review Context (V3.1: Human Touch Layer)
  if (sanitizedReviewContext) {
    const rc = sanitizedReviewContext;
    if (rc.humanVerdict) {
      deps.log(`[Persisted] Human Verdict: "${rc.humanVerdict}"`);
    }
    if (rc.budgetAnalyst) {
      const ba = rc.budgetAnalyst;
      deps.log(
        `[Persisted] Budget Analyst: ${ba.costDrivers.length} cost drivers, ${ba.oneTimeFees.length} one-time fees`
      );
    }
    if (rc.userAdvocate) {
      const ua = rc.userAdvocate;
      deps.log(
        `[Persisted] User Advocate: vibe="${ua.vibe || 'none'}", ${ua.idealFor.length} ideal-for, ${ua.avoidIf.length} avoid-if`
      );
      if (ua.powerTip) {
        deps.log(`[Persisted] Power Tip: "${ua.powerTip}"`);
      }
    }
  }

  // Step 3: Create Knowledge Graph links
  await createGraphLinks(item.id, ctx.analysis.analysis.graphTags, deps);

  // Step 4: Create default affiliate offer
  if (analysis.websiteUrl) {
    const offerData: Record<string, unknown> = {
      item_id: item.id,
      url: analysis.websiteUrl,
      cta_text: 'Visit Website',
      is_affiliate: false,
      is_primary: true,
    };

    await deps.supabase.from('affiliate_offers').upsert(offerData, {
      onConflict: 'item_id,is_primary',
      ignoreDuplicates: true,
    });
  }

  // Step 5: If no context, create a general/discovery review
  if (!ctx.contextTitle) {
    deps.log('[Discovery Hunt] Creating general review (no context)');

    // Extract claim-cited sources from pros/cons
    const allClaims = [...normalizedPros, ...validCons];
    const claimSources = allClaims
      .filter((claim) => claim.source_url)
      .map((claim) => ({
        url: claim.source_url,
        domain: (() => {
          if (!claim.source_url) return null;
          try {
            return new URL(claim.source_url).hostname.replace(/^www\./, '');
          } catch {
            return null;
          }
        })(),
        type: claim.source_type,
        source_type: claim.source_type,
      }));

    // Merge with authoritative scout evidence so discovery reviews don't collapse to sparse sources.
    const scoutEvidenceSources = sources
      .filter(
        (source) =>
          AUTHORITATIVE_SOURCE_TYPES.has((source.source_type || '').toLowerCase()) &&
          source.llm_ingestion_allowed !== 'NO'
      )
      .sort((a, b) => {
        const score = (entry: (typeof sources)[number]): number => {
          const url = (entry.url || '').toLowerCase();
          const type = (entry.source_type || '').toLowerCase();
          const typeWeight =
            type === 'official' ? 4 : type === 'docs' ? 3 : type === 'support' ? 2 : 1;
          const pathWeight = /(pricing|plans?|docs?|help|support|quickstart|get-started|onboarding|setup|api|developers?|legal|security|trust)/.test(
            url
          )
            ? 2
            : 0;
          return typeWeight + pathWeight;
        };
        return score(b) - score(a);
      })
      .slice(0, 12)
      .map((source) => ({
        url: source.url,
        domain: source.domain || null,
        type: source.source_type || null,
        source_type: source.source_type || null,
      }));

    // Deduplicate merged source pool by URL
    const uniqueSources = Array.from(
      new Map([...claimSources, ...scoutEvidenceSources].map((entry) => [entry.url, entry])).values()
    );

    // Auto-publish if high quality and robust sources
    const dataQuality = knowledgeCard?.meta?.data_quality || 'medium';
    const canonicalConflicts = Number((specs.canonical as any)?.quality?.conflicts_count || 0);
    const discoveryScore = Number(ctx.analysis.analysis?.score || 0);
    const profile = POPULARITY_PROFILES[popularityTier];
    const officialEvidenceSources = uniqueSources.filter(
      (source) => (source.source_type || source.type) === 'official'
    );
    const officialEvidenceDomains = new Set(
      officialEvidenceSources
        .map((source) => source.domain?.replace(/^www\./i, '').toLowerCase())
        .filter((domain): domain is string => Boolean(domain))
    );
    const qualifiesDiscoveryFastPath =
      profile.allowedDataQualities.includes(dataQuality as 'high' | 'medium' | 'low') &&
      discoveryScore >= profile.minScore &&
      meetsAuthoritativeSourceThreshold(
        popularityTier,
        officialEvidenceSources.length,
        profile.minDiscoveryOfficialSources,
        discoveryScore
      ) &&
      meetsAuthoritativeDomainThreshold(
        popularityTier,
        officialEvidenceDomains.size,
        profile.minDiscoveryOfficialDomains,
        officialEvidenceSources.length,
        discoveryScore
      ) &&
      canonicalConflicts === 0;
    const shouldAutoPublish =
      deps.config.isDraftMode === false &&
      ((dataQuality === 'high' && uniqueSources.length >= 2 && canonicalConflicts === 0) ||
        qualifiesDiscoveryFastPath);
    const reviewStatus = shouldAutoPublish ? 'published' : 'draft';

    deps.log(
      `[Discovery Review] Tier: ${popularityTier}, Quality: ${dataQuality}, Score: ${discoveryScore}, Sources: ${uniqueSources.length}, Official Sources: ${officialEvidenceSources.length}, Conflicts: ${canonicalConflicts}, Status: ${reviewStatus}`
    );

    // Upsert-like behavior for discovery review (context_id is null, so onConflict is unreliable).
    const { data: existingDiscoveryReview } = await deps.supabase
      .from('reviews')
      .select('id')
      .eq('item_id', item.id)
      .is('context_id', null)
      .maybeSingle();

    const reviewPayload = {
      item_id: item.id,
      context_id: null,
      score: ctx.analysis.analysis?.score || null,
      summary_markdown: buildDiscoverySummary(ctx.analysis.analysis, validCons, normalizedPros),
      pros: normalizedPros,
      cons: validCons,
      sources: uniqueSources,
      quality: dataQuality,
      status: reviewStatus,
    };

    const reviewQuery = existingDiscoveryReview
      ? deps.supabase
          .from('reviews')
          .update(reviewPayload)
          .eq('id', existingDiscoveryReview.id)
          .select('id')
          .single()
      : deps.supabase.from('reviews').insert(reviewPayload).select('id').single();

    const { data: review, error: reviewError } = await reviewQuery;

    if (reviewError) {
      deps.log(`[Discovery Review] Warning: Failed to create review: ${reviewError.message}`);
    } else {
      deps.log(
        `[Discovery Review] ${existingDiscoveryReview ? 'Updated' : 'Created'}: ${review.id} (${reviewStatus})`
      );
      await persistQualityGateSnapshot(item.id, review.id, deps);
    }

    await persistArticleInsights({
      deps,
      itemId: item.id,
      contextId: null,
      analysis,
      derivedVerdict,
      sanitizedReviewContext,
    });

    const suggestedContexts = await suggestContextIdeas(ctx, analysis, deps);
    if (suggestedContexts.length > 0) {
      deps.log(
        `[Discovery Hunt] Suggested ${suggestedContexts.length} context ideas for gatekeeper`
      );
    }

    deps.log('[Phase 3] Complete - Discovery review created');
    return {
      toolId: item.id,
      contextId: null,
      reviewId: review?.id || null,
      wasReused: false,
    };
  }

  // Step 6: Check for similar context (deduplication)
  const similarContext = await findSimilarContext(ctx.contextTitle, deps);
  let contextId: string;
  let wasReused = false;

  if (similarContext) {
    deps.log(`Reusing existing context: "${similarContext.title}"`);
    contextId = similarContext.id;
    wasReused = true;
  } else {
    // Create new context
    contextId = await createNewContext(ctx.contextTitle, ctx.analysis.analysis, categoryId, deps);
    deps.log(`Created new context: ${ctx.contextTitle} (id: ${contextId})`);
  }

  // Step 7: Create Review (links item to context)
  const reviewId = await createReview(
    item.id,
    contextId,
    ctx.analysis.analysis,
    ctx.research.scoutResult.raw_sources.map((source) => ({
      url: source.url,
      canonical_url: source.canonical_url,
      title: source.title,
      snippet: source.snippet,
      domain: source.domain,
      source_type: source.source_type,
      acquisition_mode: source.policy?.acquisition_mode,
      llm_ingestion_allowed: source.policy?.llm_ingestion_allowed,
      is_deep_scrape_allowed:
        source.policy?.acquisition_mode === 'SCRAPE_ALLOWED' &&
        source.policy?.llm_ingestion_allowed !== 'NO',
      block_reason: source.policy?.reason,
      retrieved_at: source.retrieved_at,
      published_at: source.published_at,
    })),
    ctx.research.knowledgeCard,
    Number((specs.canonical as any)?.quality?.conflicts_count || 0),
    ctx.contextTitle,
    popularityTier,
    deps
  );

  deps.log(`Review created: ${reviewId}`);
  await persistQualityGateSnapshot(item.id, reviewId, deps);
  await persistArticleInsights({
    deps,
    itemId: item.id,
    contextId,
    analysis,
    derivedVerdict,
    sanitizedReviewContext,
  });
  deps.log(`[Phase 3] Complete`);

  return {
    toolId: item.id, // Keep as toolId for backward compat in return type
    contextId,
    reviewId,
    wasReused,
  };
}

async function persistQualityGateSnapshot(
  itemId: string,
  reviewId: string | null,
  deps: HunterDependencies
): Promise<void> {
  const { data: itemRow, error: itemError } = await deps.supabase
    .from('items')
    .select('id, metadata, specs, pricing_verified_at')
    .eq('id', itemId)
    .single();

  if (itemError || !itemRow) {
    deps.log(
      `[Quality Gate] Warning: Unable to load item for snapshot (${itemError?.message || 'missing'})`
    );
    return;
  }

  const reviewQuery = deps.supabase
    .from('reviews')
    .select('id, status, summary_markdown, pros, cons, sources, created_at, updated_at')
    .eq('item_id', itemId)
    .order('updated_at', { ascending: false })
    .limit(1);

  const { data: reviewRows, error: reviewError } = reviewId
    ? await reviewQuery.eq('id', reviewId)
    : await reviewQuery;

  if (reviewError) {
    deps.log(`[Quality Gate] Warning: Unable to load review for snapshot (${reviewError.message})`);
    return;
  }

  const gateReview = (reviewRows && reviewRows.length > 0 ? reviewRows[0] : null) as any;
  const readiness = evaluateIndexReadiness(itemRow as any, gateReview);
  const isDraftReview = gateReview?.status !== 'published';
  const shouldIndex = readiness.shouldIndex && !isDraftReview;
  const noindexReasons = [...readiness.reasons];

  if (isDraftReview) {
    noindexReasons.push('draft_review');
  }

  const specs = (itemRow.specs as Record<string, unknown>) || {};
  const canonical = (specs.canonical as Record<string, unknown>) || {};
  const quality = {
    ...((canonical.quality as Record<string, unknown>) || {}),
    should_index: shouldIndex,
    noindex_reasons: noindexReasons,
    required_sections_complete: readiness.signals.required_sections_complete,
    volatiles_fresh: readiness.signals.volatiles_fresh,
    conflicts_count: readiness.signals.conflicts_count,
    score: readiness.signals.score,
    section_publishability: readiness.signals.section_publishability,
    section_status: readiness.signals.section_status,
    evidence_counts: readiness.signals.evidence_counts,
    last_evaluated_at: new Date().toISOString(),
  };

  const mergedSpecs = {
    ...specs,
    canonical: {
      ...canonical,
      quality,
    },
  };

  const { error: updateError } = await deps.supabase
    .from('items')
    .update({ specs: mergedSpecs })
    .eq('id', itemId);

  if (updateError) {
    deps.log(`[Quality Gate] Warning: Failed to persist snapshot (${updateError.message})`);
    return;
  }

  deps.log(
    `[Quality Gate] Snapshot persisted: should_index=${String(shouldIndex)} reasons=${noindexReasons.join(',') || 'none'}`
  );
}

async function persistArticleInsights({
  deps,
  itemId,
  contextId,
  analysis,
  derivedVerdict,
  sanitizedReviewContext,
}: {
  deps: HunterDependencies;
  itemId: string;
  contextId: string | null;
  analysis: any;
  derivedVerdict?: string | null;
  sanitizedReviewContext?: any | null;
}): Promise<void> {
  if (!analysis) return;

  const insights: Array<Record<string, unknown>> = [];

  if (derivedVerdict || analysis.verdict) {
    insights.push({
      insight_type: 'verdict',
      insight: derivedVerdict || analysis.verdict,
    });
  }

  const humanVerdict = sanitizedReviewContext?.humanVerdict ?? analysis.reviewContext?.humanVerdict;
  if (humanVerdict) {
    insights.push({
      insight_type: 'human_verdict',
      insight: humanVerdict,
    });
  }

  if (Array.isArray(analysis.vetoLogic)) {
    for (const veto of analysis.vetoLogic) {
      if (!veto?.condition || !veto?.alternative || !veto?.reason) continue;
      insights.push({
        insight_type: 'veto',
        insight: `Switch to ${veto.alternative} if ${veto.condition}. ${veto.reason}`,
        source_url: veto.source_url || null,
      });
    }
  }

  if (Array.isArray(analysis.realityChecks)) {
    for (const check of analysis.realityChecks) {
      if (!check?.claim || !check?.reality) continue;
      const impact = check.impact ? ` Impact: ${check.impact}` : '';
      insights.push({
        insight_type: 'reality_check',
        insight: `Claim: ${check.claim}. Reality: ${check.reality}.${impact}`,
        source_url: check.source_url || null,
      });
    }
  }

  if (Array.isArray(analysis.dealbreakers)) {
    for (const dealbreaker of analysis.dealbreakers) {
      if (!dealbreaker) continue;
      insights.push({
        insight_type: 'dealbreaker',
        insight: dealbreaker,
      });
    }
  }

  if (Array.isArray(analysis.standoutFeatures)) {
    for (const feature of analysis.standoutFeatures) {
      if (!feature) continue;
      insights.push({
        insight_type: 'standout_feature',
        insight: feature,
      });
    }
  }

  if (insights.length === 0) return;

  const payload = insights.map((insight) => ({
    item_id: itemId,
    context_id: contextId,
    tags: [],
    ...insight,
  }));

  const { error } = await deps.supabase.from('article_insights').insert(payload);
  if (error) {
    deps.log(`[Insights] Warning: Failed to store article insights: ${error.message}`);
  } else {
    deps.log(`[Insights] Stored ${payload.length} article insights`);
  }
}

function toTitleCase(value: string): string {
  return value
    .split(/\s+/)
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ');
}

function normalizeContextSlug(contextTitle: string): string {
  let slug = slugify(contextTitle);
  if (slug.startsWith('best-')) {
    slug = slug.replace(/^best-/, '');
  }
  return slug;
}

function buildContextCandidates(analysis: any): string[] {
  const rawNoun =
    typeof analysis?.titleParts?.noun === 'string' ? analysis.titleParts.noun.trim() : '';
  const functionTag = analysis?.graphTags?.functions?.[0];

  let noun = rawNoun;
  if (!noun && typeof functionTag === 'string' && functionTag.trim()) {
    noun = toTitleCase(functionTag.trim());
    if (!/(apps|software|tools|platforms|systems|suites)$/i.test(noun)) {
      noun = `${noun} Tools`;
    }
  }

  if (!noun) return [];

  const contexts = new Set<string>();
  contexts.add(`Best ${noun}`);

  const audiences = Array.isArray(analysis?.graphTags?.audiences)
    ? analysis.graphTags.audiences.filter((aud: string) => typeof aud === 'string' && aud.trim())
    : [];

  for (const audience of audiences.slice(0, 2)) {
    contexts.add(`Best ${noun} for ${toTitleCase(audience.trim())}`);
  }

  return Array.from(contexts).slice(0, 3);
}

async function suggestContextIdeas(
  ctx: HunterContext,
  analysis: any,
  deps: HunterDependencies
): Promise<string[]> {
  const candidates = buildContextCandidates(analysis);
  if (candidates.length === 0) return [];

  const candidateSlugs = candidates.map(normalizeContextSlug);

  const { data: existingContexts } = await deps.supabase
    .from('contexts')
    .select('slug')
    .in('slug', candidateSlugs)
    .limit(candidateSlugs.length);

  const existingContextSlugs = new Set((existingContexts || []).map((c: any) => c.slug));
  const remainingCandidates = candidates.filter(
    (candidate, index) => !existingContextSlugs.has(candidateSlugs[index])
  );

  if (remainingCandidates.length === 0) return [];

  const { data: ideasByContext } = await deps.supabase
    .from('content_ideas')
    .select('context_query')
    .in('context_query', remainingCandidates)
    .limit(remainingCandidates.length);

  const { data: ideasByKeyword } = await deps.supabase
    .from('content_ideas')
    .select('keyword')
    .in('keyword', remainingCandidates)
    .limit(remainingCandidates.length);

  const existingIdeaSet = new Set<string>([
    ...(ideasByContext || []).map((idea: any) => idea.context_query).filter(Boolean),
    ...(ideasByKeyword || []).map((idea: any) => idea.keyword).filter(Boolean),
  ]);

  const insertable = remainingCandidates.filter((candidate) => !existingIdeaSet.has(candidate));
  if (insertable.length === 0) return [];

  const { error: insertError } = await deps.supabase.from('content_ideas').insert(
    insertable.map((candidate) => ({
      keyword: candidate,
      tool_name: ctx.toolName,
      context_query: candidate,
      source: 'suggestion',
      notes: `Auto-suggested from discovery hunt (${ctx.toolName})`,
    }))
  );

  if (insertError) {
    deps.log(`[Discovery Hunt] Warning: Failed to insert context ideas: ${insertError.message}`);
    return [];
  }

  return insertable;
}

async function updatePricingOnly(
  ctx: HunterContext,
  deps: HunterDependencies
): Promise<PersistenceOutput> {
  deps.log(`[Phase 3: Persistence] price_only update for: ${ctx.toolName}`);

  const toolSlug = slugify(ctx.toolName);
  const knowledgeCard = ctx.research!.knowledgeCard;

  const { data: existingBySlug } = await deps.supabase
    .from('items')
    .select('id, specs, name, slug')
    .eq('slug', toolSlug)
    .maybeSingle();

  let itemId = existingBySlug?.id as string | undefined;
  let specs = (existingBySlug?.specs as Record<string, unknown>) || {};
  let factPackName = (existingBySlug?.name as string | undefined) || ctx.toolName;
  let factPackSlug = (existingBySlug?.slug as string | undefined) || toolSlug;

  if (!itemId) {
    const { data: existingByName } = await deps.supabase
      .from('items')
      .select('id, specs, name, slug')
      .ilike('name', ctx.toolName)
      .limit(1)
      .maybeSingle();

    itemId = existingByName?.id as string | undefined;
    specs = (existingByName?.specs as Record<string, unknown>) || specs;
    factPackName = (existingByName?.name as string | undefined) || factPackName;
    factPackSlug = (existingByName?.slug as string | undefined) || factPackSlug;
  }

  if (!itemId) {
    throw new Error(`[price_only] No existing item found for ${ctx.toolName}`);
  }

  if (knowledgeCard?.smp_pricing) {
    const mappedPricingV2 = mapSmpPricingToV2(toolSlug, knowledgeCard.smp_pricing);
    specs = mergeDefined(specs, {
      pricing_data: knowledgeCard.smp_pricing,
      pricing_v2: mappedPricingV2,
    });
  }

  let parentId: string | null = null;
  const bundledIn = knowledgeCard?.smp_pricing?.bundled_in;
  if (bundledIn) {
    try {
      parentId = await ensureParentSuite(deps.supabase, bundledIn);
      deps.log(`[Suite] Linked to parent suite (ID: ${parentId})`);
    } catch (error) {
      deps.log(`[Suite] Warning: Failed to link to parent suite: ${error}`);
    }
  }

  const { data: updated, error } = await deps.supabase
    .from('items')
    .update({
      specs,
      pricing_verified_at: knowledgeCard?.smp_pricing ? new Date().toISOString() : null,
      pricing_confidence: knowledgeCard?.smp_pricing?.confidence || null,
      parent_id: parentId,
    })
    .eq('id', itemId)
    .select('id')
    .single();

  if (error) throw new Error(`Failed to update pricing: ${error.message}`);

  deps.log(`[price_only] Pricing updated for item ${updated.id}`);

  try {
    const factPack = await persistItemFactPack({
      supabase: deps.supabase,
      itemId: updated.id,
      itemName: factPackName,
      itemSlug: factPackSlug,
      categorySlug: ctx.detectedCategory || ctx.categorySlug || null,
      knowledgeCard,
      analysis: null,
      specs,
      rawSources: ctx.research!.scoutResult.raw_sources,
    });
    deps.log(
      `[Fact Pack] Upserted ${factPack.schemaId} v${factPack.version} after price_only refresh`
    );
  } catch (factPackError) {
    const message = factPackError instanceof Error ? factPackError.message : String(factPackError);
    deps.log(`[Fact Pack] Warning (price_only): ${message}`);
  }

  return {
    toolId: updated.id,
    contextId: null,
    reviewId: null,
    wasReused: true,
  };
}

/**
 * Persist research data only (two-stage pipeline batch mode)
 *
 * Stores research data in the item's specs and updates queue status to 'research_complete'.
 * Used when skipSynthesis is true - synthesis will happen later in batch.
 */
async function persistResearchOnly(
  ctx: HunterContext,
  deps: HunterDependencies
): Promise<PersistenceOutput> {
  deps.log(`[Phase 3: Persistence] Research-only mode for: ${ctx.toolName}`);

  if (!ctx.research) {
    throw new Error('[Phase 3] Cannot persist without research data');
  }

  const toolSlug = slugify(ctx.toolName);
  const knowledgeCard = ctx.research.knowledgeCard;
  let categoryId: string | null = null;
  if (ctx.detectedCategory) {
    const { data: detectedCategory } = await deps.supabase
      .from('categories')
      .select('id')
      .eq('slug', ctx.detectedCategory)
      .limit(1)
      .maybeSingle();
    categoryId = detectedCategory?.id || null;
  }

  await enrichComparativeFeatureSignals(knowledgeCard, deps, {
    categoryId,
    toolSlug,
  });

  // Build minimal specs to store research data for later batch synthesis
  const specs: ToolSpecs = {
    // Store research data for batch synthesis (will be processed later)
    research_data: {
      scoutResult: {
        raw_sources: ctx.research.scoutResult.raw_sources,
        curated_sources: ctx.research.scoutResult.curated_sources,
        facts: ctx.research.scoutResult.facts,
        scrape_plan: ctx.research.scoutResult.scrape_plan,
        quality: ctx.research.scoutResult.quality,
      },
      knowledgeCard,
    },
    // Store category for reference
    detected_category: ctx.detectedCategory,
  };

  // Add pricing data if extracted
  if (knowledgeCard?.smp_pricing) {
    specs.pricing_data = knowledgeCard.smp_pricing;
    specs.pricing_v2 = mapSmpPricingToV2(toolSlug, knowledgeCard.smp_pricing) ?? undefined;
  }

  // Add taxonomy data if extracted
  if (knowledgeCard?.smp_taxonomy) {
    const rawFunction = knowledgeCard.smp_taxonomy.primary_function;
    const canonicalFunction = normalizeCategory(rawFunction);
    specs.taxonomy = {
      ...knowledgeCard.smp_taxonomy,
      primary_function: canonicalFunction,
    };
  }

  const { data: existingItemForMetadata } = await deps.supabase
    .from('items')
    .select('metadata')
    .eq('slug', toolSlug)
    .maybeSingle();
  const existingMetadata =
    existingItemForMetadata?.metadata && typeof existingItemForMetadata.metadata === 'object'
      ? (existingItemForMetadata.metadata as Record<string, unknown>)
      : null;

  // Build minimal metadata from Knowledge Card
  const metadata: Record<string, unknown> = {
    ...(existingMetadata || {}),
    ...knowledgeCard,
  };
  if (existingMetadata && typeof existingMetadata.popularity_tier === 'string') {
    metadata.popularity_tier = existingMetadata.popularity_tier;
  }

  // Calculate data_confidence from Knowledge Card's data_quality
  const dataConfidenceMap: Record<string, number> = {
    high: 0.9,
    medium: 0.7,
    low: 0.5,
  };
  const dataConfidence = dataConfidenceMap[knowledgeCard?.meta?.data_quality || 'low'] || 0.5;

  // Create or update item with research data
  const itemData: Record<string, unknown> = {
    name: ctx.toolName,
    slug: toolSlug,
    website: knowledgeCard?.website_url || null,
    short_description: null, // Will be filled in synthesis
    pricing_type: mapSmpPricingToPricingModel(knowledgeCard?.smp_pricing?.model),
    metadata,
    specs,
    data_confidence: dataConfidence,
    learning_curve: knowledgeCard?.learning_curve || null,
    pricing_verified_at: knowledgeCard?.smp_pricing ? new Date().toISOString() : null,
    pricing_confidence: knowledgeCard?.smp_pricing?.confidence || null,
  };

  const { data: item, error: itemError } = await deps.supabase
    .from('items')
    .upsert(itemData, { onConflict: 'slug' })
    .select('id')
    .single();

  if (itemError) throw new Error(`Failed to save item: ${itemError.message}`);

  deps.log(`[Research Only] Item saved: ${ctx.toolName} (id: ${item.id})`);
  deps.log(`[Research Only] Research data stored for batch synthesis`);

  try {
    const factPack = await persistItemFactPack({
      supabase: deps.supabase,
      itemId: item.id,
      itemName: ctx.toolName,
      itemSlug: toolSlug,
      categorySlug: ctx.detectedCategory || ctx.categorySlug || null,
      knowledgeCard,
      analysis: null,
      specs: specs as Record<string, unknown>,
      rawSources: ctx.research.scoutResult.raw_sources,
    });
    deps.log(
      `[Fact Pack] Upserted ${factPack.schemaId} v${factPack.version} in research-only mode`
    );
  } catch (factPackError) {
    const message = factPackError instanceof Error ? factPackError.message : String(factPackError);
    deps.log(`[Fact Pack] Warning (research-only): ${message}`);
  }

  // Update queue item status to research_complete
  if (ctx.queueItemId) {
    const { error: queueError } = await deps.supabase
      .from('hunt_queue')
      .update({
        status: 'research_complete',
        detected_category: ctx.detectedCategory || null,
        research_completed_at: new Date().toISOString(),
      })
      .eq('id', ctx.queueItemId);

    if (queueError) {
      deps.log(`[Queue] Warning: Failed to update queue status: ${queueError.message}`);
    } else {
      deps.log(`[Queue] Status → research_complete (category: ${ctx.detectedCategory || 'none'})`);
    }
  }

  deps.log(`[Phase 3] Complete - Research stored, awaiting batch synthesis`);

  return {
    toolId: item.id,
    contextId: null,
    reviewId: null,
    wasReused: false,
  };
}

function mapSmpPricingToPricingModel(
  model?: string | null
): 'free' | 'freemium' | 'paid' | 'enterprise' | 'open_source' | null {
  if (!model) return null;
  if (model === 'free') return 'free';
  if (model === 'contact_sales') return 'enterprise';
  if (model === 'open_source') return 'open_source';
  return 'paid';
}

/**
 * Create Knowledge Graph links for an item
 */
async function createGraphLinks(
  itemId: string,
  graphTags: {
    functions: string[];
    audiences: string[];
    platforms: string[];
  },
  deps: HunterDependencies
): Promise<void> {
  deps.log('Creating Knowledge Graph links...');

  await deps.supabase.rpc('link_item_to_categories', {
    p_item_id: itemId,
    p_functions: graphTags.functions,
    p_audiences: graphTags.audiences,
    p_platforms: graphTags.platforms,
  });

  deps.log(
    `Linked ${graphTags.functions.length} functions, ${graphTags.audiences.length} audiences, ${graphTags.platforms.length} platforms`
  );
}

/**
 * Find similar context using Jaccard similarity
 */
async function findSimilarContext(
  contextTitle: string,
  deps: HunterDependencies,
  threshold = 0.9
): Promise<{ id: string; title: string } | null> {
  deps.log(`Checking for similar contexts: "${contextTitle}"`);

  const { data, error } = await deps.supabase.rpc('find_similar_context', {
    p_context_title: contextTitle,
    p_threshold: threshold,
  });

  if (error) {
    deps.log(`⚠️ Similar context RPC failed: ${error.message}`);
    return await findSimilarContextFallback(contextTitle, deps, threshold);
  }

  if (data && data.length > 0) {
    const match = data[0];
    deps.log(
      `Found similar context: "${match.title}" (${(match.similarity * 100).toFixed(1)}% match)`
    );
    return { id: match.id, title: match.title };
  }

  return null;
}

async function findSimilarContextFallback(
  contextTitle: string,
  deps: HunterDependencies,
  threshold: number
): Promise<{ id: string; title: string } | null> {
  const { data: contexts, error } = await deps.supabase
    .from('contexts')
    .select('id, title')
    .order('updated_at', { ascending: false })
    .limit(200);

  if (error) {
    deps.log(`⚠️ Similar context fallback failed: ${error.message}`);
    return null;
  }

  const targetTokens = tokenizeForSimilarity(contextTitle);
  if (targetTokens.size === 0) return null;

  let bestMatch: { id: string; title: string; similarity: number } | null = null;
  for (const context of contexts || []) {
    const candidateTokens = tokenizeForSimilarity(context.title);
    const similarity = jaccardSimilarity(targetTokens, candidateTokens);
    if (similarity >= threshold && (!bestMatch || similarity > bestMatch.similarity)) {
      bestMatch = {
        id: context.id,
        title: context.title,
        similarity,
      };
    }
  }

  if (bestMatch) {
    deps.log(
      `Found similar context (fallback): "${bestMatch.title}" (${(bestMatch.similarity * 100).toFixed(1)}% match)`
    );
    return { id: bestMatch.id, title: bestMatch.title };
  }

  return null;
}

function tokenizeForSimilarity(input: string): Set<string> {
  const normalized = input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2)
    .filter((token) => !['best', 'for', 'the', 'and', 'with'].includes(token));
  return new Set(normalized);
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  if (a.size === 0 || b.size === 0) return 0;

  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection++;
  }
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Create a new context
 */
async function createNewContext(
  contextTitle: string,
  analysis: any,
  categoryId: string | null,
  deps: HunterDependencies
): Promise<string> {
  // Remove "best" prefix from slug since route is already /best/
  let contextSlug = slugify(contextTitle);
  if (contextSlug.startsWith('best-')) {
    contextSlug = contextSlug.replace(/^best-/, '');
  }

  // Get category IDs for context graph relationships
  let functionCategoryId: string | null = null;
  let audienceCategoryId: string | null = null;

  if (analysis.graphTags.functions.length > 0) {
    const { data } = await deps.supabase
      .from('categories')
      .select('id')
      .eq('type', 'function')
      .ilike('name', analysis.graphTags.functions[0])
      .single();
    functionCategoryId = data?.id || null;
  }

  if (analysis.graphTags.audiences.length > 0) {
    const { data } = await deps.supabase
      .from('categories')
      .select('id')
      .eq('type', 'audience')
      .ilike('name', analysis.graphTags.audiences[0])
      .single();
    audienceCategoryId = data?.id || null;
  }

  // Build structured title parts
  const titleParts = analysis.titleParts || {
    noun: contextTitle.replace(/^best\s+/i, '').replace(/\s+for\s+.*$/i, ''),
    modifier: contextTitle.match(/for\s+(.+)$/i)?.[1]
      ? `for ${contextTitle.match(/for\s+(.+)$/i)![1]}`
      : undefined,
  };

  const contextData = {
    title: contextTitle,
    slug: contextSlug,
    category_id: categoryId,
    title_template: 'best' as const,
    title_noun: titleParts.noun,
    title_modifier: titleParts.modifier || null,
    function_category_id: functionCategoryId,
    audience_category_id: audienceCategoryId,
  };

  const { data: context, error: contextError } = await deps.supabase
    .from('contexts')
    .upsert(contextData, { onConflict: 'slug' })
    .select('id')
    .single();

  if (contextError) throw new Error(`Failed to save context: ${contextError.message}`);

  return context.id;
}

/**
 * Normalize a claim to ensure consistent format with source attribution
 *
 * Handles both legacy string claims and new enriched ClaimWithSource objects.
 * For legacy strings, attempts to find a matching source from the research.
 * Always adds a retrieved_at timestamp for time-bound defense.
 */
function normalizeClaim(
  claim: string | ClaimWithSource,
  sources: Array<{
    url: string;
    canonical_url?: string;
    title: string;
    snippet: string;
    domain: string;
    retrieved_at?: string;
    published_at?: string;
    time_since?: string;
  }>,
  toolWebsite?: string
): ClaimWithSource | null {
  // Current timestamp for time-bound defense
  const retrievedAt = new Date().toISOString();

  const normalizedSourceUrlToOriginal = new Map<string, string>();
  for (const source of sources) {
    const normalizedSourceUrl = normalizeEvidenceUrl(source.url);
    if (normalizedSourceUrl && !normalizedSourceUrlToOriginal.has(normalizedSourceUrl)) {
      normalizedSourceUrlToOriginal.set(normalizedSourceUrl, source.url);
    }
    const normalizedCanonical = normalizeEvidenceUrl(source.canonical_url);
    if (normalizedCanonical && !normalizedSourceUrlToOriginal.has(normalizedCanonical)) {
      normalizedSourceUrlToOriginal.set(normalizedCanonical, source.url);
    }
  }

  const findSourceText = (url?: string): string => {
    if (!url) return '';
    const normalized = normalizeEvidenceUrl(url);
    if (!normalized) return '';
    const originalUrl = normalizedSourceUrlToOriginal.get(normalized) || url;
    const source = sources.find((s) => s.url === originalUrl);
    return source ? `${source.title || ''} ${source.snippet || ''}`.trim() : '';
  };
  const findSource = (url?: string) => {
    if (!url) return undefined;
    const normalized = normalizeEvidenceUrl(url);
    if (!normalized) return undefined;
    const originalUrl = normalizedSourceUrlToOriginal.get(normalized) || url;
    return sources.find((s) => s.url === originalUrl);
  };

  const hasTierABCorroboration = (text: string): boolean => {
    return sources.some((source) => {
      const tier = sourceTierForClaim(source.url);
      if (tier === 'C') return false;
      const sourceText = `${source.title || ''} ${source.snippet || ''}`;
      return overlapRatio(text, sourceText) >= 0.3;
    });
  };

  const passesNamedFeatureExistence = (text: string, sourceUrl?: string): boolean => {
    const featureNames = extractNamedFeatures(text);
    if (featureNames.length === 0) return true;

    const firstPartySources = sources.filter((source) => {
      if (!toolWebsite) return false;
      try {
        const toolHost = new URL(toolWebsite).hostname.replace(/^www\./, '').toLowerCase();
        const sourceHost = new URL(source.url).hostname.replace(/^www\./, '').toLowerCase();
        return sourceHost === toolHost || sourceHost.endsWith(`.${toolHost}`);
      } catch {
        return false;
      }
    });

    const baselineText = `${findSourceText(sourceUrl)} ${firstPartySources
      .map((s) => `${s.title || ''} ${s.snippet || ''}`)
      .join(' ')}`.toLowerCase();

    return featureNames.every((feature) => baselineText.includes(feature.toLowerCase()));
  };

  // Already enriched - validate and return with timestamp
  if (typeof claim === 'object' && 'text' in claim && 'source_url' in claim) {
    const normalizedClaimSourceUrl = normalizeEvidenceUrl(claim.source_url);
    if (!normalizedClaimSourceUrl) return null;
    const matchedSourceUrl = normalizedSourceUrlToOriginal.get(normalizedClaimSourceUrl);
    if (!matchedSourceUrl) {
      return null;
    }

    const claimType = claim.claim_type || 'opinion';
    const vendorPhrase = sanitizeNarrativeClaimText(
      (claim.vendor_phrase || claim.text || '').trim()
    );
    const normalizedComparisonBasisSourceUrl = normalizeEvidenceUrl(
      claim.comparison_basis_source_url?.trim()
    );
    const comparisonBasisSourceUrl =
      normalizedComparisonBasisSourceUrl &&
      normalizedSourceUrlToOriginal.get(normalizedComparisonBasisSourceUrl)
        ? normalizedSourceUrlToOriginal.get(normalizedComparisonBasisSourceUrl)
        : undefined;
    const sourceType = claim.source_type || classifySourceType(matchedSourceUrl, toolWebsite);
    const strictKind = detectClaimKind(claim.text, claimType);
    const detectedKind =
      strictKind === 'comparison' || strictKind === 'derived_metric'
        ? strictKind
        : claim.claim_kind || strictKind;
    const needsComparatorBasis =
      strictKind === 'comparison' ||
      strictKind === 'derived_metric' ||
      hasComparatorToken(claim.text);
    let normalizedText =
      needsComparatorBasis && !comparisonBasisSourceUrl
        ? downgradeComparativeClause(claim.text)
        : claim.text;
    if (!normalizedText) return null;
    normalizedText = sanitizeNarrativeClaimText(normalizedText);
    if (!normalizedText) return null;

    // Salvage truncated model output when original vendor phrase is complete.
    if (
      vendorPhrase &&
      !isRenderableClaimText(normalizedText) &&
      isRenderableClaimText(vendorPhrase)
    ) {
      normalizedText = vendorPhrase;
    }
    if (!isRenderableClaimText(normalizedText)) return null;

    // "Users report..." style language must not be tied to official first-party sources.
    if (sourceType === 'official' && hasCommunityHedgingLanguage(normalizedText)) {
      return null;
    }

    if (hasAbsoluteMarketingTerm(normalizedText)) {
      const sourceTier = sourceTierForClaim(matchedSourceUrl);
      const corroborated = sourceTier !== 'C' || hasTierABCorroboration(normalizedText);
      if (!corroborated) {
        normalizedText = softenAbsoluteMarketingLanguage(normalizedText);
      }
    }

    if (!passesNamedFeatureExistence(normalizedText, matchedSourceUrl)) {
      return null;
    }
    if (suppressSalesGatedClaim(normalizedText, matchedSourceUrl, sources, toolWebsite)) {
      return null;
    }
    if (RANKING_CLAIM_TOKENS.test(normalizedText)) {
      const sourceTier = sourceTierForClaim(matchedSourceUrl);
      const hasSupport = sourceTier !== 'C' && hasTierABCorroboration(normalizedText);
      if (!hasSupport) return null;
      const sourceDate =
        findSource(matchedSourceUrl)?.published_at || findSource(matchedSourceUrl)?.retrieved_at;
      normalizedText = rewriteVendorRankingClaim(normalizedText, sourceDate);
    }
    if (UNVERIFIED_QUANT_VALUE.test(normalizedText) && !hasTierABCorroboration(normalizedText)) {
      normalizedText = stripUnsupportedQuantitativePhrases(normalizedText);
      if (!normalizedText) return null;
    }
    normalizedText = sanitizeRiskyClaimLanguage(normalizedText);
    const scopedText = enforceOfferingScope(normalizedText, matchedSourceUrl, sources);
    if (!scopedText) return null;
    normalizedText = scopedText;
    const checkedAt = claim.checked_at || claim.retrieved_at || retrievedAt;
    const volatility = classifyClaimVolatility(normalizedText, claimType);
    const scope = claim.scope || inferClaimScope(normalizedText, matchedSourceUrl) || undefined;

    return {
      text: normalizedText,
      source_url: matchedSourceUrl,
      source_type: sourceType,
      claim_type: claimType, // Default to opinion for safety
      retrieved_at: claim.retrieved_at || retrievedAt,
      checked_at: checkedAt,
      source_urls: claim.source_urls || [matchedSourceUrl],
      verification_method:
        claim.verification_method || (hasTierABCorroboration(normalizedText) ? 'cross_source' : 'source_presence'),
      scope,
      volatility,
      recheck_by: claim.recheck_by || computeClaimRecheckBy(checkedAt, volatility) || undefined,
      claim_kind: needsComparatorBasis && !comparisonBasisSourceUrl ? 'inference' : detectedKind,
      vendor_phrase: vendorPhrase || normalizedText,
      comparison_basis_source_url: comparisonBasisSourceUrl,
    };
  }

  // Legacy string - try to find a relevant source
  const claimText = typeof claim === 'string' ? claim : (claim as any).text;
  const normalizedLegacyText = hasComparatorToken(claimText)
    ? downgradeComparativeClause(claimText)
    : claimText;
  if (!normalizedLegacyText) return null;

  // Try to match claim keywords to source snippets
  const claimWords = claimText.toLowerCase().split(/\s+/);
  let bestSource = sources[0]; // Fallback if any source matches
  let bestMatchScore = 0;

  for (const source of sources) {
    const sourceText = `${source.title} ${source.snippet}`.toLowerCase();
    let matchScore = 0;
    for (const word of claimWords) {
      if (word.length > 3 && sourceText.includes(word)) {
        matchScore++;
      }
    }
    if (matchScore > bestMatchScore) {
      bestMatchScore = matchScore;
      bestSource = source;
    }
  }

  if (!bestSource) {
    return null;
  }

  let legacyText = sanitizeNarrativeClaimText(normalizedLegacyText);
  if (!legacyText || !isRenderableClaimText(legacyText)) return null;
  if (hasAbsoluteMarketingTerm(legacyText) && !hasTierABCorroboration(legacyText)) {
    legacyText = softenAbsoluteMarketingLanguage(legacyText);
  }
  if (!passesNamedFeatureExistence(legacyText, bestSource.url)) {
    return null;
  }
  if (suppressSalesGatedClaim(legacyText, bestSource.url, sources, toolWebsite)) {
    return null;
  }
  if (RANKING_CLAIM_TOKENS.test(legacyText)) {
    const sourceTier = sourceTierForClaim(bestSource.url);
    if (sourceTier === 'C' || !hasTierABCorroboration(legacyText)) {
      return null;
    }
    const sourceDate = bestSource.published_at || bestSource.retrieved_at;
    legacyText = rewriteVendorRankingClaim(legacyText, sourceDate);
  }
  if (UNVERIFIED_QUANT_VALUE.test(legacyText) && !hasTierABCorroboration(legacyText)) {
    legacyText = stripUnsupportedQuantitativePhrases(legacyText);
    if (!legacyText) return null;
  }
  legacyText = sanitizeRiskyClaimLanguage(legacyText);
  const scopedLegacy = enforceOfferingScope(legacyText, bestSource.url, sources);
  if (!scopedLegacy) return null;
  legacyText = scopedLegacy;
  const legacySourceType = classifySourceType(bestSource.url, toolWebsite);
  if (legacySourceType === 'official' && hasCommunityHedgingLanguage(legacyText)) {
    return null;
  }
  const checkedAt = bestSource.retrieved_at || retrievedAt;
  const volatility = classifyClaimVolatility(legacyText, 'opinion');
  const scope = inferClaimScope(legacyText, bestSource.url) || undefined;

  return {
    text: legacyText,
    source_url: bestSource.url,
    source_type: legacySourceType,
    claim_type: 'opinion', // Assume opinion for legacy claims (safer)
    retrieved_at: retrievedAt,
    checked_at: checkedAt,
    source_urls: [bestSource.url],
    verification_method: hasTierABCorroboration(legacyText) ? 'cross_source' : 'source_presence',
    scope,
    volatility,
    recheck_by: computeClaimRecheckBy(checkedAt, volatility) || undefined,
    claim_kind: detectClaimKind(legacyText, 'opinion'),
    vendor_phrase: claimText,
  };
}

function buildDerivedConsFromConstraints(
  knowledgeCard: any,
  toolWebsite?: string,
  allSources?: Array<{
    url: string;
    title: string;
    snippet: string;
    domain: string;
    retrieved_at?: string;
    published_at?: string;
    time_since?: string;
  }>
): ClaimWithSource[] {
  const derived: ClaimWithSource[] = [];
  const sources = allSources || [];
  const pricingUrl: string | undefined = knowledgeCard?.smp_pricing?.pricing_page_url || undefined;
  const toolHost = (() => {
    if (!toolWebsite) return null;
    try {
      return new URL(toolWebsite).hostname.replace(/^www\./, '').toLowerCase();
    } catch {
      return null;
    }
  })();

  const firstPartySources = sources.filter((source) => {
    if (!toolHost) return true;
    const domain = source.domain?.toLowerCase();
    const url = source.url?.toLowerCase() || '';
    return domain === toolHost || domain?.endsWith(`.${toolHost}`) || url.includes(toolHost);
  });

  const chooseSourceByKeywords = (keywords: string[], fallbackUrl?: string): string | undefined => {
    let bestUrl: string | undefined = fallbackUrl;
    let bestScore = 0;
    for (const candidate of firstPartySources) {
      const haystack = `${candidate.url} ${candidate.title} ${candidate.snippet}`.toLowerCase();
      let score = 0;
      for (const keyword of keywords) {
        if (haystack.includes(keyword)) score += 1;
      }
      if (score > bestScore) {
        bestScore = score;
        bestUrl = candidate.url;
      }
    }
    return bestUrl;
  };

  const fallbackFirstPartyUrl = firstPartySources[0]?.url;
  const derivedSourceUrls: Record<string, string | undefined> = {
    pricing: chooseSourceByKeywords(
      ['pricing', 'plans', 'billing', 'subscription'],
      fallbackFirstPartyUrl
    ),
    setup:
      knowledgeCard?.setup_complexity?.setup_url ||
      chooseSourceByKeywords(
        ['setup', 'onboarding', 'getting-started', 'quickstart', 'install', 'guide', 'docs'],
        fallbackFirstPartyUrl
      ),
    portability: chooseSourceByKeywords(
      ['export', 'import', 'migration', 'portability', 'backup', 'api'],
      fallbackFirstPartyUrl
    ),
    integrations: chooseSourceByKeywords(
      ['integrations', 'marketplace', 'apps', 'api', 'developer', 'webhook'],
      fallbackFirstPartyUrl
    ),
    security: chooseSourceByKeywords(
      ['security', 'trust', 'compliance', 'privacy', 'soc2', 'gdpr', 'hipaa', 'dpa'],
      fallbackFirstPartyUrl
    ),
    support: chooseSourceByKeywords(
      ['support', 'help', 'docs', 'contact', 'sla'],
      fallbackFirstPartyUrl
    ),
  };

  const pricingSourceUrl = pricingUrl || derivedSourceUrls.pricing;
  const setupSourceUrl = derivedSourceUrls.setup;
  const portabilitySourceUrl = derivedSourceUrls.portability;
  const integrationSourceUrl = derivedSourceUrls.integrations;
  const securitySourceUrl = derivedSourceUrls.security;
  const supportSourceUrl = derivedSourceUrls.support;

  const addDerivedCon = (text: string, sourceUrl?: string) => {
    if (!sourceUrl) return;
    const checkedAt = sources.find((s) => s.url === sourceUrl)?.retrieved_at || new Date().toISOString();
    const volatility = classifyClaimVolatility(text, 'fact');
    derived.push({
      text,
      source_url: sourceUrl,
      source_type: classifySourceType(sourceUrl, toolWebsite),
      claim_type: 'fact',
      retrieved_at: checkedAt,
      checked_at: checkedAt,
      source_urls: [sourceUrl],
      verification_method: 'source_presence',
      scope: inferClaimScope(text, sourceUrl) || undefined,
      volatility,
      recheck_by: computeClaimRecheckBy(checkedAt, volatility) || undefined,
    });
  };

  const hardLimits = knowledgeCard?.constraints?.hard_limits || [];
  for (const limit of hardLimits) {
    const sourceUrl = limit.source_url || undefined;
    if (!sourceUrl) continue;
    const description = limit.description
      ? `Usage limits apply: ${limit.description}`
      : `Usage limits apply to ${limit.type}: ${limit.value} (${limit.consequence})`;
    addDerivedCon(description, sourceUrl);
  }

  const hiddenCosts = knowledgeCard?.constraints?.hidden_costs || [];
  for (const hiddenCost of hiddenCosts.slice(0, 2)) {
    if (!hiddenCost?.description) continue;
    addDerivedCon(`Additional cost trigger: ${hiddenCost.description}`, pricingSourceUrl);
  }

  const setup = knowledgeCard?.setup_complexity;
  if (setupSourceUrl && setup) {
    if (setup.requires_developer === true) {
      addDerivedCon('Setup may require developer involvement.', setupSourceUrl);
    }
    if (setup.requires_it_admin === true || setup.red_tape?.admin_required === true) {
      addDerivedCon('Setup requires IT/admin privileges.', setupSourceUrl);
    }
    if (setup.implementation_partner_needed === true) {
      addDerivedCon('Implementation partner support may be required for rollout.', setupSourceUrl);
    }
    if (setup.estimated_setup_time === 'days' || setup.estimated_setup_time === 'weeks') {
      addDerivedCon(
        `Initial setup typically takes ${setup.estimated_setup_time}, not minutes.`,
        setupSourceUrl
      );
    }
    if (setup.red_tape?.approval_required === true) {
      addDerivedCon('Internal approval steps are required before rollout.', setupSourceUrl);
    }
  }

  const portability = knowledgeCard?.smp_portability;
  if (portabilitySourceUrl && portability) {
    if (portability.has_data_export === false) {
      addDerivedCon('No first-party data export path is documented.', portabilitySourceUrl);
    }
    if (portability.migration_difficulty === 'hard' || portability.migration_difficulty === 'locked') {
      addDerivedCon(
        `Migration-out difficulty is listed as ${portability.migration_difficulty}.`,
        portabilitySourceUrl
      );
    }
    if (
      typeof portability.cancellation_notice_days === 'number' &&
      portability.cancellation_notice_days > 0
    ) {
      addDerivedCon(
        `Cancellation requires ${portability.cancellation_notice_days}-day notice.`,
        portabilitySourceUrl
      );
    }
  }

  const integrations = knowledgeCard?.integrations;
  if (integrationSourceUrl && integrations) {
    if (integrations.has_api === false) {
      addDerivedCon('No public API access is documented in first-party sources.', integrationSourceUrl);
    }
    if (integrations.has_webhooks === false) {
      addDerivedCon('Webhook support is not documented in first-party sources.', integrationSourceUrl);
    }
  }

  const security = knowledgeCard?.security;
  if (securitySourceUrl && security?.sso_available === false) {
    addDerivedCon('SSO is not listed as available for this product.', securitySourceUrl);
  }

  const support = knowledgeCard?.support;
  if (supportSourceUrl && support) {
    if (
      support.has_live_chat === false &&
      support.has_phone_support === false &&
      support.has_dedicated_support === false
    ) {
      addDerivedCon('Real-time support channels are limited (no live chat/phone listed).', supportSourceUrl);
    }
  }

  if (pricingSourceUrl) {
    const minSeats = knowledgeCard?.smp_pricing?.min_seats;
    if (typeof minSeats === 'number' && minSeats > 1) {
      addDerivedCon(`Minimum seat requirement: ${minSeats} seats`, pricingSourceUrl);
    }

    const implementationFee = knowledgeCard?.smp_pricing?.implementation_fee;
    if (typeof implementationFee === 'number' && implementationFee > 0) {
      addDerivedCon(`Implementation fee required (${implementationFee})`, pricingSourceUrl);
    }

    const billingCycles = knowledgeCard?.smp_pricing?.billing_cycles || [];
    if (billingCycles.length === 1 && billingCycles[0] === 'annual') {
      addDerivedCon('Annual billing only', pricingSourceUrl);
    }

    if (knowledgeCard?.smp_pricing?.model === 'contact_sales') {
      addDerivedCon('Pricing requires contacting sales', pricingSourceUrl);
    }

    const hasFreeTier = knowledgeCard?.pricing?.has_free_tier;
    if (hasFreeTier === false) {
      addDerivedCon(
        'No self-serve free tier is listed on the referenced pricing page.',
        pricingSourceUrl
      );
    }

    const hasFreeTrial = knowledgeCard?.pricing?.has_free_trial;
    if (hasFreeTrial === false) {
      addDerivedCon(
        'No self-serve free trial is listed on the referenced pricing page.',
        pricingSourceUrl
      );
    }
  }

  const deduped: ClaimWithSource[] = [];
  const seen = new Set<string>();
  for (const con of derived) {
    const key = con.text.toLowerCase().trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    deduped.push(con);
  }

  return deduped.slice(0, 3);
}

function isPricingBiasedDerivedCon(text: string): boolean {
  return (
    /^Usage limits apply:/i.test(text) ||
    /^Additional cost trigger:/i.test(text) ||
    /^Minimum seat requirement:/i.test(text) ||
    /^Implementation fee required/i.test(text) ||
    /^Annual billing only$/i.test(text) ||
    /^Pricing requires contacting sales$/i.test(text) ||
    /^No self-serve free tier/i.test(text) ||
    /^No self-serve free trial/i.test(text)
  );
}

/**
 * Negative Sentiment Guardrail
 *
 * For legal protection, negative opinion claims require corroboration from 2+ sources.
 * This prevents single-source defamatory claims from being published.
 *
 * @param claim - The normalized claim
 * @param allSources - All research sources to check for corroboration
 * @returns Object with isValid flag and optional warning
 */
function validateNegativeClaim(
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
  // Only apply guardrail to negative opinions from community sources
  // Facts from official sources don't need this check
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
        (blockedDomain) => domain === blockedDomain || domain.endsWith(`.${blockedDomain}`)
      )
    ) {
      return false;
    }
    return true;
  });

  // For opinions (especially from community), count corroborating sources
  const claimWords = claim.text
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 4);
  if (claimWords.length === 0) {
    return {
      isValid: false,
      warning: 'Negative claim lacks enough specific terms for corroboration matching.',
      corroboratingSourceCount: 0,
    };
  }

  let corroboratingCount = 0;
  const matchedDomains = new Set<string>();
  const corroboratingSources: string[] = [];

  for (const source of corroborationPool) {
    const sourceText = `${source.title} ${source.snippet}`.toLowerCase();
    // Count how many significant claim words appear in this source
    const matchingWords = claimWords.filter((w) => sourceText.includes(w));

    // If 40%+ of claim words match, this source corroborates
    if (matchingWords.length >= claimWords.length * 0.4) {
      // Don't count multiple pages from same domain as separate corroboration
      if (!matchedDomains.has(source.domain)) {
        matchedDomains.add(source.domain);
        corroboratingCount++;
        corroboratingSources.push(source.url);
      }
    }
  }

  // Require 2+ independent sources for community-sourced opinions
  if (claim.source_type === 'community' && claim.claim_type === 'opinion') {
    if (corroboratingCount < 2) {
      return {
        isValid: false,
        warning: `Negative opinion only corroborated by ${corroboratingCount} source(s). Requires 2+ for legal protection.`,
        corroboratingSourceCount: corroboratingCount,
        corroboratingSources,
      };
    }
  }

  // Editorial sources get slightly more trust, but still flag single-source opinions
  if (claim.source_type === 'editorial' && claim.claim_type === 'opinion') {
    if (corroboratingCount < 1) {
      return {
        isValid: false,
        warning: `Editorial opinion has no corroborating sources in eligible source pool (${corroborationPool.length}).`,
        corroboratingSourceCount: corroboratingCount,
        corroboratingSources,
      };
    }
  }

  return { isValid: true, corroboratingSourceCount: corroboratingCount, corroboratingSources };
}

function sanitizeReviewContext(
  reviewContext: any,
  validCons: ClaimWithSource[],
  deps: HunterDependencies
): any | null {
  if (!reviewContext) return null;

  const sanitized = { ...reviewContext };

  if (sanitized.humanVerdict) {
    const verdictText = String(sanitized.humanVerdict);
    if (containsNegativeCue(verdictText) && !isBackedByClaims(verdictText, validCons)) {
      deps.log('[Guardrail] Dropped humanVerdict with negative cues lacking corroboration');
      sanitized.humanVerdict = null;
    }
  }

  if (sanitized.userAdvocate) {
    const ua = { ...sanitized.userAdvocate };
    const avoidIfFiltered = filterConditionalList(ua.avoidIf, 'avoidIf', deps);
    const frustrationsFiltered = filterConditionalList(ua.frustrations, 'frustrations', deps);

    const avoidIfBacked = avoidIfFiltered.filter((item) => isBackedByClaims(item, validCons));
    const frustrationsBacked = frustrationsFiltered.filter((item) =>
      isBackedByClaims(item, validCons)
    );

    const avoidIfDropped = avoidIfFiltered.length - avoidIfBacked.length;
    const frustrationsDropped = frustrationsFiltered.length - frustrationsBacked.length;

    if (avoidIfDropped > 0) {
      deps.log(`[Guardrail] Filtered ${avoidIfDropped} avoidIf item(s) without corroborating cons`);
    }
    if (frustrationsDropped > 0) {
      deps.log(
        `[Guardrail] Filtered ${frustrationsDropped} frustrations item(s) without corroborating cons`
      );
    }

    ua.avoidIf = avoidIfBacked;
    ua.frustrations = frustrationsBacked;
    sanitized.userAdvocate = ua;
  }

  return sanitized;
}

/**
 * Create a review linking item to context
 *
 * Includes full source attribution for legal protection:
 * - Normalizes all claims to include source_url, source_type, claim_type
 * - Applies negative sentiment guardrail (2+ sources for negative opinions)
 * - Stores research sources for audit trail
 * - Records generation timestamp
 * - Auto-publishes if high confidence (quality="high", score 70+, minimal filtered claims)
 */
async function createReview(
  itemId: string,
  contextId: string,
  analysis: any,
  sources: Array<{
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
    is_deep_scrape_allowed?: boolean;
    block_reason?: string;
    retrieved_at?: string;
    published_at?: string;
    time_since?: string;
  }>,
  knowledgeCard: any,
  canonicalConflictsCount: number,
  contextTitle: string | undefined,
  popularityTier: PopularityTier,
  deps: HunterDependencies
): Promise<string> {
  // Normalize pros and cons with source attribution
  const normalizedProsRaw = analysis.pros.map((claim: string | ClaimWithSource) =>
    normalizeClaim(claim, sources, analysis.websiteUrl)
  );
  const rawNormalizedCons = analysis.cons.map((claim: string | ClaimWithSource) =>
    normalizeClaim(claim, sources, analysis.websiteUrl)
  );

  const normalizedProsPresent = normalizedProsRaw.filter(Boolean) as ClaimWithSource[];
  const normalizedConsPresent = rawNormalizedCons.filter(Boolean) as ClaimWithSource[];
  const normalizedPros = normalizedProsPresent.filter((claim) => isRenderableClaimText(claim.text));
  const normalizedConsCandidates = normalizedConsPresent.filter((claim) =>
    isRenderableClaimText(claim.text)
  );
  const missingSourceCount =
    normalizedProsRaw.length -
    normalizedProsPresent.length +
    (rawNormalizedCons.length - normalizedConsPresent.length);
  const malformedClaimCount =
    normalizedProsPresent.length -
    normalizedPros.length +
    (normalizedConsPresent.length - normalizedConsCandidates.length);
  if (missingSourceCount > 0) {
    deps.log(`[Guardrail] Filtered ${missingSourceCount} review claim(s) missing source URLs`);
  }
  if (malformedClaimCount > 0) {
    deps.log(`[Guardrail] Filtered ${malformedClaimCount} malformed/truncated review claim(s)`);
  }

  // Apply negative sentiment guardrail to cons
  // Filter out cons that don't meet the 2+ source requirement for opinions
  const normalizedCons: ClaimWithSource[] = [];
  const filteredCons: Array<{ claim: ClaimWithSource; reason: string }> = [];

  for (const con of normalizedConsCandidates) {
    if (isIntegrationGapClaim(con.text) && !isIntegrationCriticalContext(contextTitle)) {
      filteredCons.push({
        claim: con,
        reason: 'Integration-gap claim is not material for this context',
      });
      deps.log(
        `[Guardrail] Filtered con: "${con.text.substring(0, 50)}..." - not material for context`
      );
      continue;
    }

    const validation = validateNegativeClaim(con, sources);
    if (validation.isValid) {
      normalizedCons.push(con);
    } else {
      filteredCons.push({ claim: con, reason: validation.warning || 'Failed validation' });
      const sourcesInfo =
        validation.corroboratingSources && validation.corroboratingSources.length > 0
          ? ` Sources found: ${validation.corroboratingSources.join(', ')}`
          : '';
      deps.log(
        `[Guardrail] Filtered con: "${con.text.substring(0, 50)}..." - ${validation.warning}${sourcesInfo}`
      );
    }
  }

  // Log if any cons were filtered
  if (filteredCons.length > 0) {
    deps.log(
      `[Guardrail] Filtered ${filteredCons.length} negative claim(s) due to insufficient source corroboration`
    );
  }

  if (normalizedCons.length === 0) {
    const derivedCons = buildDerivedConsFromConstraints(knowledgeCard, analysis.websiteUrl, sources);
    const vettedDerived: ClaimWithSource[] = [];
    for (const derived of derivedCons) {
      const validation = validateNegativeClaim(derived, sources);
      if (validation.isValid) vettedDerived.push(derived);
    }
    if (vettedDerived.length > 0) {
      const deduped = Array.from(
        new Map(
          [...normalizedCons, ...vettedDerived].map((claim) => [
            `${claim.text}|${claim.source_url || ''}`,
            claim,
          ])
        ).values()
      );
      normalizedCons.push(...deduped.slice(normalizedCons.length));
      deps.log(`[Guardrail] Added ${vettedDerived.length} derived review cons from constraints/pricing`);
    }
  }

  const conditionalDealbreakers = filterConditionalList(
    analysis.dealbreakers || [],
    'dealbreakers',
    deps
  ).filter((item: string) => isBackedByClaims(item, normalizedCons));
  if ((analysis.dealbreakers || []).length > 0) {
    deps.log(
      `[Guardrail] dealbreakers: kept ${conditionalDealbreakers.length}/${analysis.dealbreakers.length} (conditional + corroborated)`
    );
  }

  const vettedVetosForSummary = (analysis.vetoLogic || []).filter((v: any) => {
    if (!v?.source_url) return false;
    const validation = validateNegativeClaim(
      {
        text: v.reason || v.condition,
        source_url: v.source_url,
        source_type: 'community',
        claim_type: 'opinion',
        retrieved_at: new Date().toISOString(),
      },
      sources
    );
    return validation.isValid;
  });

  const derivedSummary = buildDerivedSummary(
    normalizedCons,
    normalizedPros,
    vettedVetosForSummary.length > 0 ? vettedVetosForSummary : null
  );
  if (!derivedSummary) {
    deps.log('[Guardrail] Derived summary unavailable (insufficient vetted claims)');
  }

  const legalIssues: string[] = [];
  if (missingSourceCount > 0) legalIssues.push('claims_missing_sources');
  if (derivedSummary === null) legalIssues.push('summary_unavailable');
  const staleHighVolatilityClaims = normalizedCons.filter((claim) => {
    const volatility = claim.volatility || classifyClaimVolatility(claim.text, claim.claim_type);
    if (volatility !== 'high') return false;
    return isClaimStale(claim.checked_at || claim.retrieved_at, volatility);
  }).length;
  if (staleHighVolatilityClaims > 0) {
    legalIssues.push('high_volatility_claims_stale');
    deps.log(
      `[Guardrail] Found ${staleHighVolatilityClaims} stale high-volatility claim(s); forcing draft`
    );
  }
  const riskyNarrativeFields = [
    analysis.verdict,
    analysis.reviewContext?.humanVerdict,
    ...(Array.isArray(analysis.dealbreakers) ? analysis.dealbreakers : []),
    ...(Array.isArray(analysis.reviewContext?.userAdvocate?.avoidIf)
      ? analysis.reviewContext.userAdvocate.avoidIf
      : []),
  ]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .map((value) => value.trim());
  const hasUnsupportedNegativeClaim =
    riskyNarrativeFields.some((value) => containsRiskyAbsolute(value)) && normalizedCons.length < 2;
  if (hasUnsupportedNegativeClaim) {
    legalIssues.push('UNSUPPORTED_NEGATIVE_CLAIM');
    deps.log(
      '[Guardrail] Forced draft: unsupported risky narrative claim without sufficient evidence'
    );
  }

  const authoritativeSources = sources.filter((source) =>
    AUTHORITATIVE_SOURCE_TYPES.has((source.source_type || '').toLowerCase())
  );
  const authoritativeDomains = new Set(
    authoritativeSources
      .map((source) => source.domain?.replace(/^www\./i, '').toLowerCase())
      .filter((domain): domain is string => Boolean(domain))
  );
  const profile = POPULARITY_PROFILES[popularityTier];

  const reviewData: Record<string, unknown> = {
    item_id: itemId, // V2: renamed from tool_id
    context_id: contextId,
    score: analysis.score,
    quality: knowledgeCard?.meta?.data_quality || null,
    summary_markdown: derivedSummary,
    pros: normalizedPros,
    cons: normalizedCons,
    sentiment_tags: analysis.sentimentTags,
    // Migration 022: Context-specific review fields
    fit_score: analysis.fitScore || null,
    value_rating: analysis.valueRating || null,
    standout_features: analysis.standoutFeatures || [],
    dealbreakers: conditionalDealbreakers,
    switching_from: analysis.switchingFrom || [],
  };

  // Add sources if provided (for audit trail)
  if (sources && sources.length > 0) {
    reviewData.sources = sources;
  }

  // AUTO-PUBLISH LOGIC: High-confidence reviews go live immediately
  // Criteria:
  // 1. High data quality (verified facts from official sources)
  // 2. Good score (70+)
  // 3. Minimal legal risk (≤1 filtered con, ≥2 valid cons remaining)
  const isHighConfidence =
    knowledgeCard.meta.data_quality === 'high' &&
    analysis.score >= 70 &&
    filteredCons.length <= 1 &&
    normalizedCons.length >= 2 &&
    legalIssues.length === 0 &&
    canonicalConflictsCount === 0;
  const qualifiesFastPath =
    profile.allowedDataQualities.includes(
      knowledgeCard.meta.data_quality as 'high' | 'medium' | 'low'
    ) &&
    analysis.score >= profile.minScore &&
    filteredCons.length <= profile.maxFilteredCons &&
    normalizedCons.length >= profile.minValidCons &&
    meetsAuthoritativeSourceThreshold(
      popularityTier,
      authoritativeSources.length,
      profile.minAuthoritativeSources,
      analysis.score
    ) &&
    meetsAuthoritativeDomainThreshold(
      popularityTier,
      authoritativeDomains.size,
      profile.minAuthoritativeDomains,
      authoritativeSources.length,
      analysis.score
    ) &&
    legalIssues.length === 0 &&
    canonicalConflictsCount === 0;

  if (
    (isHighConfidence || qualifiesFastPath) &&
    deps.config.isDraftMode === false &&
    !hasUnsupportedNegativeClaim
  ) {
    reviewData.status = 'published';
    if (isHighConfidence) {
      deps.log(
        `[Auto-publish] High confidence review (quality=${knowledgeCard.meta.data_quality}, score=${analysis.score}, ${filteredCons.length} filtered, ${normalizedCons.length} valid cons)`
      );
    } else {
      deps.log(
        `[Auto-publish] Fast path review (tier=${popularityTier}, quality=${knowledgeCard.meta.data_quality}, score=${analysis.score}, authoritative_sources=${authoritativeSources.length}, authoritative_domains=${authoritativeDomains.size}, ${filteredCons.length} filtered, ${normalizedCons.length} valid cons)`
      );
    }
  } else {
    reviewData.status = 'draft';
    if (!isHighConfidence) {
      deps.log(
        `[Draft] Review needs manual review (quality=${knowledgeCard.meta.data_quality}, score=${analysis.score}, ${filteredCons.length} filtered, ${normalizedCons.length} valid cons)`
      );
      if (legalIssues.length > 0) {
        deps.log(`[Draft] Legal guardrail issues: ${legalIssues.join(', ')}`);
      }
      if (canonicalConflictsCount > 0) {
        deps.log(`[Draft] Canonical conflicts require review: ${canonicalConflictsCount}`);
      }
    }
  }

  const { data: review, error: reviewError } = await deps.supabase
    .from('reviews')
    .upsert(reviewData, { onConflict: 'item_id,context_id' })
    .select('id')
    .single();

  if (reviewError) throw new Error(`Failed to save review: ${reviewError.message}`);

  if (sources && sources.length > 0) {
    const claimRows = buildClaimLedgerRows(
      itemId,
      contextId,
      normalizedPros,
      normalizedCons,
      sources
    );
    if (claimRows.length > 0) {
      const { error: claimsError } = await deps.supabase.from('claims').insert(claimRows);
      if (claimsError) {
        deps.log(`[Claims] Warning: Failed to persist claim ledger (${claimsError.message})`);
      }
    }
  }

  return review.id;
}

function buildClaimLedgerRows(
  itemId: string,
  contextId: string | null,
  pros: ClaimWithSource[],
  cons: ClaimWithSource[],
  sources: Array<{
    url: string;
    title: string;
    snippet: string;
    domain: string;
    retrieved_at?: string;
    published_at?: string;
    time_since?: string;
    acquisition_mode?: 'LINK_ONLY' | 'API_ONLY' | 'SCRAPE_ALLOWED' | 'BLOCKED';
    llm_ingestion_allowed?: 'NO' | 'YES_LIMITED' | 'YES';
    is_deep_scrape_allowed?: boolean;
    block_reason?: string;
  }>
): Array<{
  item_id: string;
  context_id: string | null;
  claim_type: string;
  value_json: Record<string, unknown>;
  source_url: string | null;
  source_domain: string | null;
  policy_snapshot: Record<string, unknown> | null;
  confidence: number | null;
  intent: string | null;
  extracted_at?: string;
}> {
  const byUrl = new Map<string, (typeof sources)[number]>();
  const byDomain = new Map<string, (typeof sources)[number]>();

  const extractDomain = (url?: string | null): string | null => {
    if (!url) return null;
    try {
      return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
    } catch {
      return null;
    }
  };

  const deriveClaimConfidence = (
    claim: ClaimWithSource,
    source?: (typeof sources)[number]
  ): number => {
    if (source?.llm_ingestion_allowed === 'NO') {
      if (source.acquisition_mode === 'BLOCKED' || source.acquisition_mode === 'API_ONLY')
        return 0.35;
      return 0.45;
    }

    if (source?.acquisition_mode === 'SCRAPE_ALLOWED') {
      if (claim.claim_type === 'fact' && claim.source_type === 'official') return 0.9;
      if (claim.claim_type === 'fact') return 0.82;
      return 0.75;
    }

    if (claim.source_type === 'official' && claim.claim_type === 'fact') return 0.8;
    if (claim.source_type === 'editorial' && claim.claim_type === 'fact') return 0.72;
    if (claim.source_type === 'community') return 0.6;
    return 0.65;
  };

  for (const source of sources) {
    if (!source.url) continue;
    byUrl.set(source.url, source);
    const normalized = normalizeEvidenceUrl(source.url);
    if (normalized) byUrl.set(normalized, source);
    const domain = source.domain?.toLowerCase();
    if (domain && !byDomain.has(domain)) {
      byDomain.set(domain, source);
    }
  }

  const toRow = (claim: ClaimWithSource, type: string) => {
    const claimSourceUrl = claim.source_url || null;
    const normalizedClaimSourceUrl = normalizeEvidenceUrl(claimSourceUrl);
    const claimDomain = extractDomain(normalizedClaimSourceUrl || claimSourceUrl);
    const source =
      (normalizedClaimSourceUrl ? byUrl.get(normalizedClaimSourceUrl) : undefined) ||
      (claimSourceUrl ? byUrl.get(claimSourceUrl) : undefined) ||
      (claimDomain ? byDomain.get(claimDomain) : undefined);

    const policySnapshot = {
      acquisition_mode: source?.acquisition_mode || 'UNCLASSIFIED',
      llm_ingestion_allowed: source?.llm_ingestion_allowed || 'UNCLASSIFIED',
      is_deep_scrape_allowed: source?.is_deep_scrape_allowed ?? null,
      block_reason: source?.block_reason || null,
      retrieved_at: source?.retrieved_at || claim.retrieved_at || null,
      checked_at: claim.checked_at || claim.retrieved_at || null,
      volatility: claim.volatility || null,
      recheck_by: claim.recheck_by || null,
    };

    return {
      item_id: itemId,
      context_id: contextId,
      claim_type: type,
      value_json: {
        text: claim.text,
        source_type: claim.source_type || null,
        claim_type: claim.claim_type || null,
        vendor_phrase: claim.vendor_phrase || claim.text,
        kind: claim.claim_kind || detectClaimKind(claim.text, claim.claim_type || 'opinion'),
        comparison_basis_source_url: claim.comparison_basis_source_url || null,
        retrieved_at: claim.retrieved_at || null,
        checked_at: claim.checked_at || claim.retrieved_at || null,
        source_urls: claim.source_urls || (claim.source_url ? [claim.source_url] : []),
        verification_method: claim.verification_method || null,
        scope: claim.scope || null,
        volatility: claim.volatility || null,
        recheck_by: claim.recheck_by || null,
      },
      source_url: claimSourceUrl,
      source_domain: source?.domain || claimDomain || null,
      policy_snapshot: claimSourceUrl ? policySnapshot : null,
      confidence: deriveClaimConfidence(claim, source),
      intent: 'editorial_intelligence',
      extracted_at: claim.retrieved_at || undefined,
    };
  };

  return [...pros.map((claim) => toRow(claim, 'pro')), ...cons.map((claim) => toRow(claim, 'con'))];
}
