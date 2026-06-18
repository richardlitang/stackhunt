import { slugify } from './utils';
import { normalizeCategory } from '../config/taxonomy';
import type { KnowledgeCard } from '../knowledge-card';
import type { HunterAnalysis, RawSource } from './types';

const FACT_PACK_SCHEMA_VERSION = 1;

type SourceIntent = RawSource['intent_tags'][number];

type Citation = {
  url: string;
  retrieved_at?: string;
  published_at?: string;
  source_type?: string;
  domain?: string;
  confidence?: 'high' | 'medium' | 'low';
};

type EvidenceMap = Record<string, Citation[]>;

export interface PersistItemFactPackParams {
  supabase: any;
  itemId: string;
  itemName: string;
  itemSlug: string;
  categorySlug?: string | null;
  knowledgeCard: KnowledgeCard;
  analysis?: HunterAnalysis | null;
  specs?: Record<string, unknown> | null;
  rawSources: RawSource[];
  checkedAt?: string;
}

export interface PersistItemFactPackResult {
  schemaId: string;
  version: number;
  coverageRatio: number;
  requiredCoverageRatio: number;
  conflictsCount: number;
}

export function deriveFactPackSchemaId(params: {
  categorySlug?: string | null;
  knowledgeCard: KnowledgeCard;
}): string {
  const taxonomyPrimary = params.knowledgeCard.smp_taxonomy?.primary_function;
  const normalizedTaxonomy = taxonomyPrimary ? normalizeCategory(taxonomyPrimary) : null;
  const slug =
    toSafeSlug(params.categorySlug) ||
    toSafeSlug(taxonomyPrimary) ||
    toSafeSlug(normalizedTaxonomy) ||
    'general';
  return `${slug.replace(/-/g, '_')}_v1`;
}

export async function persistItemFactPack(
  params: PersistItemFactPackParams
): Promise<PersistItemFactPackResult> {
  const schemaId = deriveFactPackSchemaId({
    categorySlug: params.categorySlug,
    knowledgeCard: params.knowledgeCard,
  });
  const checkedAt = params.checkedAt || new Date().toISOString();

  const facts = buildFacts({
    itemName: params.itemName,
    itemSlug: params.itemSlug,
    categorySlug: params.categorySlug,
    knowledgeCard: params.knowledgeCard,
    analysis: params.analysis,
    specs: params.specs,
  });
  const evidence = buildEvidence(params.rawSources);
  const quality = buildQuality({
    facts,
    evidence,
    rawSources: params.rawSources,
    checkedAt,
    specs: params.specs,
  });

  const { error } = await params.supabase.from('item_fact_packs').upsert(
    {
      item_id: params.itemId,
      schema_id: schemaId,
      version: FACT_PACK_SCHEMA_VERSION,
      facts_json: facts,
      evidence_json: evidence,
      quality_json: quality,
      checked_at: checkedAt,
    },
    { onConflict: 'item_id,schema_id,version' }
  );

  if (error) {
    throw new Error(`Failed to persist item fact pack: ${error.message}`);
  }

  return {
    schemaId,
    version: FACT_PACK_SCHEMA_VERSION,
    coverageRatio: Number(quality.coverage?.ratio || 0),
    requiredCoverageRatio: Number(quality.coverage?.required_ratio || 0),
    conflictsCount: Number(quality.conflicts_count || 0),
  };
}

function buildFacts(params: {
  itemName: string;
  itemSlug: string;
  categorySlug?: string | null;
  knowledgeCard: KnowledgeCard;
  analysis?: HunterAnalysis | null;
  specs?: Record<string, unknown> | null;
}) {
  const pricing = params.knowledgeCard.smp_pricing || null;
  const constraints = params.knowledgeCard.constraints || null;
  const canonical = extractCanonical(params.specs);
  const categorySpecific = extractObject(params.specs, 'categorySpecificData');
  const specifics = extractObject(params.specs, 'specifics');

  return {
    identity: {
      name: params.itemName,
      slug: params.itemSlug,
      official_name: params.knowledgeCard.official_name || null,
      website_url: params.knowledgeCard.website_url || null,
      category_slug: params.categorySlug || null,
    },
    pricing: {
      model: pricing?.model || params.knowledgeCard.pricing?.model || null,
      has_free_tier:
        typeof pricing?.plans !== 'undefined'
          ? pricing.plans.some((plan) => (plan.price_monthly || 0) === 0)
          : (params.knowledgeCard.pricing?.has_free_tier ?? null),
      has_free_trial: params.knowledgeCard.pricing?.has_free_trial ?? null,
      trial_days: params.knowledgeCard.pricing?.trial_days ?? null,
      billing_cycles: pricing?.billing_cycles || [],
      currency: pricing?.currency || null,
      starting_price: params.knowledgeCard.pricing?.starting_price || null,
      min_seats: pricing?.min_seats ?? null,
      implementation_fee: pricing?.implementation_fee ?? null,
      annual_discount_pct: pricing?.annual_discount_pct ?? null,
      discounts_available: pricing?.discounts_available || [],
      pricing_page_url: pricing?.pricing_page_url || null,
      plans: Array.isArray(pricing?.plans)
        ? pricing.plans.map((plan) => ({
            id: plan.id,
            name: plan.name,
            price_monthly: plan.price_monthly ?? null,
            price_annual: plan.price_annual ?? null,
            target_audience: plan.target_audience ?? null,
            scaling_unit: plan.scaling_unit ?? null,
          }))
        : [],
    },
    taxonomy: params.knowledgeCard.smp_taxonomy || null,
    portability: params.knowledgeCard.smp_portability || null,
    setup_complexity: params.knowledgeCard.setup_complexity || null,
    security: params.knowledgeCard.security || null,
    integrations: params.knowledgeCard.integrations || null,
    support: params.knowledgeCard.support || null,
    constraints: constraints,
    category_specific: categorySpecific,
    specifics,
    canonical: canonical,
    graph_tags: params.analysis?.graphTags || null,
    extraction_meta: {
      extraction_date: params.knowledgeCard.meta?.extraction_date || null,
      data_quality: params.knowledgeCard.meta?.data_quality || null,
      active_development: params.knowledgeCard.meta?.active_development ?? null,
    },
  };
}

function buildEvidence(rawSources: RawSource[]) {
  const byIntent = groupCitationsByIntent(rawSources);
  const official = byIntent.official;

  const field_evidence: EvidenceMap = {
    'identity.website_url': withFallback(byIntent.reviews, official),
    'pricing.model': withFallback(byIntent.pricing, official),
    'pricing.starting_price': withFallback(byIntent.pricing, official),
    'pricing.min_seats': withFallback(unionCitations(byIntent.pricing, byIntent.limits), official),
    'pricing.pricing_page_url': withFallback(byIntent.pricing, official),
    'taxonomy.primary_function': withFallback(byIntent.reviews, official),
    'portability.export_formats': withFallback(byIntent.portability, official),
    'security.sso_available': withFallback(byIntent.security, official),
    'integrations.has_api': withFallback(byIntent.integrations, official),
    'constraints.hard_limits': withFallback(byIntent.limits, official),
  };

  return {
    field_evidence,
    source_catalog: dedupeCitations(rawSources.map((source) => toCitation(source))),
  };
}

function buildQuality(params: {
  facts: Record<string, unknown>;
  evidence: Record<string, unknown>;
  rawSources: RawSource[];
  checkedAt: string;
  specs?: Record<string, unknown> | null;
}) {
  const requiredPaths = [
    'identity.website_url',
    'pricing.model',
    'taxonomy.primary_function',
    'integrations.has_api',
    'portability.has_data_export',
  ];
  const allPaths = [
    ...requiredPaths,
    'pricing.starting_price',
    'pricing.min_seats',
    'pricing.pricing_page_url',
    'security.sso_available',
    'constraints.hard_limits',
    'setup_complexity.estimated_setup_time',
  ];

  const requiredPresent = requiredPaths.filter((path) => hasValueAtPath(params.facts, path)).length;
  const totalPresent = allPaths.filter((path) => hasValueAtPath(params.facts, path)).length;
  const coverageRatio = allPaths.length > 0 ? totalPresent / allPaths.length : 0;
  const requiredCoverageRatio =
    requiredPaths.length > 0 ? requiredPresent / requiredPaths.length : 0;

  const staleThresholdDays = {
    pricing: 90,
    limits: 90,
    security: 180,
    portability: 180,
    integrations: 180,
    reviews: 270,
  };

  const freshness: Record<string, { age_days: number | null; is_stale: boolean }> = {};
  for (const intent of Object.keys(staleThresholdDays) as Array<keyof typeof staleThresholdDays>) {
    const ageDays = mostRecentAgeDays(params.rawSources, intent);
    freshness[intent] = {
      age_days: ageDays,
      is_stale: ageDays === null ? true : ageDays > staleThresholdDays[intent],
    };
  }

  const canonicalQuality = extractCanonicalQuality(params.specs);
  const scoutConflicts =
    Array.isArray((params.facts as any)?.quality?.conflicts) &&
    (params.facts as any).quality.conflicts
      ? (params.facts as any).quality.conflicts.length
      : 0;
  const conflictsCount = Number(canonicalQuality.conflicts_count || 0) + scoutConflicts;

  return {
    checked_at: params.checkedAt,
    coverage: {
      ratio: round3(coverageRatio),
      populated_fields: totalPresent,
      total_fields: allPaths.length,
      required_ratio: round3(requiredCoverageRatio),
      required_populated_fields: requiredPresent,
      required_total_fields: requiredPaths.length,
      missing_required_fields: requiredPaths.filter((path) => !hasValueAtPath(params.facts, path)),
    },
    conflicts_count: conflictsCount,
    pricing_conflicts_count: Number(canonicalQuality.pricing_conflicts_count || 0),
    freshness,
    evidence_count: Array.isArray((params.evidence as any).source_catalog)
      ? (params.evidence as any).source_catalog.length
      : 0,
  };
}

function mostRecentAgeDays(rawSources: RawSource[], intent: SourceIntent): number | null {
  const nowMs = Date.now();
  const timestamps = rawSources
    .filter((source) => Array.isArray(source.intent_tags) && source.intent_tags.includes(intent))
    .map((source) => source.retrieved_at)
    .filter((value): value is string => typeof value === 'string')
    .map((value) => Date.parse(value))
    .filter((ms) => Number.isFinite(ms));
  if (timestamps.length === 0) return null;
  const mostRecent = Math.max(...timestamps);
  return Math.max(0, Math.floor((nowMs - mostRecent) / (1000 * 60 * 60 * 24)));
}

function groupCitationsByIntent(rawSources: RawSource[]) {
  const map = {
    pricing: [] as Citation[],
    security: [] as Citation[],
    portability: [] as Citation[],
    integrations: [] as Citation[],
    limits: [] as Citation[],
    reviews: [] as Citation[],
    official: [] as Citation[],
  };

  for (const source of rawSources) {
    const citation = toCitation(source);
    if (['official', 'docs', 'support', 'legal'].includes(source.source_type)) {
      map.official.push(citation);
    }
    for (const intent of source.intent_tags || []) {
      if (intent in map) {
        (map as Record<string, Citation[]>)[intent].push(citation);
      }
    }
  }

  for (const key of Object.keys(map) as Array<keyof typeof map>) {
    map[key] = dedupeCitations(map[key]).slice(0, 5);
  }

  return map;
}

function toCitation(source: RawSource): Citation {
  return {
    url: source.url,
    retrieved_at: source.retrieved_at,
    published_at: source.published_at,
    source_type: source.source_type,
    domain: source.domain,
    confidence: ['official', 'docs', 'support', 'legal'].includes(source.source_type)
      ? 'high'
      : source.source_type === 'editorial'
        ? 'medium'
        : 'low',
  };
}

function dedupeCitations(citations: Citation[]): Citation[] {
  const byUrl = new Map<string, Citation>();
  for (const citation of citations) {
    if (!citation.url) continue;
    if (!byUrl.has(citation.url)) {
      byUrl.set(citation.url, citation);
    }
  }
  return Array.from(byUrl.values());
}

function withFallback(primary: Citation[], fallback: Citation[]): Citation[] {
  if (primary.length > 0) return primary.slice(0, 5);
  return fallback.slice(0, 3);
}

function unionCitations(a: Citation[], b: Citation[]): Citation[] {
  return dedupeCitations([...a, ...b]);
}

function hasValueAtPath(value: unknown, dottedPath: string): boolean {
  const parts = dottedPath.split('.');
  let cursor: any = value;
  for (const part of parts) {
    if (!cursor || typeof cursor !== 'object' || !(part in cursor)) {
      return false;
    }
    cursor = cursor[part];
  }
  if (cursor === null || typeof cursor === 'undefined') return false;
  if (typeof cursor === 'string') return cursor.trim().length > 0;
  if (Array.isArray(cursor)) return cursor.length > 0;
  if (typeof cursor === 'object') return Object.keys(cursor).length > 0;
  return true;
}

function extractObject(specs: Record<string, unknown> | null | undefined, key: string) {
  if (!specs || typeof specs !== 'object') return null;
  const value = specs[key];
  if (!value || typeof value !== 'object') return null;
  return value;
}

function extractCanonical(specs: Record<string, unknown> | null | undefined) {
  const canonical = extractObject(specs, 'canonical');
  if (!canonical) return null;
  const planEntities = Array.isArray((canonical as any).pricing_plan_entities)
    ? (canonical as any).pricing_plan_entities
    : [];
  return {
    latest_models_comparison: Array.isArray((canonical as any).latest_models_comparison)
      ? (canonical as any).latest_models_comparison
      : [],
    model_inventory_raw: Array.isArray((canonical as any).model_inventory_raw)
      ? (canonical as any).model_inventory_raw
      : [],
    quick_checks: Array.isArray((canonical as any).quick_checks)
      ? (canonical as any).quick_checks
      : [],
    team_it_checks: Array.isArray((canonical as any).team_it_checks)
      ? (canonical as any).team_it_checks
      : [],
    setup_tracks:
      (canonical as any).setup_tracks && typeof (canonical as any).setup_tracks === 'object'
        ? (canonical as any).setup_tracks
        : null,
    pricing_plan_entities: planEntities,
  };
}

function extractCanonicalQuality(specs: Record<string, unknown> | null | undefined) {
  const canonical = extractObject(specs, 'canonical');
  const quality = canonical ? (canonical as any).quality : null;
  if (!quality || typeof quality !== 'object') return {};
  return quality as Record<string, unknown>;
}

function toSafeSlug(value?: string | null): string | null {
  if (!value || typeof value !== 'string') return null;
  const normalized = slugify(value);
  return normalized || null;
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}
