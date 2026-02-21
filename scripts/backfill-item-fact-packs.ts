#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import type { KnowledgeCard } from '../src/lib/knowledge-card.js';
import type { RawSource } from '../src/lib/hunter/types.js';
import { persistItemFactPack } from '../src/lib/hunter/fact-pack.js';

dotenv.config();

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function getArgValue(name: string): string | null {
  const match = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (!match) return null;
  return match.split('=').slice(1).join('=').trim();
}

function parseLimit(name: string, fallback: number, max: number): number {
  const raw = Number(getArgValue(name) || fallback);
  if (!Number.isFinite(raw)) return fallback;
  return Math.max(1, Math.min(max, Math.floor(raw)));
}

function normalizeDomain(url?: string | null): string {
  if (!url) return '';
  try {
    return new URL(url).hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return '';
  }
}

function inferIntentTags(url: string): RawSource['intent_tags'] {
  const lower = url.toLowerCase();
  const tags = new Set<RawSource['intent_tags'][number]>(['reviews']);
  if (/(\/pricing|\/plans|billing|price)/.test(lower)) tags.add('pricing');
  if (/(security|trust|privacy|dpa|soc2|compliance|legal)/.test(lower)) tags.add('security');
  if (/(export|import|migration|portability)/.test(lower)) tags.add('portability');
  if (/(integrations|api|webhook|zapier|make\.com|n8n)/.test(lower)) tags.add('integrations');
  if (/(limit|quota|cap|overage|seat)/.test(lower)) tags.add('limits');
  return Array.from(tags);
}

function coerceKnowledgeCard(row: any): KnowledgeCard {
  const metadata = row?.metadata && typeof row.metadata === 'object' ? row.metadata : {};
  const specs = row?.specs && typeof row.specs === 'object' ? row.specs : {};
  const pricingData = specs.pricing_data && typeof specs.pricing_data === 'object' ? specs.pricing_data : undefined;
  const extractionDate = String(metadata?.meta?.extraction_date || row.updated_at || new Date().toISOString());
  const dataQuality =
    metadata?.meta?.data_quality === 'high' ||
    metadata?.meta?.data_quality === 'medium' ||
    metadata?.meta?.data_quality === 'low'
      ? metadata.meta.data_quality
      : 'medium';

  return {
    ...(metadata as Record<string, unknown>),
    pricing:
      metadata?.pricing && typeof metadata.pricing === 'object'
        ? metadata.pricing
        : {
            model: row.pricing_type || 'paid',
            has_free_tier: false,
            has_free_trial: false,
            trial_days: null,
            starting_price: null,
            tiers: [],
          },
    meta: {
      ...(metadata?.meta && typeof metadata.meta === 'object' ? metadata.meta : {}),
      data_quality: dataQuality,
      extraction_date: extractionDate,
    },
    smp_pricing: pricingData || metadata?.smp_pricing,
    smp_taxonomy: metadata?.smp_taxonomy || specs?.taxonomy || undefined,
    smp_portability: metadata?.smp_portability || specs?.portability || undefined,
  } as KnowledgeCard;
}

function buildRawSourcesFromReviews(reviews: any[]): RawSource[] {
  const urls = new Map<string, RawSource>();

  for (const review of reviews || []) {
    const sources = Array.isArray(review?.sources) ? review.sources : [];
    for (const source of sources) {
      const url = typeof source?.url === 'string' ? source.url.trim() : '';
      if (!url || urls.has(url)) continue;
      const sourceTypeRaw = typeof source?.type === 'string' ? source.type.toLowerCase() : 'editorial';
      const sourceType: RawSource['source_type'] =
        sourceTypeRaw === 'official' ||
        sourceTypeRaw === 'docs' ||
        sourceTypeRaw === 'support' ||
        sourceTypeRaw === 'legal' ||
        sourceTypeRaw === 'community' ||
        sourceTypeRaw === 'directory'
          ? sourceTypeRaw
          : 'editorial';

      urls.set(url, {
        url,
        title: typeof source?.title === 'string' ? source.title : normalizeDomain(url),
        snippet: typeof source?.snippet === 'string' ? source.snippet : '',
        domain: typeof source?.domain === 'string' ? source.domain : normalizeDomain(url),
        source_type: sourceType,
        intent_tags: inferIntentTags(url),
        canonical_url: url,
        retrieved_at:
          typeof source?.retrieved_at === 'string'
            ? source.retrieved_at
            : typeof review?.updated_at === 'string'
              ? review.updated_at
              : new Date().toISOString(),
        published_at: typeof source?.published_at === 'string' ? source.published_at : undefined,
        policy: {
          acquisition_mode: 'SCRAPE_ALLOWED',
          llm_ingestion_allowed: 'YES',
          display_mode: 'ATTRIBUTED_EXCERPT',
          policy_version: 'backfill.v1',
        },
      });
    }
  }

  return Array.from(urls.values());
}

async function main() {
  const apply = hasFlag('apply');
  const limit = parseLimit('limit', 500, 20000);
  const pageSize = parseLimit('page-size', 100, 500);

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRole) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  const supabase = createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const rows: any[] = [];
  let from = 0;
  while (rows.length < limit) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from('items')
      .select(
        `
        id,
        name,
        slug,
        pricing_type,
        metadata,
        specs,
        updated_at,
        item_category_links(
          relevance_score,
          category:categories(slug)
        ),
        reviews(
          status,
          sources,
          created_at,
          updated_at
        )
      `
      )
      .order('updated_at', { ascending: false })
      .range(from, to)
      .limit(8, { foreignTable: 'reviews' });

    if (error) {
      throw new Error(`Failed to fetch items for backfill: ${error.message}`);
    }
    if (!data || data.length === 0) break;

    rows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  const candidates = rows.slice(0, limit);
  console.log(`\nItem Fact Pack Backfill`);
  console.log(`Mode: ${apply ? 'APPLY' : 'DRY RUN'}`);
  console.log(`Candidates: ${candidates.length}`);

  let successCount = 0;
  let skippedCount = 0;
  let failureCount = 0;

  for (const row of candidates) {
    const itemId = String(row.id || '');
    const itemSlug = String(row.slug || '').trim().toLowerCase();
    const itemName = String(row.name || '').trim();
    if (!itemId || !itemSlug || !itemName) {
      skippedCount += 1;
      continue;
    }

    const primaryCategory = Array.isArray(row.item_category_links)
      ? row.item_category_links
          .slice()
          .sort((a: any, b: any) => Number(b?.relevance_score || 0) - Number(a?.relevance_score || 0))[0]
      : null;
    const categorySlug =
      primaryCategory?.category && typeof primaryCategory.category.slug === 'string'
        ? primaryCategory.category.slug
        : null;
    const reviews = Array.isArray(row.reviews) ? row.reviews : [];
    const rawSources = buildRawSourcesFromReviews(reviews);
    const knowledgeCard = coerceKnowledgeCard(row);

    if (!apply) {
      console.log(
        `[dry-run] ${itemSlug} -> category=${categorySlug || 'none'} sources=${rawSources.length}`
      );
      successCount += 1;
      continue;
    }

    try {
      const result = await persistItemFactPack({
        supabase,
        itemId,
        itemName,
        itemSlug,
        categorySlug,
        knowledgeCard,
        analysis: null,
        specs: row.specs as Record<string, unknown>,
        rawSources,
        checkedAt: new Date().toISOString(),
      });
      console.log(
        `[apply] ${itemSlug} -> ${result.schemaId} coverage=${result.coverageRatio.toFixed(2)} required=${result.requiredCoverageRatio.toFixed(2)} conflicts=${result.conflictsCount}`
      );
      successCount += 1;
    } catch (error) {
      failureCount += 1;
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[apply] ${itemSlug} -> failed (${message})`);
    }
  }

  console.log('\nBackfill Summary');
  console.log(`Succeeded: ${successCount}`);
  console.log(`Skipped: ${skippedCount}`);
  console.log(`Failed: ${failureCount}`);
  if (!apply) {
    console.log('Run with --apply to write fact packs.');
  }
}

main().catch((error) => {
  console.error('Item fact pack backfill failed:', error);
  process.exit(1);
});
