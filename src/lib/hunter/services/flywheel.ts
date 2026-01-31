/**
 * Flywheel Architecture Orchestrator
 *
 * Implements two-phase content generation for CONTEXT keywords:
 * - Phase 1: Instant content from existing tools
 * - Phase 2: Discovery and expansion via search
 *
 * Solves: Cold Start Problem + Staleness Problem
 */

import type { Database } from '../../../types/database';
import type { SupabaseClient } from '@supabase/supabase-js';
import { discoverTools, filterNewTools } from './scout.js';

export interface FlywheelContext {
  title: string;
  slug: string;
  category?: string;
  audience?: string;
}

export interface FlywheelResult {
  context_id: string;
  phase1: {
    existing_tools_count: number;
    reviews_created: number;
  };
  phase2: {
    discovered_tools_count: number;
    new_hunts_queued: number;
    queued_tool_ids: string[];
  };
}

/**
 * Execute Flywheel Architecture for a CONTEXT keyword
 */
export async function executeFlywheel(
  context: FlywheelContext,
  searchQuery: string,
  supabase: SupabaseClient<Database>
): Promise<FlywheelResult> {
  console.log('[Flywheel] Starting for:', context.title);

  // Create or get context
  const context_id = await createOrGetContext(context, supabase);

  // === PHASE 1: INSTANT CONTENT (use existing tools) ===
  console.log('[Flywheel] Phase 1: Finding existing tools...');
  const existingTools = await findExistingTools(context, supabase);

  console.log(`[Flywheel] Found ${existingTools.length} existing tools`);

  // Generate contextual reviews for existing tools
  // Note: This happens automatically when context is created
  // Reviews will reference this context_id

  // === PHASE 2: EXPANSION (discover new tools) ===
  console.log('[Flywheel] Phase 2: Discovering new tools...');

  // Use Scout to discover tools from search
  const searchResults = await performDiscoverySearch(searchQuery);
  const discovered = await discoverTools(searchQuery, searchResults);

  console.log(`[Flywheel] Discovered ${discovered.length} potential tools`);

  // Filter out existing tools (Guardrail 1: Domain-based deduplication)
  const newTools = await filterNewTools(discovered, supabase);

  console.log(`[Flywheel] ${newTools.length} new tools to hunt`);

  // Queue hunts for new tools (max 5)
  const queuedToolIds: string[] = [];
  const toolsToQueue = newTools.slice(0, 5);

  for (const tool of toolsToQueue) {
    const queueId = await queueDiscoveryHunt(
      tool.name,
      tool.domain,
      context_id,
      supabase
    );
    if (queueId) {
      queuedToolIds.push(queueId);
    }
  }

  // Update context with queued_tool_ids
  await supabase
    .from('contexts')
    .update({
      queued_tool_ids: queuedToolIds,
      discovery_query: searchQuery,
      last_discovery_at: new Date().toISOString(),
    })
    .eq('id', context_id);

  return {
    context_id,
    phase1: {
      existing_tools_count: existingTools.length,
      reviews_created: existingTools.length,
    },
    phase2: {
      discovered_tools_count: discovered.length,
      new_hunts_queued: queuedToolIds.length,
      queued_tool_ids: queuedToolIds,
    },
  };
}

/**
 * Create or get existing context
 */
async function createOrGetContext(
  context: FlywheelContext,
  supabase: SupabaseClient<Database>
): Promise<string> {
  const { data: existing } = await supabase
    .from('contexts')
    .select('id')
    .eq('slug', context.slug)
    .single();

  if (existing) {
    console.log('[Flywheel] Context already exists:', context.slug);
    return existing.id;
  }

  const { data: created, error } = await supabase
    .from('contexts')
    .insert({
      title: context.title,
      slug: context.slug,
    })
    .select('id')
    .single();

  if (error || !created) {
    throw new Error(`Failed to create context: ${error?.message}`);
  }

  console.log('[Flywheel] Created context:', context.slug);
  return created.id;
}

/**
 * Find existing tools that match context criteria
 */
async function findExistingTools(
  context: FlywheelContext,
  supabase: SupabaseClient<Database>
): Promise<any[]> {
  // Build query based on context
  let query = supabase.from('items').select('id, name, slug, specs');

  // Filter by category if provided
  if (context.category) {
    // Query categories junction table
    const { data: categoryItems } = await supabase
      .from('item_categories')
      .select('item_id')
      .eq('category_name', context.category);

    if (categoryItems && categoryItems.length > 0) {
      const itemIds = categoryItems.map(ci => ci.item_id);
      query = query.in('id', itemIds);
    }
  }

  const { data: tools } = await query.limit(20);

  return tools || [];
}

/**
 * Perform discovery search using Serper
 */
async function performDiscoverySearch(query: string): Promise<any[]> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) {
    console.warn('[Flywheel] SERPER_API_KEY not configured, skipping discovery');
    return [];
  }

  try {
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: query,
        num: 20,
      }),
    });

    if (!response.ok) {
      throw new Error(`Serper API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.organic || [];
  } catch (error) {
    console.error('[Flywheel] Discovery search failed:', error);
    return [];
  }
}

/**
 * Queue a discovery hunt for a new tool
 */
async function queueDiscoveryHunt(
  toolName: string,
  domain: string,
  contextId: string,
  supabase: SupabaseClient<Database>
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('hunt_queue')
      .insert({
        tool_name: toolName,
        hunt_type: 'full',
        priority: 60, // Higher priority for discovery hunts
        source: 'suggestion',
        status: 'pending',
        context_id: contextId,
        is_discovery_hunt: true,
      })
      .select('id')
      .single();

    if (error || !data) {
      console.error(`[Flywheel] Failed to queue ${toolName}:`, error);
      return null;
    }

    console.log(`[Flywheel] Queued discovery hunt: ${toolName} (${domain})`);
    return data.id;
  } catch (error) {
    console.error(`[Flywheel] Error queuing ${toolName}:`, error);
    return null;
  }
}
