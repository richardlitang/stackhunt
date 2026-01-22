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
const supabaseUrl = import.meta.env.SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

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
// ============================================================================

/**
 * Fetch a single tool by slug with all related data
 */
export async function getToolBySlug(slug: string) {
  const { data, error } = await supabase
    .from('tools')
    .select(`
      *,
      category:categories(*),
      affiliate_offers(*),
      reviews(
        *,
        context:contexts(*)
      )
    `)
    .eq('slug', slug)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Fetch a context/list page by slug with ranked tools
 */
export async function getContextBySlug(slug: string) {
  const { data, error } = await supabase
    .from('contexts')
    .select(`
      *,
      category:categories!contexts_category_id_fkey(*),
      function_category:categories!contexts_function_category_id_fkey(*),
      audience_category:categories!contexts_audience_category_id_fkey(*),
      platform_category:categories!contexts_platform_category_id_fkey(*),
      primary_tool:tools!contexts_primary_tool_id_fkey(*),
      reviews(
        *,
        tool:tools(
          *,
          affiliate_offers(*)
        )
      )
    `)
    .eq('slug', slug)
    .order('score', { foreignTable: 'reviews', ascending: false })
    .single();

  if (error) throw error;
  return data;
}

/**
 * Fetch all tools for a category
 */
export async function getToolsByCategory(categorySlug: string) {
  const { data, error } = await supabase
    .from('tools')
    .select(`
      *,
      category:categories!inner(*)
    `)
    .eq('category.slug', categorySlug)
    .order('avg_score', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Fetch featured tools for homepage
 * Falls back to top-rated tools if no featured items exist
 */
export async function getFeaturedTools(limit = 12) {
  // First try featured tools
  const { data: featured, error: featuredError } = await supabase
    .from('tools')
    .select(`
      id, name, slug, logo_url, short_description, avg_score, pricing_type,
      category:categories(name, slug)
    `)
    .eq('is_featured', true)
    .order('avg_score', { ascending: false })
    .limit(limit);

  if (featuredError) throw featuredError;

  // If we have featured tools, return them
  if (featured && featured.length > 0) {
    return featured;
  }

  // Fallback: get top-rated tools (by avg_score, then by created_at)
  const { data: topRated, error: topRatedError } = await supabase
    .from('tools')
    .select(`
      id, name, slug, logo_url, short_description, avg_score, pricing_type,
      category:categories(name, slug)
    `)
    .order('avg_score', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (topRatedError) throw topRatedError;
  return topRated;
}

/**
 * Fetch featured contexts/lists for homepage
 * Falls back to contexts with most tools if no featured items exist
 */
export async function getFeaturedContexts(limit = 8) {
  // First try featured contexts
  const { data: featured, error: featuredError } = await supabase
    .from('contexts')
    .select(`
      id, title, slug, tool_count,
      category:categories!contexts_category_id_fkey(name, slug, icon)
    `)
    .eq('is_featured', true)
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
    .select(`
      id, title, slug, tool_count,
      category:categories!contexts_category_id_fkey(name, slug, icon)
    `)
    .gt('tool_count', 0)
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
    .select(`
      *,
      category:categories!contexts_category_id_fkey!inner(*)
    `)
    .eq('category.slug', categorySlug)
    .order('tool_count', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Get "Spiderweb" - all contexts a tool appears in
 */
export async function getToolContexts(toolId: string) {
  const { data, error } = await supabase
    .from('reviews')
    .select(`
      score,
      context:contexts(id, title, slug, tool_count)
    `)
    .eq('tool_id', toolId)
    .order('score', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Fuzzy text search (fallback when no embedding)
 */
export async function searchToolsByText(query: string, limit = 10) {
  const { data, error } = await supabase
    .from('tools')
    .select('id, name, slug, short_description, logo_url, avg_score')
    .ilike('name', `%${query}%`)
    .limit(limit);

  if (error) throw error;
  return data;
}

/**
 * Get all tool slugs for static generation
 */
export async function getAllToolSlugs() {
  const { data, error } = await supabase
    .from('tools')
    .select('slug');

  if (error) throw error;
  return data?.map(t => t.slug) || [];
}

/**
 * Get all context slugs for static generation
 */
export async function getAllContextSlugs() {
  const { data, error } = await supabase
    .from('contexts')
    .select('slug');

  if (error) throw error;
  return data?.map(c => c.slug) || [];
}

/**
 * Get all category slugs for static generation
 */
export async function getAllCategorySlugs() {
  const { data, error } = await supabase
    .from('categories')
    .select('slug');

  if (error) throw error;
  return data?.map(c => c.slug) || [];
}

/**
 * Get Knowledge Graph tags for a tool
 */
export async function getToolTags(toolId: string) {
  const { data, error } = await supabase
    .from('tool_category_links')
    .select(`
      category:categories(id, name, slug, type)
    `)
    .eq('tool_id', toolId);

  if (error) throw error;

  const result = {
    functions: [] as { id: string; name: string; slug: string }[],
    audiences: [] as { id: string; name: string; slug: string }[],
    platforms: [] as { id: string; name: string; slug: string }[],
  };

  for (const link of data || []) {
    const cat = link.category as { id: string; name: string; slug: string; type: string } | null;
    if (!cat) continue;

    const tag = { id: cat.id, name: cat.name, slug: cat.slug };
    if (cat.type === 'function') result.functions.push(tag);
    else if (cat.type === 'audience') result.audiences.push(tag);
    else if (cat.type === 'platform') result.platforms.push(tag);
  }

  return result;
}

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
export async function getPrompt(key: string): Promise<{ template: string; variables: unknown[] } | null> {
  const { data, error } = await supabase.rpc('get_prompt', { p_key: key });

  if (error || !data || data.length === 0) {
    console.warn(`Prompt "${key}" not found, using fallback`);
    return null;
  }

  return data[0];
}
