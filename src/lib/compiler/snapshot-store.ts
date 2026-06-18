import { normalizeComparePair } from '@/lib/compiler/snapshot-helpers';
import { getAdminClient, supabase } from '@/lib/supabase';

export async function getLatestPublishedBestSnapshot(contextSlug: string) {
  const slug = String(contextSlug || '')
    .trim()
    .toLowerCase();
  if (!slug) return null;

  const { data, error } = await supabase
    .from('best_snapshots')
    .select('*')
    .eq('context_slug', slug)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getLatestDraftBestSnapshot(contextSlug: string) {
  const slug = String(contextSlug || '')
    .trim()
    .toLowerCase();
  if (!slug) return null;

  const admin = getAdminClient();
  const { data, error } = await admin
    .from('best_snapshots')
    .select('*')
    .eq('context_slug', slug)
    .eq('status', 'draft')
    .order('computed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getLatestPublishedCompareSnapshot(
  slugA: string,
  slugB: string,
  rawSpecKey?: string | null
) {
  const { toolASlug, toolBSlug } = normalizeComparePair(slugA, slugB);
  const specKey =
    typeof rawSpecKey === 'string' && rawSpecKey.trim().length > 0 ? rawSpecKey.trim() : null;

  const query = supabase
    .from('compare_snapshots')
    .select('*')
    .eq('tool_a_slug', toolASlug)
    .eq('tool_b_slug', toolBSlug)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(1);

  const { data, error } = specKey
    ? await query.eq('spec_key', specKey).maybeSingle()
    : await query.is('spec_key', null).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getLatestDraftCompareSnapshot(
  slugA: string,
  slugB: string,
  rawSpecKey?: string | null
) {
  const admin = getAdminClient();
  const { toolASlug, toolBSlug } = normalizeComparePair(slugA, slugB);
  const specKey =
    typeof rawSpecKey === 'string' && rawSpecKey.trim().length > 0 ? rawSpecKey.trim() : null;

  const query = admin
    .from('compare_snapshots')
    .select('*')
    .eq('tool_a_slug', toolASlug)
    .eq('tool_b_slug', toolBSlug)
    .eq('status', 'draft')
    .order('computed_at', { ascending: false })
    .limit(1);

  const { data, error } = specKey
    ? await query.eq('spec_key', specKey).maybeSingle()
    : await query.is('spec_key', null).maybeSingle();
  if (error) throw error;
  return data;
}
