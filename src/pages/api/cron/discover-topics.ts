/**
 * Editorial Brain: Topic Discovery Cron
 * GET /api/cron/discover-topics
 *
 * Runs daily to discover new content opportunities:
 * 1. Analyzes coverage gaps
 * 2. Identifies trending topics
 * 3. Finds stale content needing refresh
 * 4. Uses AI to generate topic suggestions
 *
 * Protected by CRON_SECRET header (Vercel Cron)
 */

import type { APIRoute } from 'astro';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getAdminClient } from '@/lib/supabase';

export const prerender = false;

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

interface DiscoveryResult {
  proposed: number;
  refreshNeeded: number;
  errors: string[];
}

export const GET: APIRoute = async ({ request }) => {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = import.meta.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const admin = getAdminClient();
  const result: DiscoveryResult = { proposed: 0, refreshNeeded: 0, errors: [] };

  try {
    // 1. Get current coverage and guidelines
    const [coverageData, guidelinesData, existingProposed] = await Promise.all([
      admin.from('contexts').select('title, slug, tool_count, updated_at'),
      admin.from('editorial_guidelines').select('key, content').eq('is_active', true),
      admin.from('editorial_topics').select('topic').in('status', ['proposed', 'approved', 'queued']),
    ]);

    const existingContexts = coverageData.data || [];
    const existingTopics = new Set([
      ...existingContexts.map(c => c.title.toLowerCase()),
      ...(existingProposed.data || []).map(t => t.topic.toLowerCase()),
    ]);

    // Parse guidelines
    const guidelines: Record<string, unknown> = {};
    for (const g of guidelinesData.data || []) {
      guidelines[g.key] = g.content;
    }

    // 2. Get category distribution for gap analysis
    const { data: categories } = await admin
      .from('categories')
      .select('name, slug, type')
      .eq('type', 'function');

    const { data: toolCounts } = await admin
      .from('tools')
      .select('category_id')
      .not('category_id', 'is', null);

    // Find underserved categories
    const categoryCounts: Record<string, number> = {};
    for (const tool of toolCounts || []) {
      categoryCounts[tool.category_id] = (categoryCounts[tool.category_id] || 0) + 1;
    }

    // 3. Find stale content needing refresh
    const staleThreshold = new Date();
    staleThreshold.setDate(staleThreshold.getDate() - 90);

    const staleContexts = existingContexts.filter(
      c => new Date(c.updated_at) < staleThreshold
    );
    result.refreshNeeded = staleContexts.length;

    // 4. Use Gemini to generate topic suggestions
    const gemini = new GoogleGenerativeAI(import.meta.env.GEMINI_API_KEY);
    const model = gemini.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        temperature: 0.7,
        responseMimeType: 'application/json',
      },
    });

    const discoveryConfig = (guidelines.discovery_config as Record<string, unknown>) || {};
    const topicFilters = (guidelines.topic_filters as Record<string, unknown>) || {};
    const affiliatePriorities = (guidelines.affiliate_priorities as Record<string, unknown>) || {};

    const prompt = `You are an editorial strategist for StackHunt, a software review and comparison website.

## CURRENT COVERAGE
We already have articles on:
${existingContexts.slice(0, 50).map(c => `- ${c.title}`).join('\n')}

## CATEGORIES WITH FEW TOOLS (Opportunities)
${(categories || [])
  .filter(c => (categoryCounts[c.slug] || 0) < 5)
  .map(c => `- ${c.name}`)
  .join('\n') || 'None identified'}

## STALE CONTENT (Needs Refresh)
${staleContexts.slice(0, 10).map(c => `- ${c.title} (last updated: ${c.updated_at})`).join('\n') || 'None'}

## EDITORIAL GUIDELINES
Topics to avoid: ${JSON.stringify((topicFilters as Record<string, unknown>).avoid || [])}
Topics to prioritize: ${JSON.stringify((topicFilters as Record<string, unknown>).prioritize || [])}
High-priority affiliate programs: ${JSON.stringify((affiliatePriorities as Record<string, unknown>).high_priority || [])}

## YOUR TASK
Generate ${(discoveryConfig as Record<string, number>).daily_proposal_limit || 5} NEW topic suggestions that:
1. Fill gaps in our coverage
2. Target high-intent search queries
3. Have monetization potential
4. Are NOT already covered (check the list above)

For each topic, provide:
- topic: SEO-optimized title (e.g., "Best Project Management Tools for Agencies")
- topic_type: one of "best_list", "comparison", "tool_review", "roundup", "guide"
- description: 1-2 sentences on why this topic matters
- suggested_tools: array of 3-5 tool names to include
- suggested_angle: unique hook or perspective
- target_audience: who will read this
- revenue_potential: "high", "medium", or "low" based on affiliate potential
- reasoning: why you're suggesting this topic

Return a JSON array of topic suggestions.`;

    const response = await model.generateContent(prompt);
    const content = response.response.text();

    if (!content) {
      throw new Error('Empty response from Gemini');
    }

    const suggestions: TopicSuggestion[] = JSON.parse(content);

    // 5. Filter and save suggestions
    for (const suggestion of suggestions) {
      // Skip if already exists
      if (existingTopics.has(suggestion.topic.toLowerCase())) {
        continue;
      }

      // Calculate priority score
      const priorityScore = calculatePriorityScore(suggestion);

      // Insert into editorial_topics
      const { error } = await admin.from('editorial_topics').insert({
        topic: suggestion.topic,
        topic_type: suggestion.topic_type,
        description: suggestion.description,
        source: 'trend_scanner',
        source_data: { reasoning: suggestion.reasoning },
        priority_score: priorityScore,
        revenue_potential: suggestion.revenue_potential,
        suggested_tools: suggestion.suggested_tools,
        suggested_angle: suggestion.suggested_angle,
        target_audience: suggestion.target_audience,
        status: 'proposed',
        proposed_by: 'system',
      });

      if (error) {
        if (error.code === '23505') {
          // Duplicate, skip
          continue;
        }
        result.errors.push(`Failed to insert "${suggestion.topic}": ${error.message}`);
      } else {
        result.proposed++;
      }
    }

    // 6. Create refresh suggestions for stale content
    for (const stale of staleContexts.slice(0, 3)) {
      const refreshTopic = `[REFRESH] ${stale.title}`;

      if (existingTopics.has(refreshTopic.toLowerCase())) {
        continue;
      }

      await admin.from('editorial_topics').insert({
        topic: refreshTopic,
        topic_type: 'best_list',
        description: `Content refresh needed - last updated ${stale.updated_at}`,
        source: 'gap_analyzer',
        priority_score: 70, // High priority for refreshes
        status: 'proposed',
        proposed_by: 'system',
        is_evergreen: true,
      });
    }

    return new Response(JSON.stringify({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Topic discovery error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: (error as Error).message,
      ...result,
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

/**
 * Calculate priority score based on suggestion attributes
 */
function calculatePriorityScore(suggestion: TopicSuggestion): number {
  let score = 50;

  // Revenue potential bonus
  if (suggestion.revenue_potential === 'high') score += 20;
  else if (suggestion.revenue_potential === 'medium') score += 10;

  // Topic type bonus (best_list and comparison are highest value)
  if (suggestion.topic_type === 'best_list') score += 15;
  else if (suggestion.topic_type === 'comparison') score += 12;
  else if (suggestion.topic_type === 'roundup') score += 8;

  // Has specific tools suggested
  if (suggestion.suggested_tools.length >= 5) score += 5;

  // Cap at 100
  return Math.min(100, score);
}
