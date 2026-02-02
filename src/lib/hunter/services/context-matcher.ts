/**
 * Context Matcher Service
 *
 * Analyzes which contexts a tool should appear in beyond its discovery context.
 * Enables cross-pollination of tools across relevant contexts.
 *
 * Example:
 * - Tool "Moz" discovered in "best seo tools for startups"
 * - Matcher identifies: "best seo tools", "ahrefs alternatives", etc.
 * - Creates reviews in all relevant contexts
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../types/database';
import { ContextMatchSchema } from '../types';

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

const CONTEXT_MATCHING_PROMPT = `You are a content strategist analyzing whether a software tool should be reviewed in various contexts.

**Tool Information:**
- Name: {{tool_name}}
- Description: {{tool_description}}
- Primary Category: {{tool_category}}
- Website: {{tool_website}}

**Available Contexts:**
{{contexts_list}}

**Your Task:**
For EACH context, determine if this tool is relevant enough to deserve a review in that context.

**Relevance Scoring:**
- 90-100: Perfect fit, essential inclusion
- 70-89: Strong fit, should be included
- 50-69: Moderate fit, could be included
- 30-49: Weak fit, probably skip
- 0-29: Poor fit, definitely skip

**Rules:**
1. Consider the tool's PRIMARY use case and category
2. A tool can be relevant to multiple contexts (e.g., Slack fits "team communication", "remote work tools", "project management")
3. Don't force matches - be selective
4. Audience-specific contexts (e.g., "for startups") should only match if tool explicitly targets that audience
5. Alternatives contexts (e.g., "Ahrefs alternatives") should match competitors/similar tools

**Output Format (JSON):**
{
  "matches": [
    {
      "context_id": "123e4567-e89b-12d3-a456-426614174000",
      "context_title": "Best SEO Tools",
      "relevance_score": 85,
      "reasoning": "Moz is a core SEO platform with rank tracking and keyword research"
    }
  ]
}

**CRITICAL:**
- Use the EXACT UUID from the context list above (not the list number!)
- Example: If context #5 has "ID: abc-123-def", use "abc-123-def" NOT "5"
- Only include contexts with relevance_score >= 70.`;

/**
 * Analyze which contexts a tool should appear in
 */
export async function analyzeContextRelevance(
  toolId: string,
  originContextId: string,
  supabase: SupabaseClient<Database>
): Promise<ContextMatch[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('[ContextMatcher] GEMINI_API_KEY not set, skipping analysis');
    return [];
  }

  // Get tool information
  const { data: tool, error: toolError } = (await supabase
    .from('items')
    .select('id, name, slug, website, specs')
    .eq('id', toolId)
    .single()) as any;

  if (toolError) {
    console.warn('[ContextMatcher] Error fetching tool:', toolError.message);
  }

  if (!tool) {
    console.warn('[ContextMatcher] Tool not found:', toolId);
    return [];
  }

  // Get all existing contexts (exclude origin context)
  const { data: contexts } = (await supabase
    .from('contexts')
    .select('id, title, slug')
    .neq('id', originContextId)
    .limit(100)) as any;

  if (!contexts || contexts.length === 0) {
    console.log('[ContextMatcher] No other contexts exist yet');
    return [];
  }

  console.log(
    `[ContextMatcher] Analyzing ${tool.name} against ${contexts.length} contexts...`
  );

  // Build Gemini prompt
  const contextsList = contexts
    .map(
      (c: any, i: number) =>
        `${i + 1}. ID: ${c.id}
   Title: "${c.title}"
   Slug: ${c.slug}`
    )
    .join('\n\n');

  // Get tool category
  const { data: categories } = (await supabase
    .from('item_categories')
    .select('category_name')
    .eq('item_id', toolId)
    .limit(1)) as any;

  const toolCategory = categories?.[0]?.category_name || 'Unknown';
  const toolDescription =
    tool.specs?.tagline || tool.specs?.description || 'No description';

  const prompt = CONTEXT_MATCHING_PROMPT.replace('{{tool_name}}', tool.name)
    .replace('{{tool_description}}', toolDescription)
    .replace('{{tool_category}}', toolCategory)
    .replace('{{tool_website}}', tool.website || 'Unknown')
    .replace('{{contexts_list}}', contextsList);

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        temperature: 0.2, // Low temp for consistent scoring
        responseMimeType: 'application/json',
      },
    });

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = JSON.parse(text);

    // Validate with Zod
    if (!parsed.matches || !Array.isArray(parsed.matches)) {
      console.error('[ContextMatcher] Validation failed: No matches array in response');
      return [];
    }

    const validated = parsed.matches
      .map((match: unknown) => {
        const result = ContextMatchSchema.safeParse(match);
        if (!result.success) {
          console.error('[ContextMatcher] Validation failed for match:', result.error.issues);
          return null;
        }
        return result.data;
      })
      .filter((m): m is ContextMatch => m !== null);

    console.log(`[ContextMatcher] Found ${validated.length} relevant contexts`);

    return validated;
  } catch (error: any) {
    console.error('[ContextMatcher] Analysis failed:', error.message);
    return [];
  }
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
      const { data: existing } = (await supabase
        .from('reviews')
        .select('id')
        .eq('item_id', toolId)
        .eq('context_id', match.context_id)
        .single()) as any;

      if (existing) {
        console.log(
          `[ContextMatcher] Review already exists for context: ${match.context_title}`
        );
        continue;
      }

      // Create placeholder review (will be generated by review pipeline later)
      // The review will be a draft that needs proper content generation
      const { error } = await (supabase as any).from('reviews').insert({
        item_id: toolId,
        context_id: match.context_id,
        status: 'draft',
        score: match.relevance_score, // Use relevance as initial score
        summary_markdown: `**Auto-assigned via cross-pollination**\n\nRelevance: ${match.relevance_score}%\n\n${match.reasoning}\n\n*This review needs proper content generation.*`,
      });

      if (error) {
        console.error(
          `[ContextMatcher] Failed to create review for ${match.context_title}:`,
          error.message
        );
      } else {
        console.log(
          `[ContextMatcher] ✅ Created review for "${match.context_title}" (relevance: ${match.relevance_score}%)`
        );
        reviewsCreated++;
      }
    } catch (error: any) {
      console.error(`[ContextMatcher] Error creating review:`, error.message);
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
  console.log(
    `[ContextMatcher] 🎯 Cross-pollinating tool ${toolId} across relevant contexts...`
  );

  // Analyze context relevance
  const matches = await analyzeContextRelevance(toolId, originContextId, supabase);

  if (matches.length === 0) {
    console.log('[ContextMatcher] No additional contexts matched (threshold: 70%)');
    return {
      tool_id: toolId,
      origin_context_id: originContextId,
      matches: [],
      reviews_created: 0,
    };
  }

  // Create reviews in matched contexts
  const reviewsCreated = await createContextualReviews(toolId, matches, supabase);

  console.log(
    `[ContextMatcher] ✅ Cross-pollination complete: ${reviewsCreated}/${matches.length} reviews created`
  );

  return {
    tool_id: toolId,
    origin_context_id: originContextId,
    matches,
    reviews_created: reviewsCreated,
  };
}
