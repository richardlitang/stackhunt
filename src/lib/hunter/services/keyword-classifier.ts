/**
 * Keyword Classifier Service
 *
 * On-demand classification of keywords to generate Research Dossiers.
 * Used by flywheel (cross-pollination, topic discovery) and queue insertion.
 *
 * Ensures ALL hunts (Ahrefs + flywheel) get Research Dossiers.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

export interface ClassificationResult {
  success: boolean;
  keyword: string;
  normalized_tool_name?: string;
  primary_category?: string;
  research_dossier?: Record<string, any>;
  error?: string;
}

/**
 * Classification prompt (same as scripts/hunter.ts but modularized)
 */
function buildClassificationPrompt(keyword: string): string {
  return `You are a Search Strategist and Research Planner for a SaaS comparison website.

Your job: Take raw keywords and create PRECISE "Research Dossiers" that tell our scraper exactly what to search for.

CRITICAL: DISAMBIGUATE tool names. Examples:
- "claude" → "Anthropic Claude" (AI model, NOT Claude Monet)
- "flash" → "Adobe Flash Player" (legacy, NOT camera flash)
- "box" → "Box.com" (cloud storage, NOT shipping boxes)
- "notion" → "Notion" (already clear)

For the keyword "${keyword}", determine:

1. type: One of: best_list, comparison, alternatives, single_tool, informational, skip
   - best_list: "best X software", "top X tools" → user wants a list
   - comparison: "X vs Y" → comparing 2+ specific tools
   - alternatives: "X alternatives" → similar tools to X
   - single_tool: "X pricing", "X review" → deep dive on one tool
   - informational: How-to guides, no commercial intent → SKIP
   - skip: Spam, nonsense, irrelevant

2. extracted_tools: Array of DISAMBIGUATED tool names

3. suggested_context: Context page title (null if not best_list)

4. research_dossier: ONLY for single_tool and comparison types:
   - normalized_tool_name: Fully qualified name (e.g., "Anthropic Claude")
   - primary_category: One of: ai_model, api_platform, saas_collaboration, saas_productivity, crm_sales, marketing_email, database_storage, devtools, legacy_defunct, consumer_media, infrastructure, design_creative, video_conferencing, generic_saas
   - scout_queries: 3-5 TARGETED queries based on category:
     * ai_model → token pricing, context limits, benchmarks
     * api_platform → per-request pricing, rate limits, overage charges
     * saas_collaboration → seat limits, storage quotas, SSO costs
     * legacy_defunct → shutdown date, alternatives, migration guides
   - forensic_targets: 1-3 specific constraints to hunt (choose from: record_count, storage_gb, api_requests_per_month, api_rate_limit_per_sec, seat_count, project_count, active_contacts, message_credits, concurrent_users, bandwidth_gb, build_minutes, shutdown_status)
   - confidence: high/medium/low (based on how confident you are in classification)
   - red_flags: Array of warning signals (e.g., ["No pricing page found", "Mentions 'discontinued'"])

EXAMPLES:

INPUT: "claude pricing"
OUTPUT:
{
  "keyword": "claude pricing",
  "type": "single_tool",
  "extracted_tools": ["Anthropic Claude"],
  "suggested_context": null,
  "research_dossier": {
    "normalized_tool_name": "Anthropic Claude",
    "primary_category": "ai_model",
    "scout_queries": [
      "Anthropic Claude pricing tokens vs subscription",
      "Claude 3.5 Sonnet context window limit",
      "Claude API rate limits documentation",
      "Claude vs GPT-4 cost comparison",
      "Claude enterprise pricing hidden costs"
    ],
    "forensic_targets": ["api_requests_per_month", "api_rate_limit_per_sec"],
    "confidence": "high",
    "red_flags": []
  }
}

INPUT: "adobe flash alternatives"
OUTPUT:
{
  "keyword": "adobe flash alternatives",
  "type": "alternatives",
  "extracted_tools": ["Adobe Flash Player"],
  "suggested_context": "Best Adobe Flash Player Alternatives",
  "research_dossier": {
    "normalized_tool_name": "Adobe Flash Player",
    "primary_category": "legacy_defunct",
    "scout_queries": [
      "Adobe Flash Player shutdown date 2020",
      "Adobe Flash alternatives 2026",
      "Ruffle emulator Flash replacement",
      "HTML5 canvas Flash migration",
      "Flash end of life announcement"
    ],
    "forensic_targets": ["shutdown_status"],
    "confidence": "high",
    "red_flags": ["Adobe discontinued 2020", "End of life"]
  }
}

INPUT: "best project management software"
OUTPUT:
{
  "keyword": "best project management software",
  "type": "best_list",
  "extracted_tools": [],
  "suggested_context": "Best Project Management Software",
  "research_dossier": null
}

Respond in JSON format with the classification for "${keyword}".`;
}

/**
 * Classify a single keyword and store in content_ideas
 */
export async function classifyKeyword(
  keyword: string,
  supabase: SupabaseClient<Database>,
  options: {
    onLog?: (message: string) => void;
    source?: string;
  } = {}
): Promise<ClassificationResult> {
  const log = options.onLog || (() => {});
  const source = options.source || 'flywheel';

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      keyword,
      error: 'GEMINI_API_KEY not configured',
    };
  }

  try {
    // Check if already classified
    const { data: existing } = await supabase
      .from('content_ideas')
      .select('id, keyword_type, ai_classification')
      .eq('keyword', keyword)
      .maybeSingle();

    if (existing?.keyword_type) {
      log(`[Classifier] Keyword "${keyword}" already classified (type: ${existing.keyword_type})`);
      return {
        success: true,
        keyword,
        normalized_tool_name: existing.ai_classification?.research_dossier?.normalized_tool_name,
        primary_category: existing.ai_classification?.research_dossier?.primary_category,
        research_dossier: existing.ai_classification?.research_dossier,
      };
    }

    // Classify with Gemini
    log(`[Classifier] Classifying keyword: "${keyword}"`);
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = buildClassificationPrompt(keyword);
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      log(`[Classifier] Failed to parse response for "${keyword}"`);
      return {
        success: false,
        keyword,
        error: 'Failed to parse LLM response',
      };
    }

    const classification = JSON.parse(jsonMatch[0]);

    // Use normalized name from dossier if available
    const toolName =
      classification.research_dossier?.normalized_tool_name || classification.extracted_tools?.[0] || null;

    // Upsert to content_ideas
    const { error: upsertError } = await supabase.rpc('update_keyword_classification', {
      p_idea_id: existing?.id || null,
      p_keyword_type: classification.type,
      p_extracted_tools: classification.extracted_tools || [],
      p_tool_name: toolName,
      p_context_query: classification.suggested_context,
      p_ai_response: classification,
    });

    // If no existing record, insert new one
    if (!existing) {
      await supabase.from('content_ideas').insert({
        keyword,
        tool_name: toolName,
        keyword_type: classification.type,
        extracted_tools: classification.extracted_tools || [],
        context_query: classification.suggested_context,
        ai_classification: classification,
        source,
        status: 'pending',
      });
    }

    if (upsertError) {
      log(`[Classifier] DB error for "${keyword}": ${upsertError.message}`);
      return {
        success: false,
        keyword,
        error: upsertError.message,
      };
    }

    log(
      `[Classifier] ✓ ${keyword} → ${classification.type} | Tool: ${toolName} | Category: ${classification.research_dossier?.primary_category || 'N/A'}`
    );

    return {
      success: true,
      keyword,
      normalized_tool_name: toolName,
      primary_category: classification.research_dossier?.primary_category,
      research_dossier: classification.research_dossier,
    };
  } catch (error) {
    const err = error as Error;
    log(`[Classifier] Error classifying "${keyword}": ${err.message}`);
    return {
      success: false,
      keyword,
      error: err.message,
    };
  }
}

/**
 * Ensure a tool has a classification before queuing
 * Called by queue insertion logic (API, cross-pollination, topic discovery)
 */
export async function ensureClassification(
  toolName: string,
  supabase: SupabaseClient<Database>,
  options: {
    onLog?: (message: string) => void;
    contextTitle?: string;
  } = {}
): Promise<{ success: boolean; research_dossier?: Record<string, any>; error?: string }> {
  const log = options.onLog || (() => {});

  // Check if tool already has classification
  const { data: idea } = await supabase
    .from('content_ideas')
    .select('keyword_type, ai_classification')
    .or(`keyword.eq.${toolName},tool_name.eq.${toolName}`)
    .maybeSingle();

  if (idea?.keyword_type && idea.ai_classification?.research_dossier) {
    log(`[Classifier] Tool "${toolName}" already classified`);
    return {
      success: true,
      research_dossier: idea.ai_classification.research_dossier,
    };
  }

  // Classify on-demand
  log(`[Classifier] Tool "${toolName}" not classified, classifying now...`);
  const keyword = options.contextTitle ? `${toolName} ${options.contextTitle}` : toolName;

  const result = await classifyKeyword(keyword, supabase, {
    onLog: log,
    source: 'flywheel',
  });

  if (!result.success) {
    return {
      success: false,
      error: result.error,
    };
  }

  return {
    success: true,
    research_dossier: result.research_dossier,
  };
}
