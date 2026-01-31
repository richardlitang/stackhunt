/**
 * Hybrid Search for Tool Alternatives
 *
 * Uses semantic similarity + category guardrails to find relevant alternatives.
 * Prevents "semantic smudge" where HubSpot is recommended as a Slack alternative.
 *
 * @module analysis/alternatives
 */

import { supabase } from '../supabase';
import type { Item } from '@/types/database';

export interface AlternativeResult {
  id: string;
  slug: string;
  name: string;
  base_score: number | null;
  similarity: number;
}

export interface AlternativesResponse {
  type: 'alternatives' | 'related';
  items: AlternativeResult[];
}

/**
 * Get alternatives for a tool using hybrid search
 *
 * Strategy:
 * 1. First, try strict filter by primary_function (same category only)
 * 2. If no results, fallback to pure semantic search (show "related" instead)
 *
 * @param tool - The source tool to find alternatives for
 * @param options - Search options
 * @returns Alternatives or related tools with type indicator
 */
export async function getAlternatives(
  tool: Item,
  options: {
    matchThreshold?: number;
    matchCount?: number;
  } = {}
): Promise<AlternativesResponse> {
  const { matchThreshold = 0.45, matchCount = 6 } = options;

  // Get the tool's primary function from taxonomy
  const primaryFunction = tool.specs?.taxonomy?.primary_function;

  // Step 1: Try strict category filter (the "Safety Net")
  if (primaryFunction && tool.embedding) {
    const { data, error } = await supabase.rpc('match_items', {
      query_embedding: tool.embedding,
      match_threshold: matchThreshold,
      match_count: matchCount,
      filter_category: primaryFunction,
      exclude_item_id: tool.id,
    });

    if (!error && data && data.length > 0) {
      return {
        type: 'alternatives',
        items: data as AlternativeResult[],
      };
    }
  }

  // Step 2: Fallback to pure semantic search (no category filter)
  // Show "Related Tools" instead of "Alternatives" to set expectations
  if (tool.embedding) {
    const { data, error } = await supabase.rpc('match_items', {
      query_embedding: tool.embedding,
      match_threshold: matchThreshold,
      match_count: matchCount,
      filter_category: null, // Remove the guardrail
      exclude_item_id: tool.id,
    });

    if (!error && data && data.length > 0) {
      return {
        type: 'related',
        items: data as AlternativeResult[],
      };
    }
  }

  // No results at all
  return {
    type: 'related',
    items: [],
  };
}

/**
 * Get alternatives by slug (convenience wrapper)
 */
export async function getAlternativesBySlug(
  slug: string,
  options?: { matchThreshold?: number; matchCount?: number }
): Promise<AlternativesResponse> {
  const { data: tool } = await supabase
    .from('items')
    .select('id, slug, name, embedding, specs')
    .eq('slug', slug)
    .maybeSingle();

  if (!tool) {
    return { type: 'related', items: [] };
  }

  return getAlternatives(tool as Item, options);
}
