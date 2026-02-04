#!/usr/bin/env npx tsx
/**
 * Topic Discovery CLI
 *
 * AI-powered discovery of new content opportunities.
 * Run daily via GitHub Actions or manually:
 *   npm run discover-topics
 *
 * What it does:
 * 1. Analyzes coverage gaps in existing content
 * 2. Identifies trending topics based on current tools
 * 3. Finds stale content needing refresh
 * 4. Uses AI to generate topic suggestions
 *
 * @module scripts/discover-topics
 */

import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

// Load environment variables
import { config } from 'dotenv';
config();

// Environment validation
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

if (!GEMINI_API_KEY) {
  console.error('Missing required: GEMINI_API_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const gemini = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// Types
interface TopicSuggestion {
  topic: string;
  topic_type: 'best_list' | 'comparison' | 'tool_review' | 'roundup' | 'guide';
  description: string;
  suggested_tools: string[];
  suggested_angle: string;
  target_audience: string;
  revenue_potential: 'high' | 'medium' | 'low';
  reasoning: string;
}

/**
 * Analyze coverage gaps
 */
async function analyzeCoverageGaps(): Promise<string[]> {
  console.log('📊 Analyzing coverage gaps...');

  // Get existing tools and their contexts
  const { data: tools } = await supabase
    .from('tools')
    .select('name, category_id, review_count')
    .order('review_count', { ascending: true })
    .limit(50);

  // Get categories
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, slug');

  // Get existing contexts
  const { data: contexts } = await supabase
    .from('contexts')
    .select('title, category_id');

  const gaps: string[] = [];

  // Find tools with few reviews
  const underReviewed = tools?.filter(t => t.review_count < 2) || [];
  if (underReviewed.length > 0) {
    gaps.push(`Under-reviewed tools: ${underReviewed.slice(0, 5).map(t => t.name).join(', ')}`);
  }

  // Find categories with few contexts
  const categoryContextCounts = new Map<string, number>();
  for (const ctx of contexts || []) {
    if (ctx.category_id) {
      categoryContextCounts.set(
        ctx.category_id,
        (categoryContextCounts.get(ctx.category_id) || 0) + 1
      );
    }
  }

  for (const cat of categories || []) {
    const count = categoryContextCounts.get(cat.id) || 0;
    if (count < 3) {
      gaps.push(`Category "${cat.name}" has only ${count} contexts`);
    }
  }

  console.log(`   Found ${gaps.length} gaps\n`);
  return gaps;
}

/**
 * Find stale content
 */
async function findStaleContent(): Promise<string[]> {
  console.log('🔄 Finding stale content...');

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: staleReviews } = await supabase
    .from('reviews')
    .select(`
      id,
      updated_at,
      tool:tools(name),
      context:contexts(title)
    `)
    .lt('updated_at', thirtyDaysAgo.toISOString())
    .limit(10);

  const stale: string[] = [];

  for (const review of staleReviews || []) {
    const tool = review.tool as { name: string } | null;
    const context = review.context as { title: string } | null;
    if (tool && context) {
      stale.push(`"${tool.name}" in "${context.title}" - last updated ${review.updated_at}`);
    }
  }

  console.log(`   Found ${stale.length} stale reviews\n`);
  return stale;
}

/**
 * Generate topic suggestions using AI
 */
async function generateSuggestions(
  gaps: string[],
  stale: string[],
  existingTools: string[],
  existingContexts: string[]
): Promise<TopicSuggestion[]> {
  console.log('🤖 Generating AI suggestions...');

  const prompt = `You are a content strategist for a software comparison website.

CURRENT STATE:
- Existing tools: ${existingTools.slice(0, 20).join(', ')}
- Existing list pages: ${existingContexts.slice(0, 20).join(', ')}

COVERAGE GAPS:
${gaps.join('\n')}

STALE CONTENT (needs refresh):
${stale.join('\n')}

Generate 5 NEW content topic suggestions. Focus on:
1. High-traffic keywords (e.g., "best X for Y")
2. Comparison pages (e.g., "X vs Y")
3. Niche audiences with buying intent

Return ONLY valid JSON array:
[
  {
    "topic": "Best CRM for Real Estate Agents",
    "topic_type": "best_list",
    "description": "Ranked list of CRMs optimized for real estate workflows",
    "suggested_tools": ["Salesforce", "HubSpot", "Follow Up Boss"],
    "suggested_angle": "Focus on lead management and property tracking features",
    "target_audience": "Real estate agents and brokers",
    "revenue_potential": "high",
    "reasoning": "High-intent keyword with strong affiliate opportunities"
  }
]`;

  try {
    const response = await gemini.models.generateContent({
      model: 'gemini-2.0-flash-preview',
      contents: prompt,
      config: {
        temperature: 0.7,
        responseMimeType: 'application/json',
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.MEDIUM,
        },
      },
    });

    const content = response.text;

    if (!content) {
      console.log('   AI returned empty response');
      return [];
    }

    const suggestions = JSON.parse(content) as TopicSuggestion[];
    console.log(`   Generated ${suggestions.length} suggestions\n`);
    return suggestions;
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : String(error);
    const errString = errMessage.toLowerCase();

    // Check for critical API errors
    const isCritical =
      errString.includes('quota') ||
      errString.includes('api key') ||
      errString.includes('unauthorized') ||
      errString.includes('403') ||
      errString.includes('401');

    if (isCritical) {
      console.error(`CRITICAL API ERROR: ${errMessage}`);

      // Send Discord alert if webhook is configured
      const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;
      if (discordWebhookUrl) {
        const { alertCritical } = await import('../src/lib/notifications/discord');
        await alertCritical(discordWebhookUrl, {
          title: 'Gemini API Failure',
          message: errMessage,
          service: 'gemini',
          action: errString.includes('quota')
            ? 'Check billing and quota limits'
            : 'Check and update API key in GitHub Secrets',
        });
      }

      // Exit with error to trigger workflow failure notification
      process.exit(1);
    }

    console.error('AI generation failed:', error);
    return [];
  }
}

/**
 * Save suggestions to database
 */
async function saveSuggestions(suggestions: TopicSuggestion[]): Promise<number> {
  let saved = 0;

  for (const suggestion of suggestions) {
    // Check if similar idea already exists
    const { data: existing } = await supabase
      .from('content_ideas')
      .select('id')
      .ilike('keyword', `%${suggestion.topic}%`)
      .limit(1);

    if (existing && existing.length > 0) {
      console.log(`   ⏭️  Skipping duplicate: "${suggestion.topic}"`);
      continue;
    }

    // Insert new idea
    const { error } = await supabase.from('content_ideas').insert({
      keyword: suggestion.topic,
      keyword_type: suggestion.topic_type,
      context_query: suggestion.description,
      extracted_tools: suggestion.suggested_tools,
      notes: `AI Suggestion: ${suggestion.reasoning}\nAngle: ${suggestion.suggested_angle}\nAudience: ${suggestion.target_audience}`,
      source: 'ai_discovery',
      status: 'pending',
    });

    if (error) {
      console.error(`   Failed to save "${suggestion.topic}":`, error.message);
    } else {
      console.log(`   ✅ Saved: "${suggestion.topic}"`);
      saved++;
    }
  }

  return saved;
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Starting topic discovery...');
  console.log(`📅 ${new Date().toISOString()}\n`);

  // Get existing data
  const { data: tools } = await supabase.from('tools').select('name');
  const { data: contexts } = await supabase.from('contexts').select('title');

  const existingTools = tools?.map(t => t.name) || [];
  const existingContexts = contexts?.map(c => c.title) || [];

  console.log(`📦 Current inventory: ${existingTools.length} tools, ${existingContexts.length} contexts\n`);

  // Analyze
  const gaps = await analyzeCoverageGaps();
  const stale = await findStaleContent();

  // Generate suggestions
  const suggestions = await generateSuggestions(gaps, stale, existingTools, existingContexts);

  if (suggestions.length === 0) {
    console.log('No new suggestions generated.');
    process.exit(0);
  }

  // Display suggestions
  console.log('📝 Generated Suggestions:');
  for (const s of suggestions) {
    console.log(`\n   📌 ${s.topic}`);
    console.log(`      Type: ${s.topic_type}`);
    console.log(`      Revenue: ${s.revenue_potential}`);
    console.log(`      Tools: ${s.suggested_tools.join(', ')}`);
  }
  console.log();

  // Save to database
  const saved = await saveSuggestions(suggestions);

  console.log('\n' + '='.repeat(50));
  console.log('📈 Discovery Summary:');
  console.log(`   Gaps found: ${gaps.length}`);
  console.log(`   Stale content: ${stale.length}`);
  console.log(`   Suggestions generated: ${suggestions.length}`);
  console.log(`   New ideas saved: ${saved}`);
  console.log('='.repeat(50));

  console.log('\n✅ Topic discovery complete!');
  process.exit(0);
}

// Run
main().catch((error) => {
  console.error('💥 Unhandled error:', error);
  process.exit(1);
});
