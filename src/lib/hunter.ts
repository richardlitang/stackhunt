/**
 * Hunter Core - Shared logic for CLI and Cron execution
 *
 * This module contains the research and synthesis logic.
 * Can be invoked from:
 * - CLI: scripts/hunter.ts
 * - Vercel Cron: /api/cron/hunt
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import axios, { type AxiosError } from 'axios';
import type {
  Database,
  PricingModel,
  ToolInsert,
  ContextInsert,
  ReviewInsert,
  AffiliateOfferInsert,
} from '@/types/database';
import {
  KnowledgeCardSchema,
  GeminiKnowledgeCardSchema,
  type KnowledgeCard,
} from './knowledge-card';

// ============================================================================
// TYPES
// ============================================================================

export interface HunterConfig {
  supabaseUrl: string;
  supabaseServiceKey: string;
  geminiApiKey: string;
  serperApiKey: string;
  isDraftMode?: boolean; // If true, reviews are created as 'draft'
}

export interface HunterInput {
  toolName: string;
  contextTitle?: string;
  categorySlug?: string;
  queueItemId?: string; // If processing from queue
}

// Guidance for context hunt (optional hints for better articles)
export interface ContextHuntGuidance {
  mustIncludeTools?: string[];    // Tools that must be in the article
  sourcesToCheck?: string[];       // Domains to prioritize (e.g., reddit.com)
  specialInstructions?: string;    // Free-form instructions
}

// Context-first hunt input (for "Best X for Y" discovery)
export interface ContextHuntInput {
  contextQuery: string;  // e.g., "Best Note-Taking Apps for Students"
  maxTools?: number;     // How many tools to find (default 5)
  guidance?: ContextHuntGuidance; // Optional hints for better research
}

export interface HunterResult {
  success: boolean;
  toolId?: string;
  contextId?: string;
  reviewId?: string;
  error?: string;
  tokensUsed?: number;
  durationMs?: number;
}

// Result from context-first hunt
export interface ContextHuntResult {
  success: boolean;
  contextId?: string;
  contextSlug?: string;
  toolsCreated: number;
  reviewsCreated: number;
  error?: string;
  tokensUsed?: number;
  durationMs?: number;
}

export interface HunterAnalysis {
  score: number;
  pros: string[];
  cons: string[];
  summary: string;
  sentimentTags: string[];
  pricingType: PricingModel;
  websiteUrl?: string;
  shortDescription?: string;
  // Knowledge Graph tags
  graphTags: {
    functions: string[];   // What it does: "Notetaking", "CRM"
    audiences: string[];   // Who it's for: "Students", "Small Teams"
    platforms: string[];   // Where it runs: "Web", "iOS", "Mac"
  };
  // Structured title parts (for context)
  titleParts?: {
    noun: string;          // "Note-Taking Apps"
    modifier?: string;     // "for Students"
  };
  // Knowledge Card (structured facts from two-pass extraction)
  knowledgeCard?: KnowledgeCard;
}

interface SerperResponse {
  organic: Array<{
    title: string;
    link: string;
    snippet: string;
    position: number;
  }>;
  searchParameters: { q: string };
}

// ============================================================================
// FALLBACK PROMPTS (used if DB prompts unavailable)
// ============================================================================

const FALLBACK_SYNTHESIS_PROMPT = `You are the StackHunt Analyst, an expert at evaluating software tools and building a Knowledge Graph.

Your task is to analyze search results about a software tool and provide a structured assessment with Knowledge Graph tags.

Output ONLY valid JSON matching this exact schema:
{
  "score": <number 0-100, where 100 is excellent>,
  "pros": [
    { "text": "<specific and actionable benefit>", "source_url": "<URL from search results that supports this claim>" }
  ],
  "cons": [
    { "text": "<specific and honest drawback>", "source_url": "<URL from search results that supports this claim>" }
  ],
  "summary": "<150-300 word Markdown summary explaining who this tool is best for and why people might switch away>",
  "sentimentTags": [<1-5 lowercase tags like "easy-to-use", "expensive", "feature-rich", "steep-learning-curve">],
  "pricingType": "<one of: free, freemium, paid, enterprise, open_source>",
  "websiteUrl": "<official website URL if found>",
  "shortDescription": "<one sentence, max 200 chars describing what the tool does>",
  "graphTags": {
    "functions": [<1-3 strings: what the tool DOES, e.g., "Notetaking", "CRM", "Project Management">],
    "audiences": [<1-3 strings: WHO the tool is for, e.g., "Students", "Small Teams", "Developers">],
    "platforms": [<1-5 strings: WHERE the tool runs, e.g., "Web", "Mac", "iOS", "Android">]
  },
  "titleParts": {
    "noun": "<the type of tool, e.g., 'Note-Taking Apps', 'CRM Software', 'Project Management Tools'>",
    "modifier": "<optional audience/use case modifier, e.g., 'for Students', 'for Remote Teams'>"
  }
}

## CRITICAL: Knowledge Graph Tag Selection

You MUST prefer existing categories when they match. Only create new tags if TRULY necessary.

### Existing Function Tags (PREFER THESE):
{{existingFunctions}}

### Existing Audience Tags (PREFER THESE):
{{existingAudiences}}

### Existing Platform Tags (PREFER THESE):
{{existingPlatforms}}

Rules for tags:
- Use Title Case (e.g., "Small Teams" not "small teams")
- Be specific but not too narrow (e.g., "Students" not "Medical Students")
- If an existing tag is 80%+ similar to what you'd create, USE THE EXISTING ONE
- Functions describe WHAT (features), Audiences describe WHO (users), Platforms describe WHERE (devices/deployment)

Guidelines:
- Be objective and balanced - every tool has pros AND cons
- Score meaning: 0-30 poor, 31-50 below average, 51-70 average, 71-85 good, 86-100 excellent
- For contextual analysis (e.g., "Best for Small Teams"), tailor your assessment to that specific audience
- Pros/cons should be specific, not generic
- For each pro/con, include the source_url from the search results that supports the claim
- Aim for 3 pros and 3 cons when possible, but only include claims you can support with evidence
- titleParts.noun should describe the category of tool (plural), titleParts.modifier adds context

Analyze this software tool: "{{toolName}}"
{{#contextTitle}}
Context: Evaluating specifically for "{{contextTitle}}"
{{/contextTitle}}

## VERIFIED FACTS (from Pass 1 extraction - use these as ground truth):
{{knowledgeCardFacts}}

## RAW SEARCH RESULTS (for additional context):

### Reviews & Opinions:
{{reviewsSnippets}}

### Pricing & Features:
{{pricingSnippets}}

### Alternatives & Comparisons:
{{alternativesSnippets}}

IMPORTANT: Base your analysis primarily on the VERIFIED FACTS above. Use the raw search results only to fill in gaps or add color to your analysis. Do NOT contradict the verified facts.

Provide your structured JSON analysis (JSON only, no markdown code blocks):`;

// ============================================================================
// VALIDATION
// ============================================================================

// Schema for pro/con with source citation
const ClaimWithSourceSchema = z.object({
  text: z.string(),
  source_url: z.string().url().optional(),
});

// Support both legacy string[] and new object[] format
const ClaimArraySchema = z.array(
  z.union([z.string(), ClaimWithSourceSchema])
).min(1).max(5);

const AnalysisSchema = z.object({
  score: z.number().min(0).max(100),
  pros: ClaimArraySchema,
  cons: ClaimArraySchema,
  summary: z.string().min(50),
  sentimentTags: z.array(z.string()).min(1).max(5),
  pricingType: z.enum(['free', 'freemium', 'paid', 'enterprise', 'open_source']),
  websiteUrl: z.string().url().optional(),
  shortDescription: z.string().max(200).optional(),
  graphTags: z.object({
    functions: z.array(z.string()).min(1).max(5),
    audiences: z.array(z.string()).min(1).max(5),
    platforms: z.array(z.string()).min(1).max(10),
  }),
  titleParts: z.object({
    noun: z.string(),
    modifier: z.string().optional(),
  }).optional(),
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Build a human-readable summary of Knowledge Card facts for the Architect prompt
 */
function buildFactSummary(card: KnowledgeCard): string {
  const lines: string[] = [];

  lines.push(`## Verified Facts for ${card.official_name}`);

  // Pricing
  lines.push(`\n### Pricing`);
  lines.push(`- Model: ${card.pricing.model}`);
  lines.push(`- Free Tier: ${card.pricing.has_free_tier ? 'Yes' : 'No'}`);
  lines.push(`- Free Trial: ${card.pricing.has_free_trial ? (card.pricing.trial_days ? `${card.pricing.trial_days} days` : 'Yes') : 'No'}`);
  if (card.pricing.starting_price) lines.push(`- Starting Price: ${card.pricing.starting_price}`);

  // Platforms
  const availablePlatforms = card.platforms.filter(p => p.available).map(p => p.platform);
  if (availablePlatforms.length > 0) {
    lines.push(`\n### Platforms`);
    lines.push(`- Available on: ${availablePlatforms.join(', ')}`);
  }

  // Features
  if (card.features.core.length > 0) {
    lines.push(`\n### Core Features`);
    card.features.core.forEach(f => lines.push(`- ${f}`));
  }
  if (card.features.unique.length > 0) {
    lines.push(`\n### Unique Differentiators`);
    card.features.unique.forEach(f => lines.push(`- ${f}`));
  }

  // Integrations
  lines.push(`\n### Integrations`);
  lines.push(`- API: ${card.integrations.has_api ? 'Yes' : 'No'}`);
  lines.push(`- Zapier: ${card.integrations.has_zapier ? 'Yes' : 'No'}`);
  if (card.integrations.notable.length > 0) {
    lines.push(`- Notable: ${card.integrations.notable.map(i => i.name).join(', ')}`);
  }

  // Audience
  if (card.audience.primary.length > 0) {
    lines.push(`\n### Target Audience`);
    lines.push(`- Primary: ${card.audience.primary.join(', ')}`);
  }
  if (card.audience.use_cases.length > 0) {
    lines.push(`- Use Cases: ${card.audience.use_cases.join(', ')}`);
  }

  // Competitive
  if (card.competitive.main_alternatives.length > 0) {
    lines.push(`\n### Competitive Landscape`);
    lines.push(`- Main Alternatives: ${card.competitive.main_alternatives.join(', ')}`);
  }
  if (card.competitive.best_for) {
    lines.push(`- Best For: ${card.competitive.best_for}`);
  }
  if (card.competitive.not_ideal_for) {
    lines.push(`- Not Ideal For: ${card.competitive.not_ideal_for}`);
  }

  // Security
  const securityFeatures: string[] = [];
  if (card.security.sso_available) securityFeatures.push('SSO');
  if (card.security.two_factor) securityFeatures.push('2FA');
  if (card.security.soc2_certified) securityFeatures.push('SOC 2');
  if (card.security.gdpr_compliant) securityFeatures.push('GDPR');
  if (card.security.self_hosted_option) securityFeatures.push('Self-hosted option');
  if (securityFeatures.length > 0) {
    lines.push(`\n### Security`);
    lines.push(`- Features: ${securityFeatures.join(', ')}`);
  }

  lines.push(`\n### Data Quality: ${card.meta.data_quality}`);

  return lines.join('\n');
}

// ============================================================================
// HUNTER CLASS
// ============================================================================

export class Hunter {
  private supabase: SupabaseClient<Database>;
  private gemini: GoogleGenerativeAI;
  private config: HunterConfig;
  private logs: string[] = [];

  constructor(config: HunterConfig) {
    this.config = config;
    this.supabase = createClient<Database>(config.supabaseUrl, config.supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    this.gemini = new GoogleGenerativeAI(config.geminiApiKey);
  }

  private log(message: string) {
    const timestamp = new Date().toISOString();
    this.logs.push(`[${timestamp}] ${message}`);
    console.log(`[Hunter] ${message}`);
  }

  getLogs(): string[] {
    return this.logs;
  }

  // --------------------------------------------------------------------------
  // RETRY WRAPPER
  // --------------------------------------------------------------------------

  private async withRetry<T>(fn: () => Promise<T>, operation: string, maxRetries = 3): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        this.log(`${operation} failed (attempt ${attempt}/${maxRetries}): ${lastError.message}`);

        if (attempt < maxRetries) {
          const delay = 1000 * Math.pow(2, attempt - 1);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  // --------------------------------------------------------------------------
  // STEP A: SCOUT (Serper Search)
  // --------------------------------------------------------------------------

  private async searchSerper(query: string): Promise<SerperResponse> {
    const response = await axios.post<SerperResponse>(
      'https://google.serper.dev/search',
      { q: query, num: 10 },
      {
        headers: {
          'X-API-KEY': this.config.serperApiKey,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  }

  private async scout(toolName: string, contextTitle?: string) {
    this.log(`Scouting: ${toolName}${contextTitle ? ` (${contextTitle})` : ''}`);

    const queries = [
      `${toolName} reviews ${contextTitle || ''}`.trim(),
      `${toolName} pricing features`,
      `${toolName} alternatives comparison`,
    ];

    const results = await Promise.all(
      queries.map((q) => this.withRetry(() => this.searchSerper(q), `Search: ${q}`))
    );

    // Include URL in snippets so AI can cite sources
    const extractSnippets = (response: SerperResponse): string[] =>
      response.organic?.slice(0, 5).map((r) => `[${r.link}] ${r.title}: ${r.snippet}`) || [];

    // Extract sources for storage (deduplicated by URL)
    const sourceMap = new Map<string, { url: string; title: string; snippet: string; domain: string }>();
    for (const response of results) {
      for (const result of response.organic?.slice(0, 5) || []) {
        if (!sourceMap.has(result.link)) {
          try {
            const domain = new URL(result.link).hostname.replace(/^www\./, '');
            sourceMap.set(result.link, {
              url: result.link,
              title: result.title,
              snippet: result.snippet,
              domain,
            });
          } catch {
            // Skip invalid URLs
          }
        }
      }
    }

    return {
      reviewsSnippets: extractSnippets(results[0]),
      pricingSnippets: extractSnippets(results[1]),
      alternativesSnippets: extractSnippets(results[2]),
      rawResponses: results,
      sources: Array.from(sourceMap.values()),
    };
  }

  // --------------------------------------------------------------------------
  // STEP B: EXTRACT KNOWLEDGE CARD (Pass 1 - The Librarian)
  // --------------------------------------------------------------------------

  private async extractKnowledgeCard(
    toolName: string,
    scoutResult: Awaited<ReturnType<typeof this.scout>>
  ): Promise<{ knowledgeCard: KnowledgeCard; tokensUsed: number }> {
    this.log(`[Pass 1 - Librarian] Extracting facts for: ${toolName}`);

    const prompt = `You are a fact extraction system. Extract ONLY verifiable facts about "${toolName}" from the search results.

CRITICAL RULES:
- Only extract facts that are explicitly mentioned or strongly implied in the sources
- Use null for any field where information is not available
- Prefer verified information from official sources
- Set data_quality to "high" if most facts are from official sources, "medium" if from reviews, "low" if limited data

Search Results:
## Official & Reviews:
${scoutResult.reviewsSnippets.join('\n')}

## Pricing & Features:
${scoutResult.pricingSnippets.join('\n')}

## Alternatives & Comparisons:
${scoutResult.alternativesSnippets.join('\n')}

Extract the knowledge card JSON:`;

    const model = this.gemini.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        temperature: 0.1, // Low temperature for fact extraction
        responseMimeType: 'application/json',
        responseSchema: GeminiKnowledgeCardSchema as never,
      },
    });

    const response = await this.withRetry(
      () => model.generateContent(prompt),
      'Gemini fact extraction'
    );

    const content = response.response.text();
    if (!content) throw new Error('Empty response from Gemini fact extraction');

    const parsed = JSON.parse(content);

    // Add extraction date
    parsed.meta = {
      ...parsed.meta,
      extraction_date: new Date().toISOString().split('T')[0],
    };

    // Validate with Zod
    const validated = KnowledgeCardSchema.parse(parsed);

    const tokensUsed = Math.ceil((prompt.length + content.length) / 4);
    this.log(`[Pass 1] Extracted facts (quality: ${validated.meta.data_quality})`);

    return { knowledgeCard: validated, tokensUsed };
  }

  // --------------------------------------------------------------------------
  // STEP C: FETCH EXISTING CATEGORIES (for Knowledge Graph)
  // --------------------------------------------------------------------------

  private async getExistingCategories(): Promise<{
    functions: string[];
    audiences: string[];
    platforms: string[];
  }> {
    const { data } = await this.supabase
      .from('categories')
      .select('name, type')
      .order('name');

    const result = { functions: [] as string[], audiences: [] as string[], platforms: [] as string[] };

    for (const cat of data || []) {
      if (cat.type === 'function') result.functions.push(cat.name);
      else if (cat.type === 'audience') result.audiences.push(cat.name);
      else if (cat.type === 'platform') result.platforms.push(cat.name);
    }

    return result;
  }

  // --------------------------------------------------------------------------
  // STEP C: SYNTHESIZE (Gemini with Structured Output)
  // --------------------------------------------------------------------------

  private async getPromptTemplate(key: string): Promise<string | null> {
    const { data } = await this.supabase.rpc('get_prompt', { p_key: key });
    return data?.[0]?.template || null;
  }

  private interpolateTemplate(template: string, vars: Record<string, string>): string {
    let result = template;

    // Handle conditionals: {{#var}}content{{/var}}
    for (const [key, value] of Object.entries(vars)) {
      const conditionalRegex = new RegExp(`\\{\\{#${key}\\}\\}([\\s\\S]*?)\\{\\{/${key}\\}\\}`, 'g');
      result = result.replace(conditionalRegex, value ? '$1' : '');
    }

    // Handle simple variables: {{var}}
    for (const [key, value] of Object.entries(vars)) {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || '');
    }

    return result;
  }

  private async synthesize(
    toolName: string,
    scoutResult: Awaited<ReturnType<typeof this.scout>>,
    knowledgeCard: KnowledgeCard,
    contextTitle?: string
  ): Promise<{ analysis: HunterAnalysis; tokensUsed: number }> {
    this.log(`[Pass 2 - Architect] Synthesizing review for: ${toolName}`);

    // Fetch existing categories for the Knowledge Graph
    const existingCategories = await this.getExistingCategories();
    this.log(`Loaded ${existingCategories.functions.length} functions, ${existingCategories.audiences.length} audiences, ${existingCategories.platforms.length} platforms`);

    // Try to load prompt from DB, fallback to hardcoded
    let promptTemplate = await this.getPromptTemplate('hunter_synthesis');

    if (promptTemplate) {
      this.log('Using prompt from database');
    } else {
      this.log('Using fallback hardcoded prompt');
      promptTemplate = FALLBACK_SYNTHESIS_PROMPT;
    }

    // Build fact summary from Knowledge Card for the prompt
    const factSummary = buildFactSummary(knowledgeCard);

    // Interpolate variables
    const prompt = this.interpolateTemplate(promptTemplate, {
      toolName,
      contextTitle: contextTitle || '',
      existingFunctions: existingCategories.functions.join(', ') || 'None yet',
      existingAudiences: existingCategories.audiences.join(', ') || 'None yet',
      existingPlatforms: existingCategories.platforms.join(', ') || 'None yet',
      reviewsSnippets: scoutResult.reviewsSnippets.join('\n'),
      pricingSnippets: scoutResult.pricingSnippets.join('\n'),
      alternativesSnippets: scoutResult.alternativesSnippets.join('\n'),
      // NEW: Include structured facts from Pass 1
      knowledgeCardFacts: factSummary,
    });

    const model = this.gemini.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        temperature: 0.3,
        responseMimeType: 'application/json',
      },
    });

    const response = await this.withRetry(
      () => model.generateContent(prompt),
      'Gemini synthesis'
    );

    const result = response.response;
    const content = result.text();
    if (!content) throw new Error('Empty response from Gemini');

    const parsed = JSON.parse(content);
    const validated = AnalysisSchema.parse(parsed);

    // Gemini doesn't return token counts in the same way, estimate from content length
    const tokensUsed = Math.ceil((prompt.length + content.length) / 4);

    this.log(`Graph tags: functions=[${validated.graphTags.functions.join(', ')}], audiences=[${validated.graphTags.audiences.join(', ')}], platforms=[${validated.graphTags.platforms.join(', ')}]`);

    // Attach the Knowledge Card to the analysis
    const analysisWithCard: HunterAnalysis = {
      ...(validated as HunterAnalysis),
      knowledgeCard,
    };

    return {
      analysis: analysisWithCard,
      tokensUsed,
    };
  }

  // --------------------------------------------------------------------------
  // STEP C: GENERATE EMBEDDING (Gemini)
  // --------------------------------------------------------------------------

  private async generateEmbedding(text: string): Promise<number[]> {
    this.log('Generating embedding...');

    const model = this.gemini.getGenerativeModel({ model: 'text-embedding-004' });

    const response = await this.withRetry(
      () => model.embedContent(text),
      'Gemini embedding'
    );

    return response.embedding.values;
  }

  // --------------------------------------------------------------------------
  // STEP D: FETCH & UPLOAD LOGO
  // --------------------------------------------------------------------------

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private async fetchAndUploadLogo(
    toolName: string,
    websiteUrl?: string
  ): Promise<{ path: string; url: string } | null> {
    this.log(`Preparing logo for: ${toolName}`);

    if (!websiteUrl) {
      this.log('No website URL - skipping logo');
      return null;
    }

    try {
      const domain = new URL(websiteUrl).hostname;

      // NEW STRATEGY: Save domain for hotlinking (complies with Brandfetch TOS)
      // Frontend will construct: https://cdn.brandfetch.io/{domain}?c={clientId}
      // This is LEGAL under Brandfetch free tier

      // Verify domain is accessible (quick HEAD request)
      try {
        await axios.head(websiteUrl, { timeout: 3000 });
        this.log(`Domain verified: ${domain}`);

        // Return domain as "path" for backward compatibility
        // Frontend Logo component will use this to construct Brandfetch URL
        return {
          path: `hotlink:${domain}`, // Special format to indicate hotlinking
          url: domain // Store just the domain
        };
      } catch (verifyError) {
        this.log(`Domain verification failed: ${(verifyError as Error).message}`);
        return null;
      }
    } catch (urlError) {
      this.log(`Invalid website URL: ${(urlError as Error).message}`);
      return null;
    }
  }

  // --------------------------------------------------------------------------
  // STEP E: FIND SIMILAR CONTEXT (Deduplication)
  // --------------------------------------------------------------------------

  private async findSimilarContext(
    contextTitle: string,
    threshold = 0.9
  ): Promise<{ id: string; title: string } | null> {
    this.log(`Checking for similar contexts: "${contextTitle}"`);

    const { data: contexts } = await this.supabase.from('contexts').select('id, title, slug');

    if (!contexts || contexts.length === 0) return null;

    const normalize = (t: string) =>
      t.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();

    const newWords = new Set(normalize(contextTitle).split(' '));

    for (const ctx of contexts) {
      const existingWords = new Set(normalize(ctx.title).split(' '));
      const intersection = new Set([...newWords].filter((w) => existingWords.has(w)));
      const union = new Set([...newWords, ...existingWords]);
      const similarity = intersection.size / union.size;

      if (similarity >= threshold) {
        this.log(`Found similar context: "${ctx.title}" (${(similarity * 100).toFixed(1)}% match)`);
        return { id: ctx.id, title: ctx.title };
      }
    }

    return null;
  }

  // --------------------------------------------------------------------------
  // STEP F: CREATE KNOWLEDGE GRAPH LINKS
  // --------------------------------------------------------------------------

  private async createGraphLinks(
    toolId: string,
    graphTags: HunterAnalysis['graphTags']
  ): Promise<void> {
    this.log('Creating Knowledge Graph links...');

    // Link functions
    for (const fn of graphTags.functions) {
      await this.supabase.rpc('link_tool_to_category', {
        p_tool_id: toolId,
        p_category_name: fn,
        p_category_type: 'function',
      });
    }

    // Link audiences
    for (const aud of graphTags.audiences) {
      await this.supabase.rpc('link_tool_to_category', {
        p_tool_id: toolId,
        p_category_name: aud,
        p_category_type: 'audience',
      });
    }

    // Link platforms
    for (const plat of graphTags.platforms) {
      await this.supabase.rpc('link_tool_to_category', {
        p_tool_id: toolId,
        p_category_name: plat,
        p_category_type: 'platform',
      });
    }

    this.log(`Linked ${graphTags.functions.length} functions, ${graphTags.audiences.length} audiences, ${graphTags.platforms.length} platforms`);
  }

  // --------------------------------------------------------------------------
  // STEP G: SAVE TO DATABASE
  // --------------------------------------------------------------------------

  private async saveToDatabase(
    toolName: string,
    analysis: HunterAnalysis,
    embedding: number[],
    logo: { path: string; url: string } | null,
    contextTitle?: string,
    categorySlug?: string,
    sources?: Array<{ url: string; title: string; snippet: string; domain: string }>
  ): Promise<{ toolId: string; contextId: string | null; reviewId: string | null }> {
    this.log(`Saving to database: ${toolName}`);

    const toolSlug = this.slugify(toolName);

    // Find category (legacy - for backwards compatibility)
    let categoryId: string | null = null;
    if (categorySlug) {
      const { data: cat } = await this.supabase
        .from('categories')
        .select('id')
        .eq('slug', categorySlug)
        .single();
      categoryId = cat?.id || null;
    }

    // Upsert Tool (include Knowledge Card as metadata)
    const toolData: ToolInsert & { metadata?: unknown } = {
      name: toolName,
      slug: toolSlug,
      website: analysis.websiteUrl || null,
      logo_path: logo?.path || null,
      logo_url: logo?.url || null,
      short_description: analysis.shortDescription || null,
      category_id: categoryId,
      pricing_type: analysis.pricingType,
      embedding,
      // Store Knowledge Card for comparison tables
      metadata: analysis.knowledgeCard || null,
    };

    const { data: tool, error: toolError } = await this.supabase
      .from('tools')
      .upsert(toolData, { onConflict: 'slug' })
      .select('id')
      .single();

    if (toolError) throw new Error(`Failed to save tool: ${toolError.message}`);

    // Create Knowledge Graph links
    await this.createGraphLinks(tool.id, analysis.graphTags);

    // Create default affiliate offer
    if (analysis.websiteUrl) {
      const offerData: AffiliateOfferInsert = {
        tool_id: tool.id,
        url: analysis.websiteUrl,
        cta_text: 'Visit Website',
        is_affiliate: false,
        is_primary: true,
      };

      await this.supabase.from('affiliate_offers').upsert(offerData, {
        onConflict: 'tool_id,is_primary',
        ignoreDuplicates: true,
      });
    }

    // If no context, we're done
    if (!contextTitle) {
      return { toolId: tool.id, contextId: null, reviewId: null };
    }

    // Check for similar context
    const similarContext = await this.findSimilarContext(contextTitle);
    let contextId: string;

    if (similarContext) {
      this.log(`Reusing existing context: "${similarContext.title}"`);
      contextId = similarContext.id;
    } else {
      // Remove "best" prefix from slug since route is already /best/
      let contextSlug = this.slugify(contextTitle);
      if (contextSlug.startsWith('best-')) {
        contextSlug = contextSlug.replace(/^best-/, '');
      }

      // Get category IDs for context graph relationships
      let functionCategoryId: string | null = null;
      let audienceCategoryId: string | null = null;

      if (analysis.graphTags.functions.length > 0) {
        const { data } = await this.supabase
          .from('categories')
          .select('id')
          .eq('type', 'function')
          .ilike('name', analysis.graphTags.functions[0])
          .single();
        functionCategoryId = data?.id || null;
      }

      if (analysis.graphTags.audiences.length > 0) {
        const { data } = await this.supabase
          .from('categories')
          .select('id')
          .eq('type', 'audience')
          .ilike('name', analysis.graphTags.audiences[0])
          .single();
        audienceCategoryId = data?.id || null;
      }

      // Build structured title parts
      const titleParts = analysis.titleParts || {
        noun: contextTitle.replace(/^best\s+/i, '').replace(/\s+for\s+.*$/i, ''),
        modifier: contextTitle.match(/for\s+(.+)$/i)?.[1] ? `for ${contextTitle.match(/for\s+(.+)$/i)![1]}` : undefined,
      };

      const contextData = {
        title: contextTitle,
        slug: contextSlug,
        category_id: categoryId,
        title_template: 'best' as const,
        title_noun: titleParts.noun,
        title_modifier: titleParts.modifier || null,
        function_category_id: functionCategoryId,
        audience_category_id: audienceCategoryId,
      };

      const { data: context, error: contextError } = await this.supabase
        .from('contexts')
        .upsert(contextData, { onConflict: 'slug' })
        .select('id')
        .single();

      if (contextError) throw new Error(`Failed to save context: ${contextError.message}`);
      contextId = context.id;
    }

    // Create Review (with status based on mode)
    const reviewData: ReviewInsert & { status?: string; sources?: unknown } = {
      tool_id: tool.id,
      context_id: contextId,
      score: analysis.score,
      summary_markdown: analysis.summary,
      pros: analysis.pros,
      cons: analysis.cons,
      sentiment_tags: analysis.sentimentTags,
    };

    // Add sources if provided
    if (sources && sources.length > 0) {
      reviewData.sources = sources;
    }

    // DRAFT MODE: Reviews start as drafts
    if (this.config.isDraftMode) {
      (reviewData as Record<string, unknown>).status = 'draft';
    }

    const { data: review, error: reviewError } = await this.supabase
      .from('reviews')
      .upsert(reviewData, { onConflict: 'tool_id,context_id' })
      .select('id')
      .single();

    if (reviewError) throw new Error(`Failed to save review: ${reviewError.message}`);

    return { toolId: tool.id, contextId, reviewId: review.id };
  }

  // --------------------------------------------------------------------------
  // MAIN HUNT METHOD
  // --------------------------------------------------------------------------

  async hunt(input: HunterInput): Promise<HunterResult> {
    const startTime = Date.now();
    this.logs = [];

    this.log(`Starting hunt for: ${input.toolName}`);
    if (input.contextTitle) this.log(`Context: ${input.contextTitle}`);
    if (this.config.isDraftMode) this.log(`Mode: DRAFT (requires review)`);

    try {
      // Scout (Search)
      const scoutResult = await this.scout(input.toolName, input.contextTitle);
      this.log(`Scouted ${scoutResult.reviewsSnippets.length + scoutResult.pricingSnippets.length} snippets`);

      // Pass 1: Extract Knowledge Card (The Librarian)
      const { knowledgeCard, tokensUsed: pass1Tokens } = await this.extractKnowledgeCard(
        input.toolName,
        scoutResult
      );
      this.log(`[Pass 1] Extracted ${knowledgeCard.features.core.length} core features, ${knowledgeCard.platforms.length} platforms`);

      // Pass 2: Synthesize Review (The Architect)
      const { analysis, tokensUsed: pass2Tokens } = await this.synthesize(
        input.toolName,
        scoutResult,
        knowledgeCard,
        input.contextTitle
      );
      const tokensUsed = pass1Tokens + pass2Tokens;
      this.log(`[Pass 2] Synthesized (score: ${analysis.score}, total tokens: ${tokensUsed})`);

      // Generate Embedding
      const embeddingText = `${input.toolName}: ${analysis.shortDescription || ''} ${analysis.summary}`;
      const embedding = await this.generateEmbedding(embeddingText.slice(0, 8000));
      this.log(`Generated embedding (${embedding.length} dimensions)`);

      // Fetch Logo
      const logo = await this.fetchAndUploadLogo(input.toolName, analysis.websiteUrl);
      this.log(logo ? 'Logo uploaded' : 'No logo found');

      // Save
      const result = await this.saveToDatabase(
        input.toolName,
        analysis,
        embedding,
        logo,
        input.contextTitle,
        input.categorySlug,
        scoutResult.sources
      );

      const durationMs = Date.now() - startTime;
      this.log(`Hunt complete in ${(durationMs / 1000).toFixed(2)}s`);

      return {
        success: true,
        ...result,
        tokensUsed,
        durationMs,
      };
    } catch (error) {
      const err = error as Error;
      this.log(`Hunt failed: ${err.message}`);

      return {
        success: false,
        error: err.message,
        durationMs: Date.now() - startTime,
      };
    }
  }

  // --------------------------------------------------------------------------
  // QUEUE PROCESSING (for Cron)
  // --------------------------------------------------------------------------

  async processNextFromQueue(): Promise<HunterResult & { queueItemId?: string }> {
    this.log('Claiming next item from queue...');

    // Atomically claim next item
    const { data: queueItem, error } = await this.supabase.rpc('claim_next_queue_item');

    if (error || !queueItem) {
      this.log('No items in queue or error claiming');
      return { success: false, error: 'No items in queue' };
    }

    this.log(`Processing queue item: ${queueItem.tool_name}`);

    const result = await this.hunt({
      toolName: queueItem.tool_name,
      contextTitle: queueItem.context_title || undefined,
      categorySlug: queueItem.category_slug || undefined,
      queueItemId: queueItem.id,
    });

    // Update queue item status
    if (result.success) {
      await this.supabase.rpc('complete_queue_item', {
        p_queue_id: queueItem.id,
        p_tool_id: result.toolId,
        p_context_id: result.contextId || null,
        p_review_id: result.reviewId || null,
      });
    } else {
      await this.supabase.rpc('fail_queue_item', {
        p_queue_id: queueItem.id,
        p_error: result.error || 'Unknown error',
      });
    }

    return { ...result, queueItemId: queueItem.id };
  }

  // --------------------------------------------------------------------------
  // CONTEXT-FIRST HUNT (Best X for Y discovery)
  // --------------------------------------------------------------------------

  private async scoutForContext(contextQuery: string, guidance?: ContextHuntGuidance): Promise<{
    toolsSnippets: string[];
    reviewsSnippets: string[];
    pricingSnippets: string[];
    sources: Array<{ url: string; title: string; snippet: string; domain: string }>;
  }> {
    this.log(`Scouting for context: ${contextQuery}`);

    // Base queries
    const queries = [
      contextQuery,
      `${contextQuery} 2024`,
      `${contextQuery} comparison`,
      `${contextQuery} pricing free`,
    ];

    // Add source-specific queries if guidance specifies domains
    if (guidance?.sourcesToCheck && guidance.sourcesToCheck.length > 0) {
      for (const source of guidance.sourcesToCheck.slice(0, 2)) {
        queries.push(`site:${source} ${contextQuery}`);
      }
      this.log(`Added source queries for: ${guidance.sourcesToCheck.join(', ')}`);
    }

    // Add must-include tool queries
    if (guidance?.mustIncludeTools && guidance.mustIncludeTools.length > 0) {
      for (const tool of guidance.mustIncludeTools.slice(0, 3)) {
        queries.push(`${tool} review ${contextQuery}`);
      }
      this.log(`Added must-include tool queries for: ${guidance.mustIncludeTools.join(', ')}`);
    }

    const results = await Promise.all(
      queries.map((q) => this.withRetry(() => this.searchSerper(q), `Search: ${q}`))
    );

    // Extract snippets with URLs so AI can cite sources
    const extractSnippets = (response: SerperResponse, limit: number): string[] =>
      response.organic?.slice(0, limit).map((r) => `[${r.link}] ${r.title}: ${r.snippet}`) || [];

    // Extract sources for storage (deduplicated by URL)
    const sourceMap = new Map<string, { url: string; title: string; snippet: string; domain: string }>();
    for (const response of results) {
      for (const result of response.organic?.slice(0, 8) || []) {
        if (!sourceMap.has(result.link)) {
          try {
            const domain = new URL(result.link).hostname.replace(/^www\./, '');
            sourceMap.set(result.link, {
              url: result.link,
              title: result.title,
              snippet: result.snippet,
              domain,
            });
          } catch {
            // Skip invalid URLs
          }
        }
      }
    }

    return {
      toolsSnippets: extractSnippets(results[0], 8),
      reviewsSnippets: [...extractSnippets(results[1], 5), ...extractSnippets(results[2], 5)].slice(0, 8),
      pricingSnippets: extractSnippets(results[3], 5),
      sources: Array.from(sourceMap.values()),
    };
  }

  private async synthesizeContextDiscovery(
    contextQuery: string,
    scoutResult: Awaited<ReturnType<typeof this.scoutForContext>>,
    maxTools: number,
    guidance?: ContextHuntGuidance
  ): Promise<{ tools: ContextToolAnalysis[]; contextMeta: ContextMeta; tokensUsed: number }> {
    this.log(`Synthesizing context discovery for: ${contextQuery}`);

    // Try to load prompt from DB
    let promptTemplate = await this.getPromptTemplate('hunter_context_discovery');

    if (!promptTemplate) {
      this.log('Using fallback context discovery prompt');
      promptTemplate = FALLBACK_CONTEXT_DISCOVERY_PROMPT;
    }

    // Build guidance text
    let guidanceText = '';
    if (guidance) {
      if (guidance.mustIncludeTools && guidance.mustIncludeTools.length > 0) {
        guidanceText += `\n\nIMPORTANT: You MUST include these tools in your response (if they fit the context): ${guidance.mustIncludeTools.join(', ')}`;
      }
      if (guidance.specialInstructions) {
        guidanceText += `\n\nSpecial Instructions: ${guidance.specialInstructions}`;
      }
    }

    const prompt = this.interpolateTemplate(promptTemplate, {
      contextQuery,
      toolsSnippets: scoutResult.toolsSnippets.join('\n'),
      reviewsSnippets: scoutResult.reviewsSnippets.join('\n'),
      pricingSnippets: scoutResult.pricingSnippets.join('\n'),
    }) + guidanceText;

    const model = this.gemini.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        temperature: 0.3,
        responseMimeType: 'application/json',
      },
    });

    const response = await this.withRetry(
      () => model.generateContent(prompt),
      'Gemini context discovery'
    );

    const content = response.response.text();
    if (!content) throw new Error('Empty response from Gemini');

    const parsed = JSON.parse(content);
    const tokensUsed = Math.ceil((prompt.length + content.length) / 4);

    // Limit tools to maxTools
    const tools = (parsed.tools || []).slice(0, maxTools);

    return {
      tools,
      contextMeta: parsed.contextMeta,
      tokensUsed,
    };
  }

  async huntContext(input: ContextHuntInput): Promise<ContextHuntResult> {
    const startTime = Date.now();
    this.logs = [];
    const maxTools = input.maxTools || 5;

    this.log(`Starting context hunt: ${input.contextQuery}`);
    this.log(`Max tools: ${maxTools}`);
    if (this.config.isDraftMode) this.log(`Mode: DRAFT (requires review)`);
    if (input.guidance) {
      if (input.guidance.mustIncludeTools?.length) {
        this.log(`Must include tools: ${input.guidance.mustIncludeTools.join(', ')}`);
      }
      if (input.guidance.sourcesToCheck?.length) {
        this.log(`Sources to check: ${input.guidance.sourcesToCheck.join(', ')}`);
      }
      if (input.guidance.specialInstructions) {
        this.log(`Special instructions: ${input.guidance.specialInstructions.slice(0, 50)}...`);
      }
    }

    try {
      // Scout for context (with guidance)
      const scoutResult = await this.scoutForContext(input.contextQuery, input.guidance);
      this.log(`Scouted ${scoutResult.toolsSnippets.length + scoutResult.reviewsSnippets.length} snippets`);

      // Synthesize - discover tools (with guidance)
      const { tools, contextMeta, tokensUsed } = await this.synthesizeContextDiscovery(
        input.contextQuery,
        scoutResult,
        maxTools,
        input.guidance
      );
      this.log(`Discovered ${tools.length} tools`);

      // Create context first
      const contextTitle = `Best ${contextMeta.titleNoun} ${contextMeta.titleModifier || ''}`.trim();
      let contextSlug = this.slugify(contextTitle);
      if (contextSlug.startsWith('best-')) {
        contextSlug = contextSlug.replace(/^best-/, '');
      }

      const contextData: ContextInsert = {
        title: contextTitle,
        slug: contextSlug,
        intro_text: contextMeta.introText,
        meta_description: contextMeta.metaDescription,
        title_template: 'best',
        title_noun: contextMeta.titleNoun,
        title_modifier: contextMeta.titleModifier || null,
      };

      const { data: context, error: contextError } = await this.supabase
        .from('contexts')
        .upsert(contextData, { onConflict: 'slug' })
        .select('id')
        .single();

      if (contextError) throw new Error(`Failed to create context: ${contextError.message}`);
      this.log(`Created context: ${contextTitle} (${context.id})`);

      // Process each tool
      let toolsCreated = 0;
      let reviewsCreated = 0;

      for (const toolData of tools) {
        try {
          this.log(`Processing tool: ${toolData.name}`);

          // Generate embedding for tool
          const embeddingText = `${toolData.name}: ${toolData.shortDescription || ''} ${toolData.summary}`;
          const embedding = await this.generateEmbedding(embeddingText.slice(0, 8000));

          // Fetch logo
          const logo = await this.fetchAndUploadLogo(toolData.name, toolData.websiteUrl);

          // Create/update tool
          const toolSlug = this.slugify(toolData.name);
          const toolRecord: ToolInsert = {
            name: toolData.name,
            slug: toolSlug,
            website: toolData.websiteUrl || null,
            logo_path: logo?.path || null,
            logo_url: logo?.url || null,
            short_description: toolData.shortDescription || null,
            long_description: toolData.summary,
            pricing_type: toolData.pricingType as PricingModel,
            embedding: embedding as unknown as string,
          };

          const { data: tool, error: toolError } = await this.supabase
            .from('tools')
            .upsert(toolRecord, { onConflict: 'slug' })
            .select('id')
            .single();

          if (toolError) {
            this.log(`Failed to create tool ${toolData.name}: ${toolError.message}`);
            continue;
          }
          toolsCreated++;

          // Create review
          const reviewRecord: ReviewInsert & { sources?: unknown } = {
            tool_id: tool.id,
            context_id: context.id,
            score: toolData.score,
            summary_markdown: toolData.summary,
            pros: toolData.pros,
            cons: toolData.cons,
            display_order: tools.indexOf(toolData) + 1,
          };

          // Add sources from the scout result (shared across all tools in this context)
          if (scoutResult.sources && scoutResult.sources.length > 0) {
            reviewRecord.sources = scoutResult.sources;
          }

          if (this.config.isDraftMode) {
            (reviewRecord as Record<string, unknown>).status = 'draft';
          }

          const { error: reviewError } = await this.supabase
            .from('reviews')
            .upsert(reviewRecord, { onConflict: 'tool_id,context_id' });

          if (reviewError) {
            this.log(`Failed to create review for ${toolData.name}: ${reviewError.message}`);
            continue;
          }
          reviewsCreated++;

        } catch (err) {
          this.log(`Error processing ${toolData.name}: ${(err as Error).message}`);
        }
      }

      const durationMs = Date.now() - startTime;
      this.log(`Context hunt complete in ${(durationMs / 1000).toFixed(2)}s`);

      return {
        success: true,
        contextId: context.id,
        contextSlug: contextSlug,
        toolsCreated,
        reviewsCreated,
        tokensUsed,
        durationMs,
      };

    } catch (error) {
      const err = error as Error;
      this.log(`Context hunt failed: ${err.message}`);

      return {
        success: false,
        toolsCreated: 0,
        reviewsCreated: 0,
        error: err.message,
        durationMs: Date.now() - startTime,
      };
    }
  }
}

// Helper types for context discovery
interface ContextToolAnalysis {
  name: string;
  score: number;
  pros: string[];
  cons: string[];
  summary: string;
  pricingType: string;
  websiteUrl?: string;
  shortDescription?: string;
}

interface ContextMeta {
  titleNoun: string;
  titleModifier?: string;
  introText: string;
  metaDescription: string;
}

// Fallback prompt for context discovery
const FALLBACK_CONTEXT_DISCOVERY_PROMPT = `You are the StackHunt Discovery Agent. Find the BEST tools for a specific use case.

Output ONLY valid JSON:
{
  "tools": [
    {
      "name": "<tool name>",
      "score": <0-100>,
      "pros": [<3 strings>],
      "cons": [<3 strings>],
      "summary": "<100-150 words>",
      "pricingType": "<free|freemium|paid|enterprise|open_source>",
      "websiteUrl": "<url>",
      "shortDescription": "<max 200 chars>"
    }
  ],
  "contextMeta": {
    "titleNoun": "<e.g., Note-Taking Apps>",
    "titleModifier": "<e.g., for Students>",
    "introText": "<2-3 sentence intro>",
    "metaDescription": "<150-160 char SEO description>"
  }
}

IMPORTANT: Return UP TO 8 tools ranked by score. Only include tools that genuinely fit the use case - quality over quantity. If fewer than 8 quality tools exist for this niche, that's fine. Do NOT pad with irrelevant tools.

Context: "{{contextQuery}}"

Search Results:
## Top Tools: {{toolsSnippets}}
## Reviews: {{reviewsSnippets}}
## Pricing: {{pricingSnippets}}

JSON only:`;

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

// Helper to get env var from either Astro (import.meta.env) or Node (process.env)
function getEnv(key: string): string | undefined {
  // Try import.meta.env first (Astro runtime)
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return (import.meta.env as Record<string, string>)[key];
  }
  // Fallback to process.env (Node.js / CLI)
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }
  return undefined;
}

export function createHunter(options: {
  isDraftMode?: boolean;
} = {}): Hunter {
  const config: HunterConfig = {
    supabaseUrl: getEnv('SUPABASE_URL')!,
    supabaseServiceKey: getEnv('SUPABASE_SERVICE_ROLE_KEY')!,
    geminiApiKey: getEnv('GEMINI_API_KEY')!,
    serperApiKey: getEnv('SERPER_API_KEY')!,
    isDraftMode: options.isDraftMode ?? true, // Default to draft mode for safety
  };

  // Validate
  const missing: string[] = [];
  if (!config.supabaseUrl) missing.push('SUPABASE_URL');
  if (!config.supabaseServiceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!config.geminiApiKey) missing.push('GEMINI_API_KEY');
  if (!config.serperApiKey) missing.push('SERPER_API_KEY');

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return new Hunter(config);
}
