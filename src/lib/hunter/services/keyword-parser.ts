/**
 * Gemini-Powered Keyword Intent Parser
 *
 * Uses Gemini Flash to intelligently parse keyword intent and create action plans.
 * Much more flexible and accurate than regex-based parsing.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

export type KeywordType =
  | 'CONTEXT'           // "best X for Y"
  | 'TOOL_REVIEW'       // "X review"
  | 'COMPARISON'        // "X vs Y"
  | 'ALTERNATIVES'      // "X alternatives"
  | 'MULTI_COMPARISON'; // "X vs Y vs Z"

export type ActionType =
  | 'hunt_tool'
  | 'create_context'
  | 'create_comparison'
  | 'discover_competitors'
  | 'discover_new_tools'    // Flywheel: Phase 2 discovery
  | 'review_existing_tools' // Flywheel: Phase 1 instant content
  | 'review_in_context';

export interface Action {
  type: ActionType;
  params: {
    tool_name?: string;
    context_title?: string;
    tools?: string[];
    slug?: string;
    anchor_tool?: string;
    [key: string]: any;
  };
}

export interface KeywordIntent {
  type: KeywordType;
  tools: string[];
  context?: string;
  category?: string;
  actionPlan: Action[];
}

const KEYWORD_ANALYSIS_PROMPT = `You are a keyword intent analyzer for a software review platform.

Given a search keyword, analyze what the user wants and extract structured information.

KEYWORD TYPES:
1. CONTEXT - "best X for Y" - wants list of tools in category X optimized for use case Y
2. TOOL_REVIEW - "X review" - wants detailed review of specific tool X
3. COMPARISON - "X vs Y" or "X versus Y" - wants head-to-head comparison of 2 tools
4. ALTERNATIVES - "X alternatives" or "X competitors" - wants list of tools similar to X
5. MULTI_COMPARISON - "X vs Y vs Z" - wants comparison of 3+ tools

EXTRACTION RULES:
- tools: Extract ALL tool names mentioned (e.g., "discord vs slack" → ["Discord", "Slack"])
- context: Extract the "for X" or "in Y" context if present (e.g., "for startups", "for remote teams")
- category: Infer tool category from keyword (e.g., "best crm" → "CRM", "seo tools" → "SEO")

ACTION PLAN RULES:

CONTEXT type (FLYWHEEL ARCHITECTURE):
  1. create_context (title from keyword)
  2. review_existing_tools (immediate content from DB)
  3. discover_new_tools (expand coverage via search)

TOOL_REVIEW type:
  1. hunt_tool (research the tool)

COMPARISON type:
  1. hunt_tool (for EACH tool mentioned)
  2. create_comparison (generate comparison page)
  3. IF context present: create_context
  4. IF context present: review_in_context

ALTERNATIVES type:
  1. hunt_tool (research anchor tool)
  2. discover_competitors (from tool's competitor list)
  3. create_context (title: "{Tool} Alternatives")

MULTI_COMPARISON type:
  1. hunt_tool (for EACH tool mentioned)
  2. create_comparison (for each pair)
  3. create_context (roundup page)

Output ONLY valid JSON matching this EXACT schema:
{
  "type": "CONTEXT|TOOL_REVIEW|COMPARISON|ALTERNATIVES|MULTI_COMPARISON",
  "tools": ["Tool1", "Tool2"],
  "context": "extracted context or null",
  "category": "inferred category or null",
  "actionPlan": [
    {
      "type": "hunt_tool",
      "params": { "tool_name": "ToolName" }
    }
  ]
}

IMPORTANT:
- For COMPARISON, include hunt_tool for BOTH tools
- For create_comparison, use params: { "tools": ["Tool1", "Tool2"], "slug": "tool1-vs-tool2" }
- For create_context, use params: { "context_title": "Best X for Y" }
- Tool names should be properly capitalized

Keyword to analyze: {{keyword}}`;

export async function parseKeywordIntent(keyword: string): Promise<KeywordIntent> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: {
      temperature: 0.1, // Low temperature for consistency
      responseMimeType: 'application/json',
    },
  });

  const prompt = KEYWORD_ANALYSIS_PROMPT.replace('{{keyword}}', keyword);

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = JSON.parse(text) as KeywordIntent;

    // Validate required fields
    if (!parsed.type || !parsed.tools || !parsed.actionPlan) {
      throw new Error('Invalid response from Gemini: missing required fields');
    }

    return parsed;
  } catch (error) {
    console.error('[KeywordParser] Error parsing keyword:', keyword, error);
    throw error;
  }
}

/**
 * Test function for development
 */
export async function testKeywordParser() {
  const testKeywords = [
    'best seo tools for startups',
    'twenty crm review',
    'discord vs slack for work',
    'typeform alternatives',
    'convertkit vs mailchimp',
  ];

  console.log('🧪 Testing Keyword Parser\n');

  for (const keyword of testKeywords) {
    console.log(`\n📌 Keyword: "${keyword}"`);
    const intent = await parseKeywordIntent(keyword);
    console.log(`   Type: ${intent.type}`);
    console.log(`   Tools: ${intent.tools.join(', ')}`);
    console.log(`   Context: ${intent.context || 'none'}`);
    console.log(`   Category: ${intent.category || 'none'}`);
    console.log(`   Actions: ${intent.actionPlan.length} steps`);
    intent.actionPlan.forEach((action, idx) => {
      console.log(`     ${idx + 1}. ${action.type} - ${JSON.stringify(action.params)}`);
    });
  }
}
