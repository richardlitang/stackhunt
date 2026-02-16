#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { classifySourceType } from '../src/lib/hunter/utils.js';

dotenv.config();

type SourceRow = Record<string, unknown> & {
  url?: string;
  domain?: string;
  type?: string;
  source_type?: string;
};

type ReviewRow = {
  id: string;
  status: string;
  sources: unknown;
  item: {
    name: string;
    website: string | null;
  } | null;
};

const KNOWN_SOURCE_TYPES = new Set([
  'official',
  'editorial',
  'community',
  'docs',
  'support',
  'legal',
  'directory',
]);

function getArgValue(name: string): string | null {
  const match = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (!match) return null;
  return match.split('=').slice(1).join('=').trim();
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function normalizeDomain(domain?: string | null): string | null {
  if (!domain) return null;
  const next = domain.trim().toLowerCase().replace(/^www\./, '');
  return next || null;
}

function getDomainFromUrl(url?: string | null): string | null {
  if (!url) return null;
  try {
    return normalizeDomain(new URL(url).hostname);
  } catch {
    return null;
  }
}

function normalizeType(value?: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  return normalized || null;
}

function shouldBackfillType(value: string | null): boolean {
  if (!value) return true;
  return !KNOWN_SOURCE_TYPES.has(value);
}

function toSources(raw: unknown): SourceRow[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((entry): entry is SourceRow => Boolean(entry && typeof entry === 'object'));
}

function maybePatchSources(
  sources: SourceRow[],
  toolWebsite: string | null
): { changed: boolean; sources: SourceRow[]; changedEntries: number } {
  let changed = false;
  let changedEntries = 0;

  const next = sources.map((source) => {
    let entryChanged = false;
    const patched: SourceRow = { ...source };

    const sourceUrl = typeof source.url === 'string' ? source.url : null;
    const existingSourceType = normalizeType(source.source_type);
    const existingType = normalizeType(source.type);

    if (sourceUrl && (shouldBackfillType(existingSourceType) || shouldBackfillType(existingType))) {
      const inferred = classifySourceType(sourceUrl, toolWebsite || undefined);
      if (existingSourceType !== inferred) {
        patched.source_type = inferred;
        entryChanged = true;
      }
      if (shouldBackfillType(existingType) || existingType !== inferred) {
        patched.type = inferred;
        entryChanged = true;
      }
    }

    const currentDomain = normalizeDomain(typeof source.domain === 'string' ? source.domain : null);
    if (!currentDomain && sourceUrl) {
      const inferredDomain = getDomainFromUrl(sourceUrl);
      if (inferredDomain) {
        patched.domain = inferredDomain;
        entryChanged = true;
      }
    } else if (currentDomain && currentDomain !== source.domain) {
      patched.domain = currentDomain;
      entryChanged = true;
    }

    if (entryChanged) {
      changed = true;
      changedEntries += 1;
    }

    return patched;
  });

  return { changed, sources: next, changedEntries };
}

async function main() {
  const limitArg = Number(getArgValue('limit') || 500);
  const apply = hasFlag('apply');
  const includePublished = hasFlag('include-published');
  const limit = Number.isFinite(limitArg) ? Math.max(1, Math.min(limitArg, 5000)) : 500;

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRole) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRole);
  const statuses = includePublished ? ['draft', 'review', 'published'] : ['draft', 'review'];

  const { data, error } = await supabase
    .from('reviews')
    .select(
      `
      id,
      status,
      sources,
      item:items(name, website)
    `
    )
    .in('status', statuses)
    .not('sources', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error(`Query failed: ${error.message}`);
    process.exit(1);
  }

  const rows = (data || []) as ReviewRow[];
  let changedReviews = 0;
  let changedSourceEntries = 0;
  let skippedNoArray = 0;
  const updates: Array<{ id: string; sources: SourceRow[]; toolName: string }> = [];

  for (const row of rows) {
    if (!Array.isArray(row.sources)) {
      skippedNoArray += 1;
      continue;
    }

    const sourceRows = toSources(row.sources);
    const patched = maybePatchSources(sourceRows, row.item?.website || null);
    if (!patched.changed) continue;

    changedReviews += 1;
    changedSourceEntries += patched.changedEntries;
    updates.push({
      id: row.id,
      sources: patched.sources,
      toolName: row.item?.name || 'unknown',
    });
  }

  console.log('\nReview Source Type Backfill');
  console.log(`Mode: ${apply ? 'APPLY' : 'DRY RUN'}`);
  console.log(`Statuses: ${statuses.join(', ')}`);
  console.log(`Rows scanned: ${rows.length}`);
  console.log(`Rows skipped (non-array sources): ${skippedNoArray}`);
  console.log(`Rows needing updates: ${changedReviews}`);
  console.log(`Source entries to patch: ${changedSourceEntries}`);

  if (!apply) {
    if (updates.length > 0) {
      console.log('\nSample rows to patch:');
      updates.slice(0, 10).forEach((u, i) => {
        console.log(`  ${i + 1}. ${u.toolName} (${u.id})`);
      });
      console.log('\nRun with --apply to persist changes.');
    }
    return;
  }

  let applied = 0;
  for (const update of updates) {
    const { error: updateError } = await supabase
      .from('reviews')
      .update({ sources: update.sources })
      .eq('id', update.id);

    if (updateError) {
      console.error(`Failed to update review ${update.id}: ${updateError.message}`);
      continue;
    }
    applied += 1;
  }

  console.log(`\nApplied updates: ${applied}/${updates.length}`);
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
