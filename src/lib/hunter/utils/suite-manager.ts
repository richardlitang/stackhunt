/**
 * Suite Manager - Handle parent suite stubs
 *
 * Ensures parent suites exist in the database before linking bundled tools.
 * Creates "stub" items with minimal data that can be filled in later.
 *
 * @module hunter/utils/suite-manager
 */

import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Ensures a parent suite exists in the database
 *
 * If the suite doesn't exist, creates a "stub" (placeholder) with:
 * - name and slug
 * - status = 'draft' (so it doesn't appear in search until hunted)
 * - minimal specs
 *
 * @param supabase - Supabase client
 * @param suiteName - Name of the suite (e.g., "Google Workspace")
 * @returns Suite ID (UUID)
 */
export async function ensureParentSuite(
  supabase: SupabaseClient,
  suiteName: string
): Promise<string> {
  // 1. Try to find existing suite
  const { data: existing, error: findError } = await supabase
    .from('items')
    .select('id')
    .eq('name', suiteName)
    .maybeSingle();

  if (findError) {
    throw new Error(`Failed to query for suite "${suiteName}": ${findError.message}`);
  }

  // 2. If found, return its ID
  if (existing) {
    return existing.id;
  }

  // 3. If not found, create a stub
  const slug = suiteName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  const { data: newSuite, error: insertError } = await supabase
    .from('items')
    .insert({
      name: suiteName,
      slug,
      short_description: `${suiteName} - Suite pricing placeholder`,
      type: 'tool',
      pricing_type: 'paid',
      avg_score: 0,
      review_count: 0,
      is_featured: false,
      is_verified: false,
      // Minimal specs - will be filled in when suite is hunted
      specs: {
        taxonomy: {
          primary_function: 'Suite',
        },
      },
    })
    .select('id')
    .single();

  if (insertError) {
    throw new Error(`Failed to create suite stub for "${suiteName}": ${insertError.message}`);
  }

  return newSuite.id;
}

/**
 * Get all sibling tools for a given item (tools with the same parent)
 *
 * @param supabase - Supabase client
 * @param itemId - Current item ID
 * @returns Array of sibling items (excludes current item)
 */
export async function getSiblings(
  supabase: SupabaseClient,
  itemId: string
): Promise<Array<{ id: string; name: string; slug: string }>> {
  // 1. Get the parent_id of the current item
  const { data: currentItem, error: currentError } = await supabase
    .from('items')
    .select('parent_id')
    .eq('id', itemId)
    .single();

  if (currentError || !currentItem?.parent_id) {
    return []; // No parent = no siblings
  }

  // 2. Find all items with the same parent (excluding current item)
  const { data: siblings, error: siblingsError } = await supabase
    .from('items')
    .select('id, name, slug')
    .eq('parent_id', currentItem.parent_id)
    .neq('id', itemId);

  if (siblingsError) {
    console.error('Failed to fetch siblings:', siblingsError);
    return [];
  }

  return siblings || [];
}
