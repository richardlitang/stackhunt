/**
 * Supabase Client Configuration
 *
 * Two clients:
 * 1. `supabase` - Public client (anon key) for frontend queries
 * 2. `supabaseAdmin` - Service role client for Hunter Agent & admin operations
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

// Environment variables
// In Astro/Vite: use import.meta.env, in Node scripts: use process.env
const supabaseUrl =
  (typeof import.meta.env !== 'undefined' ? import.meta.env.SUPABASE_URL : null) ||
  process.env.SUPABASE_URL;
const supabaseAnonKey =
  (typeof import.meta.env !== 'undefined' ? import.meta.env.SUPABASE_ANON_KEY : null) ||
  process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey =
  (typeof import.meta.env !== 'undefined' ? import.meta.env.SUPABASE_SERVICE_ROLE_KEY : null) ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('Missing SUPABASE_URL environment variable');
}

if (!supabaseAnonKey) {
  throw new Error('Missing SUPABASE_ANON_KEY environment variable');
}

/**
 * Public Supabase client
 * Used for: Frontend queries, public data fetching
 * RLS: Enforced (anon role)
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

/**
 * Admin Supabase client
 * Used for: Hunter Agent, admin operations, bypassing RLS
 * RLS: Bypassed (service_role)
 *
 * WARNING: Only use server-side, never expose to client
 */
export const supabaseAdmin = supabaseServiceKey
  ? createClient<Database>(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;

/**
 * Get admin client with validation
 * Throws if service key not configured
 */
export function getAdminClient() {
  if (!supabaseAdmin) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured - admin operations unavailable');
  }
  return supabaseAdmin;
}

// ============================================================================
// QUERY HELPERS
// V2: Updated to use `items` table (backward-compat views exist for `tools`)
// ============================================================================

/**
 * Fetch a single item by slug with all related data
 * @param slug - Item slug
 * @param reviewLimit - Max reviews to fetch (default 10 for performance)
 */
export async function getItemBySlug(slug: string, reviewLimit = 10) {
  const { data, error } = await supabase
    .from('items')
    .select(
      `
      *,
      item_category_links(
        relevance_score,
        category:categories(*)
      ),
      affiliate_offers(*),
      reviews!inner(
        *,
        context:contexts(*)
      )
    `
    )
    .eq('slug', slug)
    .order('score', { foreignTable: 'reviews', ascending: false })
    .limit(reviewLimit, { foreignTable: 'reviews' })
    .maybeSingle();

  if (error) throw error;
  return attachPrimaryCategory(data);
}

/** @deprecated Use getItemBySlug instead */
export const getToolBySlug = getItemBySlug;

/**
 * Fetch a context/list page by slug with ranked items
 */
export async function getContextBySlug(slug: string) {
  const { data, error } = await supabase
    .from('contexts')
    .select(
      `
      *,
      category:categories!contexts_category_id_fkey(*),
      function_category:categories!contexts_function_category_id_fkey(*),
      audience_category:categories!contexts_audience_category_id_fkey(*),
      platform_category:categories!contexts_platform_category_id_fkey(*),
      primary_item:items!contexts_primary_item_id_fkey(
        *,
        item_category_links(
          relevance_score,
          category:categories(*)
        )
      ),
      reviews(
        *,
        item:items(
          *,
          item_category_links(
            relevance_score,
            category:categories(*)
          ),
          affiliate_offers(*)
        )
      )
    `
    )
    .eq('slug', slug)
    .order('score', { foreignTable: 'reviews', ascending: false })
    .maybeSingle();

  if (error) throw error;
  if (!data) return data;
  if (data.primary_item) {
    data.primary_item = attachPrimaryCategory(data.primary_item);
  }
  if (Array.isArray(data.reviews)) {
    data.reviews = data.reviews.map((review: any) => ({
      ...review,
      item: review.item ? attachPrimaryCategory(review.item) : review.item,
    }));
  }
  return data;
}

/**
 * Fetch all items for a category
 */
export async function getItemsByCategory(categorySlug: string) {
  const { data: category, error: categoryError } = await supabase
    .from('categories')
    .select('id, name, slug, icon')
    .eq('slug', categorySlug)
    .maybeSingle();

  if (categoryError) throw categoryError;
  if (!category) return [];

  const { data, error } = await supabase
    .from('item_category_links')
    .select(
      `
      relevance_score,
      item:items(
        *,
        item_category_links(
          relevance_score,
          category:categories(*)
        )
      )
    `
    )
    .eq('category_id', category.id)
    .order('relevance_score', { ascending: false });

  if (error) throw error;
  return (data || [])
    .map((link) => (link as any).item)
    .filter(Boolean)
    .map((item: any) => attachPrimaryCategory(item));
}

/** @deprecated Use getItemsByCategory instead */
export const getToolsByCategory = getItemsByCategory;

/**
 * Fetch featured items for homepage
 * Falls back to top-rated items if no featured exist
 */
export async function getFeaturedItems(limit = 12) {
  // First try featured items
  const { data: featured, error: featuredError } = await supabase
    .from('items')
    .select(
      `
      id, name, slug, logo_url, short_description, avg_score, pricing_type, verdict, base_score,
      item_category_links(
        relevance_score,
        category:categories(name, slug)
      )
    `
    )
    .eq('is_featured', true)
    .order('avg_score', { ascending: false })
    .limit(limit);

  if (featuredError) throw featuredError;

  // If we have featured items, return them
  if (featured && featured.length > 0) {
    return featured.map((item: any) => attachPrimaryCategory(item));
  }

  // Fallback: get top-rated items (by avg_score, then by created_at)
  const { data: topRated, error: topRatedError } = await supabase
    .from('items')
    .select(
      `
      id, name, slug, logo_url, short_description, avg_score, pricing_type, verdict, base_score,
      item_category_links(
        relevance_score,
        category:categories(name, slug)
      )
    `
    )
    .order('avg_score', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (topRatedError) throw topRatedError;
  return (topRated || []).map((item: any) => attachPrimaryCategory(item));
}

/** @deprecated Use getFeaturedItems instead */
export const getFeaturedTools = getFeaturedItems;

function attachPrimaryCategory<T extends Record<string, any>>(item: T | null): T | null {
  if (!item) return item;
  const links = Array.isArray(item.item_category_links) ? item.item_category_links : [];
  const primary = links
    .slice()
    .sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0))[0];
  const category = primary?.category || null;
  return {
    ...item,
    category,
    category_id: category?.id || null,
  };
}

/**
 * Fetch featured contexts/lists for homepage
 * Falls back to contexts with most tools if no featured items exist
 */
export async function getFeaturedContexts(limit = 8) {
  // First try featured contexts
  const { data: featured, error: featuredError } = await supabase
    .from('contexts')
    .select(
      `
      id, title, slug, tool_count,
      category:categories!contexts_category_id_fkey(name, slug, icon)
    `
    )
    .eq('is_featured', true)
    .gt('tool_count', 0)
    .not('slug', 'is', null)
    .order('tool_count', { ascending: false })
    .limit(limit);

  if (featuredError) throw featuredError;

  // If we have featured contexts, return them
  if (featured && featured.length > 0) {
    return featured;
  }

  // Fallback: get contexts with most tools
  const { data: topContexts, error: topContextsError } = await supabase
    .from('contexts')
    .select(
      `
      id, title, slug, tool_count,
      category:categories!contexts_category_id_fkey(name, slug, icon)
    `
    )
    .gt('tool_count', 0)
    .not('slug', 'is', null)
    .order('tool_count', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (topContextsError) throw topContextsError;
  return topContexts;
}

/**
 * Fetch all categories with counts
 */
export async function getCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('display_order', { ascending: true });

  if (error) throw error;
  return data;
}

/**
 * Fetch contexts for a category
 */
export async function getContextsByCategory(categorySlug: string) {
  const { data, error } = await supabase
    .from('contexts')
    .select(
      `
      *,
      category:categories!contexts_category_id_fkey!inner(*)
    `
    )
    .eq('category.slug', categorySlug)
    .order('tool_count', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Get "Spiderweb" - all contexts an item appears in
 */
export async function getItemContexts(itemId: string, limit = 50) {
  const { data, error } = await supabase
    .from('reviews')
    .select(
      `
      score,
      context:contexts(id, title, slug, tool_count)
    `
    )
    .eq('item_id', itemId)
    .order('score', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

/** @deprecated Use getItemContexts instead */
export const getToolContexts = getItemContexts;

/**
 * Fuzzy text search (fallback when no embedding)
 */
export async function searchItemsByText(query: string, limit = 10) {
  const { data, error } = await supabase
    .from('items')
    .select('id, name, slug, short_description, logo_url, avg_score, verdict')
    .ilike('name', `%${query}%`)
    .limit(limit);

  if (error) throw error;
  return data;
}

/** @deprecated Use searchItemsByText instead */
export const searchToolsByText = searchItemsByText;

/**
 * Get all item slugs for static generation
 */
export async function getAllItemSlugs() {
  const { data, error } = await supabase.from('items').select('slug');

  if (error) throw error;
  return data?.map((i) => i.slug) || [];
}

/** @deprecated Use getAllItemSlugs instead */
export const getAllToolSlugs = getAllItemSlugs;

/**
 * Get item slugs by type (for singular routing)
 */
export async function getItemSlugsByType(type: 'tool' | 'gear') {
  const { data, error } = await supabase.from('items').select('slug').eq('type', type);

  if (error) throw error;
  return data?.map((i) => i.slug) || [];
}

/** @deprecated Use getItemSlugsByType instead */
export const getToolSlugsByType = getItemSlugsByType;

/**
 * Fetch a single item by slug and type
 */
export async function getItemBySlugAndType(slug: string, type: 'tool' | 'gear') {
  const { data, error } = await supabase
    .from('items')
    .select(
      `
      *,
      item_category_links(
        relevance_score,
        category:categories(*)
      ),
      affiliate_offers(*),
      reviews(
        *,
        context:contexts(*)
      )
    `
    )
    .eq('slug', slug)
    .eq('type', type)
    .maybeSingle();

  if (error) throw error;
  return attachPrimaryCategory(data);
}

/** @deprecated Use getItemBySlugAndType instead */
export const getToolBySlugAndType = getItemBySlugAndType;

/**
 * Get all context slugs for static generation
 */
export async function getAllContextSlugs() {
  const { data, error } = await supabase.from('contexts').select('slug');

  if (error) throw error;
  return data?.map((c) => c.slug) || [];
}

/**
 * Get all category slugs for static generation
 */
export async function getAllCategorySlugs() {
  const { data, error } = await supabase.from('categories').select('slug');

  if (error) throw error;
  return data?.map((c) => c.slug) || [];
}

/**
 * Get Knowledge Graph tags for an item
 */
export async function getItemTags(itemId: string) {
  const { data, error } = await supabase
    .from('item_category_links')
    .select(
      `
      category:categories(id, name, slug, type)
    `
    )
    .eq('item_id', itemId);

  if (error) throw error;

  const result = {
    functions: [] as { id: string; name: string; slug: string }[],
    audiences: [] as { id: string; name: string; slug: string }[],
    platforms: [] as { id: string; name: string; slug: string }[],
  };

  for (const link of data || []) {
    const cat = (link as any)?.category as {
      id: string;
      name: string;
      slug: string;
      type: string;
    } | null;
    if (!cat) continue;

    const tag = { id: cat.id, name: cat.name, slug: cat.slug };
    if (cat.type === 'function') result.functions.push(tag);
    else if (cat.type === 'audience') result.audiences.push(tag);
    else if (cat.type === 'platform') result.platforms.push(tag);
  }

  return result;
}

/** @deprecated Use getItemTags instead */
export const getToolTags = getItemTags;

/**
 * Get categories by type (for Knowledge Graph)
 */
export async function getCategoriesByType(type: 'function' | 'audience' | 'platform') {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, slug, description')
    .eq('type', type)
    .order('name');

  if (error) throw error;
  return data || [];
}

/**
 * Get a prompt template by key
 */
export async function getPrompt(
  key: string
): Promise<{ template: string; variables: unknown[] } | null> {
  const { data, error } = await supabase.rpc('get_prompt', { p_key: key });

  if (error || !data || data.length === 0) {
    console.warn(`Prompt "${key}" not found, using fallback`);
    return null;
  }

  return data[0];
}

// ============================================================================
// V2: NEW QUERY HELPERS
// ============================================================================

/**
 * Get item with its competitors loaded
 */
export async function getItemWithCompetitors(slug: string) {
  const { data: item, error } = await supabase
    .from('items')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error) throw error;
  if (!item) return null;

  // Load competitors if they exist in metadata
  const competitorSlugs = (item.metadata as any)?.competitors || [];
  if (competitorSlugs.length === 0) {
    return { ...item, competitors: [] };
  }

  const { data: competitors } = await supabase
    .from('items')
    .select('id, name, slug, logo_url, short_description, avg_score, verdict, base_score')
    .in('slug', competitorSlugs);

  return { ...item, competitors: competitors || [] };
}

/**
 * Get items that need freshness check (stale data)
 */
export async function getStaleItems(olderThanDays = 30, limit = 50) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

  const { data, error } = await supabase
    .from('items')
    .select('id, name, slug, last_major_update, updated_at')
    .or(`last_major_update.is.null,last_major_update.lt.${cutoffDate.toISOString()}`)
    .order('updated_at', { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data;
}

/**
 * Get items by base_score range (for quality filtering)
 */
export async function getItemsByQuality(minScore: number, maxScore = 100, limit = 50) {
  const { data, error } = await supabase
    .from('items')
    .select('id, name, slug, logo_url, short_description, base_score, avg_score, verdict')
    .gte('base_score', minScore)
    .lte('base_score', maxScore)
    .order('base_score', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

/**
 * Search items with specs filter (e.g., find all items with SSO)
 */
export async function searchItemsBySpecs(specFilter: Record<string, unknown>, limit = 50) {
  const { data, error } = await supabase
    .from('items')
    .select('id, name, slug, logo_url, short_description, specs, avg_score')
    .contains('specs', specFilter)
    .order('avg_score', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

/**
 * Get items for comparison (used by /compare page)
 */
export async function getItemsForComparison(slugs: string[]) {
  const { data, error } = await supabase
    .from('items')
    .select(
      `
      *,
      affiliate_offers(*)
    `
    )
    .in('slug', slugs);

  if (error) throw error;

  // Sort to match input order
  const slugOrder = new Map(slugs.map((s, i) => [s, i]));
  return (data || []).sort((a, b) => (slugOrder.get(a.slug) || 0) - (slugOrder.get(b.slug) || 0));
}

/**
 * Get category by slug with its items
 */
export async function getCategoryBySlug(slug: string) {
  const { data: category, error: categoryError } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (categoryError) throw categoryError;
  if (!category) return null;

  // Get items in this category (via item_category_links for Knowledge Graph)
  const { data: items, error: itemsError } = await supabase
    .from('item_category_links')
    .select(
      `
      relevance_score,
      item:items(
        id, name, slug, logo_url, short_description,
        avg_score, review_count, pricing_type, type
      )
    `
    )
    .eq('category_id', category.id)
    .order('relevance_score', { ascending: false });

  if (itemsError) throw itemsError;

  return {
    ...category,
    items: items?.map((link) => link.item).filter(Boolean) || [],
  };
}
