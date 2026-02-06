/**
 * Hybrid Search for Tool Alternatives
 *
 * Uses semantic similarity + category guardrails to find relevant alternatives.
 * Prevents "semantic smudge" where HubSpot is recommended as a Slack alternative.
 *
 * V4: Added sub_category matching and pricing model constraints to prevent
 * "apples to oranges" comparisons (e.g., Twilio API vs Slack SaaS app).
 *
 * V5: Cross-category fallback now requires high similarity (≥0.70) to prevent
 * showing completely unrelated tools (e.g., Vercel as related to Claude).
 * Prefer showing no results over showing irrelevant tools.
 *
 * @module analysis/alternatives
 */

import { supabase } from '../supabase';
import type { Item, ToolSpecs } from '@/types/database';

export interface AlternativeResult {
  id: string;
  slug: string;
  name: string;
  base_score: number | null;
  similarity: number;
  sub_category?: string | null;
  pricing_model?: string | null;
}

export interface AlternativesResponse {
  type: 'alternatives' | 'related';
  items: AlternativeResult[];
}

/**
 * Check if two pricing models are compatible for comparison.
 * Usage-based tools (Twilio, OpenAI) shouldn't be primary alternatives
 * for per-seat tools (Slack, Notion) unless similarity is very high.
 */
function arePricingModelsCompatible(
  sourceModel: string | null | undefined,
  targetModel: string | null | undefined,
  similarity: number
): boolean {
  // If no pricing data, allow (be permissive)
  if (!sourceModel || !targetModel) return true;

  // Group 1: Subscription-based (predictable costs)
  const subscriptionModels = ['per_seat', 'flat', 'tiered', 'hybrid', 'free', 'freemium'];

  // Group 2: Variable/consumption-based (unpredictable costs)
  const consumptionModels = ['usage_based', 'ad_spend', 'per_unit'];

  const sourceIsSubscription = subscriptionModels.includes(sourceModel);
  const targetIsSubscription = subscriptionModels.includes(targetModel);
  const sourceIsConsumption = consumptionModels.includes(sourceModel);
  const targetIsConsumption = consumptionModels.includes(targetModel);

  // Same group: always compatible
  if (
    (sourceIsSubscription && targetIsSubscription) ||
    (sourceIsConsumption && targetIsConsumption)
  ) {
    return true;
  }

  // Different groups: only allow if similarity is very high (>0.85)
  // This catches the case where tools truly serve the same purpose despite different pricing
  return similarity >= 0.85;
}

/**
 * Get alternatives for a tool using hybrid search
 *
 * Strategy:
 * 1. First, try strict filter by primary_function + sub_category (same category AND type)
 * 2. If insufficient results, try primary_function only (same category)
 * 3. If no results, fallback to pure semantic search (show "related" instead)
 *    - Uses much higher threshold (≥0.70) to avoid showing unrelated tools
 *    - Example: prevents showing Vercel (deployment) as related to Claude (AI assistant)
 * 4. Apply pricing model compatibility filter throughout
 *
 * @param tool - The source tool to find alternatives for
 * @param options - Search options
 * @param options.matchThreshold - Minimum similarity for same-category (default 0.45)
 * @param options.matchCount - Number of results to return (default 6)
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

  // Get the tool's taxonomy and pricing model
  const toolSpecs = tool.specs as ToolSpecs | undefined;
  const primaryFunction = toolSpecs?.taxonomy?.primary_function;
  const subCategory = toolSpecs?.taxonomy?.sub_category;
  const sourcePricingModel = toolSpecs?.pricing_data?.model;

  // Fetch more candidates than needed, then filter by pricing model
  const fetchCount = matchCount * 2;

  // Helper to filter and rank results
  const processResults = (
    data: AlternativeResult[],
    preferSubCategory: boolean
  ): AlternativeResult[] => {
    // First, filter by pricing model compatibility
    // Note: similarity may come as string from Postgres, ensure numeric comparison
    const compatible = data.filter((item) =>
      arePricingModelsCompatible(sourcePricingModel, item.pricing_model, Number(item.similarity))
    );

    if (preferSubCategory && subCategory) {
      // Sort: sub_category matches first, then by similarity
      return compatible
        .sort((a, b) => {
          const aMatchesSub = a.sub_category === subCategory ? 1 : 0;
          const bMatchesSub = b.sub_category === subCategory ? 1 : 0;
          if (aMatchesSub !== bMatchesSub) return bMatchesSub - aMatchesSub;
          return Number(b.similarity) - Number(a.similarity);
        })
        .slice(0, matchCount);
    }

    return compatible.slice(0, matchCount);
  };

  // Step 1: Try strict category filter (the "Safety Net")
  if (primaryFunction && tool.embedding) {
    const { data, error } = await supabase.rpc('match_items_v2', {
      query_embedding: tool.embedding,
      match_threshold: matchThreshold,
      match_count: fetchCount,
      filter_category: primaryFunction,
      filter_sub_category: subCategory, // V4: Also try sub_category filter
      exclude_item_id: tool.id,
    });

    if (!error && data && data.length > 0) {
      const processed = processResults(data as AlternativeResult[], true);
      if (processed.length > 0) {
        return {
          type: 'alternatives',
          items: processed,
        };
      }
    }

    // Step 1b: Try with just primary_function (no sub_category filter)
    const { data: broadData, error: broadError } = await supabase.rpc('match_items', {
      query_embedding: tool.embedding,
      match_threshold: matchThreshold,
      match_count: fetchCount,
      filter_category: primaryFunction,
      exclude_item_id: tool.id,
    });

    if (!broadError && broadData && broadData.length > 0) {
      const processed = processResults(broadData as AlternativeResult[], true);
      if (processed.length > 0) {
        return {
          type: 'alternatives',
          items: processed,
        };
      }
    }
  }

  // Step 2: Fallback to pure semantic search (no category filter)
  // Show "Related Tools" instead of "Alternatives" to set expectations
  // IMPORTANT: Use much higher threshold for cross-category to avoid showing
  // completely unrelated tools (e.g., Vercel for Claude, Notion for Slack)
  if (tool.embedding) {
    const crossCategoryThreshold = Math.max(matchThreshold, 0.7); // At least 0.70 for cross-category
    const { data, error } = await supabase.rpc('match_items', {
      query_embedding: tool.embedding,
      match_threshold: crossCategoryThreshold,
      match_count: fetchCount,
      filter_category: null, // Remove the guardrail
      exclude_item_id: tool.id,
    });

    if (!error && data && data.length > 0) {
      const processed = processResults(data as AlternativeResult[], false);
      if (processed.length > 0) {
        return {
          type: 'related',
          items: processed,
        };
      }
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
