/**
 * Context Validator - Rule-Based Context Matching
 *
 * Deterministic validation logic for matching tools to contexts.
 * Replaces LLM-based context-matcher with fast, predictable rules.
 *
 * @module hunter/validation/context-validator
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

export interface ContextMatch {
  context_id: string;
  context_title: string;
  relevance_score: number; // 0-100
  reasoning: string;
}

export interface ContextMatchResult {
  tool_id: string;
  origin_context_id: string;
  matches: ContextMatch[];
  reviews_created: number;
}

/**
 * Validate which contexts a tool should appear in using rule-based logic
 */
export async function validateContextRelevance(
  toolId: string,
  originContextId: string,
  supabase: SupabaseClient<Database>
): Promise<ContextMatch[]> {
  // Get tool information
  const { data: tool } = await supabase
    .from('items')
    .select('id, name, slug, website, specs')
    .eq('id', toolId)
    .maybeSingle();

  if (!tool) {
    console.warn('[ContextValidator] Tool not found:', toolId);
    return [];
  }

  // Get tool's categories
  const { data: toolCategories } = await supabase
    .from('item_categories')
    .select('category_name, category_slug, category_type')
    .eq('item_id', toolId);

  // Get all contexts (exclude origin)
  const { data: contexts } = await supabase
    .from('contexts')
    .select('id, title, slug')
    .neq('id', originContextId)
    .limit(100);

  if (!contexts || contexts.length === 0) {
    console.log('[ContextValidator] No other contexts exist yet');
    return [];
  }

  const matches: ContextMatch[] = [];

  for (const context of contexts) {
    const score = calculateRelevanceScore(
      tool,
      toolCategories || [],
      context
    );

    if (score >= 70) {
      matches.push({
        context_id: context.id,
        context_title: context.title,
        relevance_score: score,
        reasoning: generateReasoning(tool, context, score),
      });
    }
  }

  console.log(`[ContextValidator] Found ${matches.length} relevant contexts for ${tool.name}`);
  return matches;
}

/**
 * Calculate relevance score using deterministic rules
 */
function calculateRelevanceScore(
  tool: any,
  categories: any[],
  context: any
): number {
  let score = 0;
  const toolName = tool.name.toLowerCase();
  const contextTitle = context.title.toLowerCase();
  const contextSlug = context.slug.toLowerCase();

  // Rule 1: Category/function match (40 points)
  const primaryCategory = categories.find(c => c.category_type === 'function');
  if (primaryCategory) {
    const categoryName = primaryCategory.category_name.toLowerCase();
    if (contextTitle.includes(categoryName) || contextSlug.includes(categoryName)) {
      score += 40;
    }
  }

  // Rule 2: Tool name in context (perfect match - 90 points)
  if (contextTitle.includes(toolName)) {
    score += 90;
  }

  // Rule 3: "Alternatives" context match (30 points)
  if (contextTitle.includes('alternatives') || contextTitle.includes('competitors')) {
    // Check if any of tool's competitors are in the context title
    const competitors = tool.specs?.competitive?.main_alternatives || [];
    for (const competitor of competitors) {
      if (contextTitle.includes(competitor.toLowerCase())) {
        score += 30;
        break;
      }
    }
  }

  // Rule 4: Audience overlap (20 points)
  const audiences = categories.filter(c => c.category_type === 'audience');
  for (const audience of audiences) {
    const audienceName = audience.category_name.toLowerCase();
    if (contextTitle.includes(audienceName) || contextSlug.includes(audienceName)) {
      score += 20;
      break;
    }
  }

  // Rule 5: Platform overlap (15 points)
  const platforms = categories.filter(c => c.category_type === 'platform');
  for (const platform of platforms) {
    const platformName = platform.category_name.toLowerCase();
    if (contextTitle.includes(platformName) || contextSlug.includes(platformName)) {
      score += 15;
      break;
    }
  }

  // Rule 6: Keyword proximity (10 points)
  const keywords = extractKeywords(tool.specs?.tagline || tool.specs?.description || '');
  let keywordMatches = 0;
  for (const keyword of keywords) {
    if (contextTitle.includes(keyword.toLowerCase())) {
      keywordMatches++;
    }
  }
  if (keywordMatches >= 2) {
    score += 10;
  }

  // Cap at 100
  return Math.min(score, 100);
}

/**
 * Generate human-readable reasoning for the match
 */
function generateReasoning(tool: any, context: any, score: number): string {
  const toolName = tool.name;
  const contextTitle = context.title;

  if (score >= 90) {
    return `${toolName} is directly mentioned or highly relevant to "${contextTitle}"`;
  }
  if (score >= 80) {
    return `${toolName} is a strong match for "${contextTitle}" based on category and features`;
  }
  if (score >= 70) {
    return `${toolName} is relevant to "${contextTitle}" based on overlapping categories`;
  }
  return `${toolName} has moderate relevance to "${contextTitle}"`;
}

/**
 * Extract keywords from description text
 */
function extractKeywords(text: string): string[] {
  if (!text) return [];

  // Common stopwords to ignore
  const stopwords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'for', 'with', 'to', 'of', 'in', 'on', 'at']);

  return text
    .toLowerCase()
    .split(/\W+/)
    .filter(word => word.length > 3 && !stopwords.has(word))
    .slice(0, 10);
}

/**
 * Create contextual reviews for a tool in matched contexts
 */
async function createContextualReviews(
  toolId: string,
  matches: ContextMatch[],
  supabase: SupabaseClient<Database>
): Promise<number> {
  let reviewsCreated = 0;

  for (const match of matches) {
    try {
      // Check if review already exists
      const { data: existing } = await supabase
        .from('reviews')
        .select('id')
        .eq('item_id', toolId)
        .eq('context_id', match.context_id)
        .maybeSingle();

      if (existing) {
        console.log(`[ContextValidator] Review already exists for context: ${match.context_title}`);
        continue;
      }

      // Create placeholder review
      const { error } = await (supabase as any).from('reviews').insert({
        item_id: toolId,
        context_id: match.context_id,
        status: 'draft',
        score: match.relevance_score,
        summary_markdown: `**Auto-assigned via cross-pollination**\n\nRelevance: ${match.relevance_score}%\n\n${match.reasoning}\n\n*This review needs proper content generation.*`,
      });

      if (error) {
        console.error(`[ContextValidator] Failed to create review for ${match.context_title}:`, error.message);
      } else {
        console.log(`[ContextValidator] ✅ Created review for "${match.context_title}" (relevance: ${match.relevance_score}%)`);
        reviewsCreated++;
      }
    } catch (error: any) {
      console.error(`[ContextValidator] Error creating review:`, error.message);
    }
  }

  return reviewsCreated;
}

/**
 * Main orchestrator: Assign tool to relevant contexts after hunt completes
 */
export async function assignToRelevantContexts(
  toolId: string,
  originContextId: string,
  supabase: SupabaseClient<Database>
): Promise<ContextMatchResult> {
  console.log(`[ContextValidator] 🎯 Validating context relevance for tool ${toolId}...`);

  // Validate context relevance (rule-based, no LLM)
  const matches = await validateContextRelevance(toolId, originContextId, supabase);

  if (matches.length === 0) {
    console.log('[ContextValidator] No additional contexts matched (threshold: 70%)');
    return {
      tool_id: toolId,
      origin_context_id: originContextId,
      matches: [],
      reviews_created: 0,
    };
  }

  // Create content_ideas entries for flywheel tools
  const { data: tool } = await supabase
    .from('items')
    .select('name, slug')
    .eq('id', toolId)
    .maybeSingle();

  if (tool) {
    for (const match of matches) {
      const keyword = `${tool.name} ${match.context_title}`;

      const { data: existing } = await supabase
        .from('content_ideas')
        .select('id')
        .eq('keyword', keyword)
        .maybeSingle();

      if (!existing) {
        await supabase.from('content_ideas').insert({
          keyword,
          tool_name: tool.name,
          context_query: match.context_title,
          source: 'flywheel_cross_pollination',
          status: 'pending',
          search_volume: null,
          roi_score: match.relevance_score,
        });

        console.log(`[ContextValidator] 📝 Created content_idea: "${keyword}"`);
      }
    }
  }

  // Create reviews in matched contexts
  const reviewsCreated = await createContextualReviews(toolId, matches, supabase);

  console.log(`[ContextValidator] ✅ Validation complete: ${reviewsCreated}/${matches.length} reviews created`);

  return {
    tool_id: toolId,
    origin_context_id: originContextId,
    matches,
    reviews_created: reviewsCreated,
  };
}
