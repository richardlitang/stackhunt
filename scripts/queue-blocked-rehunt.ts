#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { getAvailableSourceSlots, parseQueueCap } from './lib/queue-guardrails.js';

dotenv.config();

type PopularityTier = 'popular' | 'standard' | 'below_standard';

type SourceRow = {
  url?: string;
  domain?: string;
  type?: string;
  source_type?: string;
};

type ReviewRow = {
  id: string;
  item_id: string;
  status: string;
  score: number | null;
  quality: string | null;
  sources: unknown;
  updated_at: string;
  item: {
    id: string;
    name: string;
    metadata: Record<string, unknown> | null;
    specs: Record<string, unknown> | null;
  } | null;
};

const AUTHORITATIVE_SOURCE_TYPES = new Set(['official', 'docs', 'support', 'legal']);
const PROFILE_RULES: Record<
  PopularityTier,
  { minAuthoritativeSources: number; minAuthoritativeDomains: number }
> = {
  popular: { minAuthoritativeSources: 2, minAuthoritativeDomains: 1 },
  standard: { minAuthoritativeSources: 3, minAuthoritativeDomains: 2 },
  below_standard: { minAuthoritativeSources: 4, minAuthoritativeDomains: 2 },
};

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function getArgValue(name: string): string | null {
  const found = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (!found) return null;
  return found.split('=').slice(1).join('=').trim();
}

function toStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((value): value is string => typeof value === 'string');
}

function toSources(raw: unknown): SourceRow[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((value): value is SourceRow => Boolean(value && typeof value === 'object'));
}

function normalizeDomain(domain?: string): string | null {
  if (!domain) return null;
  const normalized = domain.trim().toLowerCase().replace(/^www\./, '');
  return normalized || null;
}

function extractDomainFromUrl(url?: string): string | null {
  if (!url) return null;
  try {
    return normalizeDomain(new URL(url).hostname);
  } catch {
    return null;
  }
}

function resolvePopularityTier(metadata?: Record<string, unknown> | null): PopularityTier {
  const explicit =
    metadata?.popularity_tier ||
    (metadata?.meta && typeof metadata.meta === 'object'
      ? (metadata.meta as Record<string, unknown>).popularity_tier
      : null);
  const normalized = typeof explicit === 'string' ? explicit.trim().toLowerCase() : '';
  if (normalized === 'popular') return 'popular';
  if (normalized === 'below_standard') return 'below_standard';
  return 'standard';
}

function getNoindexReasons(specs?: Record<string, unknown> | null): string[] {
  const canonical = (specs?.canonical as Record<string, unknown> | undefined) || {};
  const quality = (canonical.quality as Record<string, unknown> | undefined) || {};
  return toStringArray(quality.noindex_reasons).filter((reason) => reason !== 'draft_review');
}

function getGateScore(specs?: Record<string, unknown> | null): number {
  const canonical = (specs?.canonical as Record<string, unknown> | undefined) || {};
  const quality = (canonical.quality as Record<string, unknown> | undefined) || {};
  return Number(quality.score || 0) || 0;
}

function getRequiredSectionsComplete(specs?: Record<string, unknown> | null): boolean {
  const canonical = (specs?.canonical as Record<string, unknown> | undefined) || {};
  const quality = (canonical.quality as Record<string, unknown> | undefined) || {};
  return Boolean(quality.required_sections_complete);
}

function inferEvidenceBlockers(review: ReviewRow, popularityTier: PopularityTier): string[] {
  const sources = toSources(review.sources);
  const authoritativeDomains = new Set<string>();
  let authoritativeSources = 0;
  const gateScore = getGateScore(review.item?.specs || null);
  const requiredSectionsComplete = getRequiredSectionsComplete(review.item?.specs || null);

  for (const source of sources) {
    const sourceType = (source.source_type || source.type || '').toLowerCase();
    if (!AUTHORITATIVE_SOURCE_TYPES.has(sourceType)) continue;
    authoritativeSources += 1;
    const domain = normalizeDomain(source.domain) || extractDomainFromUrl(source.url);
    if (domain) authoritativeDomains.add(domain);
  }

  const rules = PROFILE_RULES[popularityTier];
  const blockers: string[] = [];
  const meetsAuthoritativeSourceRule =
    authoritativeSources >= rules.minAuthoritativeSources ||
    (popularityTier === 'popular' &&
      authoritativeSources >= 1 &&
      requiredSectionsComplete &&
      gateScore >= 110);
  if (!meetsAuthoritativeSourceRule) {
    blockers.push('authoritative_sources_low');
  }
  const meetsAuthoritativeDomainRule =
    authoritativeDomains.size >= rules.minAuthoritativeDomains ||
    (popularityTier === 'standard' &&
      authoritativeDomains.size >= 1 &&
      authoritativeSources >= 4 &&
      requiredSectionsComplete &&
      gateScore >= 110);
  if (!meetsAuthoritativeDomainRule) {
    blockers.push('authoritative_domains_low');
  }
  return blockers;
}

async function main() {
  const apply = hasFlag('apply');
  const limitArg = Number(getArgValue('limit') || 20);
  const priorityArg = Number(getArgValue('priority') || 92);
  const limit = Number.isFinite(limitArg) ? Math.max(1, Math.min(limitArg, 200)) : 20;
  const priority = Number.isFinite(priorityArg) ? Math.max(0, Math.min(priorityArg, 100)) : 92;
  const reasonFilterRaw =
    getArgValue('reasons') ||
    'missing_required_sections,mvup_incomplete,authoritative_sources_low,authoritative_domains_low';
  const reasonFilter = new Set(
    reasonFilterRaw
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
  );

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRole) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRole);
  const { data, error } = await supabase
    .from('reviews')
    .select(
      `
      id,
      item_id,
      status,
      score,
      quality,
      sources,
      updated_at,
      item:items(id, name, metadata, specs)
    `
    )
    .in('status', ['draft', 'review'])
    .not('item_id', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(500);

  if (error) {
    console.error(`Failed to query reviews: ${error.message}`);
    process.exit(1);
  }

  const latestByItem = new Map<string, ReviewRow>();
  for (const row of (data || []) as ReviewRow[]) {
    if (!row.item || latestByItem.has(row.item_id)) continue;
    latestByItem.set(row.item_id, row);
  }

  const candidates: Array<{ toolName: string; reasons: string[] }> = [];
  for (const row of latestByItem.values()) {
    const tier = resolvePopularityTier(row.item?.metadata || null);
    const noindexReasons = getNoindexReasons(row.item?.specs || null);
    const evidenceBlockers = inferEvidenceBlockers(row, tier);
    const combined = Array.from(new Set([...noindexReasons, ...evidenceBlockers]));
    const matched = combined.filter((reason) => reasonFilter.has(reason));
    if (matched.length === 0) continue;
    candidates.push({
      toolName: row.item?.name || row.item_id,
      reasons: matched,
    });
  }

  const selected = candidates.slice(0, limit);
  if (selected.length === 0) {
    console.log('\nBlocked Re-hunt Queue');
    console.log('No blocked latest drafts matched escalation reasons.');
    return;
  }

  const names = selected.map((c) => c.toolName);
  const { data: existing, error: existingError } = await supabase
    .from('hunt_queue')
    .select('tool_name')
    .in('status', ['pending', 'claimed', 'processing'])
    .in('tool_name', names);

  if (existingError) {
    console.error(`Failed to check queue: ${existingError.message}`);
    process.exit(1);
  }

  const existingNames = new Set(((existing || []) as Array<{ tool_name: string }>).map((row) => row.tool_name));
  const toQueue = selected.filter((row) => !existingNames.has(row.toolName));

  console.log('\nBlocked Re-hunt Queue');
  console.log(`Mode: ${apply ? 'APPLY' : 'DRY RUN'}`);
  console.log(`Matched latest blocked drafts: ${selected.length}`);
  console.log(`Already queued: ${existingNames.size}`);
  console.log(`To enqueue: ${toQueue.length}`);
  console.log(`Reason filter: ${Array.from(reasonFilter).join(', ')}`);

  if (toQueue.length > 0) {
    console.log('\nTools:');
    toQueue.forEach((entry, index) => {
      console.log(`  ${index + 1}. ${entry.toolName} (${entry.reasons.join(', ')})`);
    });
  }

  if (!apply || toQueue.length === 0) {
    if (!apply) console.log('\nRun with --apply to enqueue full re-hunts.');
    return;
  }

  const insertRows = toQueue.map((entry) => ({
    tool_name: entry.toolName,
    context_title: null,
    category_slug: null,
    priority,
    source: 'scheduled',
    hunt_type: 'full' as const,
  }));

  const sourceCap = parseQueueCap(process.env.HUNT_QUEUE_SOURCE_PENDING_CAP, 400);
  const { current, remaining } = await getAvailableSourceSlots(supabase as any, 'scheduled', sourceCap);
  if (remaining <= 0) {
    console.log(
      `\nQueue source cap reached for "scheduled" (${current}/${sourceCap}). Skipping enqueue.`
    );
    return;
  }
  if (insertRows.length > remaining) {
    console.log(
      `\nQueue guardrail trimming rows from ${insertRows.length} to ${remaining} (scheduled pending ${current}/${sourceCap}).`
    );
    insertRows.length = remaining;
  }

  const { error: insertError } = await supabase.from('hunt_queue').insert(insertRows);
  if (insertError) {
    console.error(`Failed to enqueue blocked re-hunts: ${insertError.message}`);
    process.exit(1);
  }

  console.log(`\nEnqueued ${insertRows.length} full re-hunt job(s).`);
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
