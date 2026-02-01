/**
 * Gemini Service - Google AI wrapper
 *
 * Handles text generation and embeddings via Google's Gemini API.
 *
 * @module hunter/services/gemini
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  KnowledgeCardSchema,
  GeminiKnowledgeCardSchema,
  type KnowledgeCard,
} from '../../knowledge-card';
import { AnalysisSchema, type HunterAnalysis } from '../types';
import { classifyGeminiError } from '../errors';

export interface GeminiConfig {
  apiKey: string;
}

export interface ExtractKnowledgeCardInput {
  toolName: string;
  contextTitle?: string;          // Context for audience-aware extraction (e.g., "Google Ads alternatives")
  reviewsSnippets: string[];
  pricingSnippets: string[];
  alternativesSnippets: string[];
  companySnippets: string[];      // Company info, funding, history
  technicalSnippets: string[];    // API, export, integrations
  pricingDeepContent?: string;    // Full page content from pricing pages (via Jina.ai)
}

export interface SynthesizeInput {
  toolName: string;
  contextTitle?: string;
  reviewsSnippets: string[];
  pricingSnippets: string[];
  alternativesSnippets: string[];
  // V3.1: Tribal Knowledge Snippets
  budgetAnalystSnippets: string[];      // Hidden costs, billing logic, implementation fees
  tribalKnowledgeSnippets: string[];    // Reddit reviews, honest feedback, power tips
  knowledgeCardFacts: string;
  existingCategories: {
    functions: string[];
    audiences: string[];
    platforms: string[];
  };
  promptTemplate: string;
}

export class GeminiService {
  private client: GoogleGenerativeAI;

  constructor(config: GeminiConfig) {
    this.client = new GoogleGenerativeAI(config.apiKey);
  }

  /**
   * Extract structured facts (Pass 1 - The Librarian + Forensic Accountant)
   */
  async extractKnowledgeCard(
    input: ExtractKnowledgeCardInput,
    withRetry?: <T>(fn: () => Promise<T>, operation: string) => Promise<T>
  ): Promise<{ knowledgeCard: KnowledgeCard; tokensUsed: number }> {
    const toolSlug = input.toolName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const prompt = `You are a fact extraction system with THREE roles:
1. THE LIBRARIAN: Extract verifiable facts about "${input.toolName}"
2. THE FORENSIC ACCOUNTANT: Extract PRICING LOGIC (not just strings) for cost calculations
3. THE INVESTIGATOR: Extract company info, competitors, and technical capabilities

${input.contextTitle ? `
CONTEXT-AWARE EXTRACTION (CRITICAL):
You are researching "${input.toolName}" specifically for the context: "${input.contextTitle}".

TARGET AUDIENCE ALIGNMENT:
- Only extract pricing and features relevant to this context
- If the context is about BUSINESS/MARKETING/TEAMS/ENTERPRISE or mentions "alternatives" to ad platforms:
  * Focus on business pricing (seat-based, ad spend, enterprise tiers)
  * IGNORE consumer-only plans (ad-free browsing, personal entertainment subscriptions)
  * Example: For "Reddit" in "Google Ads alternatives" context → Extract "Reddit Ads" (advertising platform)

- If the context is about PERSONAL/STUDENT/INDIVIDUAL use or entertainment:
  * Focus on low-cost individual plans, free tiers, student discounts
  * Example: For "Reddit" in student/entertainment context → Extract "Reddit Premium" (consumer subscription)
` : ''}

CRITICAL RULES:
- Only extract facts that are explicitly mentioned or strongly implied in the sources
- Use null for any field where information is not available
- Prefer verified information from official sources
- Set data_quality to "high" if most facts are from official sources, "medium" if from reviews, "low" if limited data

=== THE LIBRARIAN: COMPANY & PRODUCT FACTS ===

Extract these fields INTO THE NESTED STRUCTURE:

1. company object:
   - name: Official company name (e.g., "Slack Technologies", "Notion Labs")
   - founded_year: Year founded as NUMBER (e.g., 2013 not "2013")
   - headquarters: City, Country (e.g., "San Francisco, USA")
   - employee_count: "1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"
   - funding_stage: "bootstrapped", "seed", "series-a", "series-b", "series-c+", "public", "acquired"

2. features object:
   - core: Array of 3-5 most important features
   - unique: Array of 1-3 unique differentiating features

3. competitive object:
   - main_alternatives: Array of 3-5 direct competitors mentioned in sources
   - differentiators: What makes this tool different
   - best_for: "Best for X because Y"

4. learning_curve: "minutes", "hours", "days", "weeks" - how long to get productive

=== THE FORENSIC ACCOUNTANT: PRICING EXTRACTION (CRITICAL) ===

Do NOT just extract "$10/mo" as a string. Extract the PRICING LOGIC.

STEP 1: IDENTIFY THE BUSINESS MODEL (CRITICAL - DO THIS FIRST)

Ask yourself: "What type of product is this?" Use the Financial & Functional Signals below:

1. AD PLATFORM? (Check for these signals in the content)
   Financial Signals: Pricing mentions 'CPC', 'CPM', 'CPA', 'Bidding', 'Daily Budget', 'Campaign Budget', 'Ad Spend'
   Functional Signals: Features include 'Audience targeting', 'Ad campaigns', 'Impressions', 'Conversions', 'Pixel tracking'
   → If these signals are present: Set model: 'ad_spend'
   → These products sell ADVERTISING, not software subscriptions
   → CRITICAL: Ignore consumer subscription pricing if you see both (e.g., Reddit Premium $5.99/mo vs Reddit Ads with CPC)

2. USAGE-BASED API/CLOUD? (Check for these signals in the content)
   Financial Signals: Pricing shows 'per request', 'per token', 'per GB', 'per message', 'pay as you go', variable unit costs
   Functional Signals: Features include 'API access', 'Rate limits', 'Consumption-based', 'Free tier quotas'
   → If these signals are present: Set model: 'usage_based'
   → These charge per unit consumed (messages, tokens, requests, GB, API calls)

3. SAAS SUBSCRIPTION? (Default for most business software)
   Financial Signals: Fixed monthly/annual pricing, 'per seat', 'per user', 'per member', tiered plans (Starter/Pro/Enterprise)
   Functional Signals: Features include 'Team collaboration', 'Workspaces', 'Admin controls', 'User management'
   → If these signals are present: Use standard models: 'per_seat', 'flat', 'tiered', 'hybrid', etc.

CONSUMER VS. BUSINESS PRODUCTS (IMPORTANT DISTINCTION):
Many platforms have BOTH consumer and business products as SEPARATE offerings:
- Reddit Premium ($5.99/mo) vs Reddit Ads (ad platform) → These are DIFFERENT PRODUCTS
- YouTube Premium ($11.99/mo) vs YouTube Ads (ad platform) → These are DIFFERENT PRODUCTS
- LinkedIn Premium ($29.99/mo) vs LinkedIn Ads (ad platform) → These are DIFFERENT PRODUCTS

IF the tool has both a consumer subscription AND a business product:
→ They are likely SEPARATE products - focus on what matches the context
→ If context is "Google Ads alternatives" → Extract "Reddit Ads" (business product)
→ If context is "Netflix alternatives" → Extract "Reddit Premium" (consumer product)

=== PRODUCT DNA IDENTIFICATION (MANDATORY FOR MULTI-PRODUCT BRANDS) ===

Before extracting, identify the 'Product DNA' from the actual content you're reading:

1. AD PLATFORM SIGNALS (if ALL of these are present, this is an ad platform):
   Financial Signals:
   - Pricing uses terms: 'Bidding', 'CPC', 'CPM', 'CPA', 'Ad Spend', 'Daily Budget', 'Campaign Budget'
   - Pricing is variable/auction-based, not fixed monthly subscriptions
   - Mentions 'Minimum spend' or 'Budget recommendations'

   Functional Signals:
   - Features include: 'Audience targeting', 'Campaign management', 'Ad formats', 'Pixel tracking', 'Conversion tracking'
   - Focuses on 'Reach', 'Impressions', 'Clicks', 'Conversions'
   - Mentions 'Advertisers', 'Ad accounts', 'Campaign objectives'

   → If these signals match: Name the tool "[Brand] Ads" (e.g., "Reddit Ads", "LinkedIn Ads")
   → Set pricing model to 'ad_spend'
   → Website selection: Look for business/ads URLs in your sources:
     * Prefer: business.domain.com, ads.domain.com, advertising.domain.com, or /business/ads paths
     * Examples: business.reddit.com (not www.reddit.com), ads.google.com (not google.com)
     * If multiple URLs found, choose the one that's specifically for advertisers/business
     * If only generic domain found (www.domain.com), use it but this is acceptable

2. SAAS/BUSINESS TOOL SIGNALS (if these are present, this is a SaaS product):
   Financial Signals:
   - Pricing uses: 'Per Seat', 'Per User', 'Per Member', '/month', '/year'
   - Fixed monthly/annual subscription tiers
   - Pricing scales with team size

   Functional Signals:
   - Features include: 'Collaboration', 'Team workspaces', 'Project management', 'Admin controls', 'Permissions'
   - Focuses on 'Productivity', 'Workflows', 'Integrations', 'Automation'
   - Mentions 'Teams', 'Organizations', 'Departments'

   → If these signals match: Name the tool "[Brand]" or "[Brand] [Product]" (e.g., "Slack", "LinkedIn Sales Navigator")
   → Set pricing model to 'per_seat', 'tiered', or appropriate SaaS model

3. CONSUMER PRODUCT SIGNALS (if these are present, this is a consumer subscription):
   Financial Signals:
   - Pricing for 'Individual', 'Family', 'Student' plans
   - Single-user pricing (not per-seat)
   - No team/business tiers

   Functional Signals:
   - Features include: 'Ad-free', 'Premium content', 'Personal storage', 'Downloads', 'Offline access'
   - Focuses on entertainment, personal use, content consumption
   - No collaboration or team features

   → If these signals match: Check context alignment:
     * If context is BUSINESS/MARKETING → DISCARD this product (wrong variant)
     * If context is CONSUMER/STUDENT → Name it "[Brand] Premium" or "[Brand] Plus"

VERIFICATION CHECKLIST (Use Signals, Not URLs):

Step 1: READ the pricing language in your sources
   - Does it say "CPC" and "Campaigns"? → Ad Platform
   - Does it say "Per User" and "Teams"? → SaaS
   - Does it say "Individual" and "Ad-free"? → Consumer

Step 2: CHECK the feature list against Product DNA signals above
   - Count how many signals match each category
   - The category with most matches = Product Type

Step 3: VALIDATE against context
   - If context is "Google Ads alternatives" but you found "$5.99/mo Individual Premium" → WRONG PRODUCT
   - If context is "Netflix alternatives" but you found "CPC bidding" → WRONG PRODUCT

Step 4: SELECT THE RIGHT WEBSITE URL:
   - If identified as AD PLATFORM → Look for business/ads URLs in your sources (business.domain.com, ads.domain.com)
   - If identified as SAAS → Look for platform/app URLs (app.domain.com, platform.domain.com) or use primary domain
   - If multiple URLs available, choose the one most specific to the product variant you're extracting
   - If only generic URL available (www.domain.com), that's acceptable

Step 5: IF SIGNALS DON'T MATCH CONTEXT:
   - Note in pricing_analysis_log: "Found [Product Type] signals but context requires [Expected Type]"
   - Set confidence to 'low'
   - Extract whatever data is available but flag: "May need re-hunt with explicit product name (e.g., 'Reddit Ads' instead of 'Reddit')"

However, if the tool has multiple PRICING TIERS for the same product:
→ Extract ALL tiers (Free, Team, Business, Enterprise)
→ Tag each tier with appropriate target_audience
→ Example: Notion has Free (individual), Plus (team), Business (business), Enterprise (enterprise)

BUNDLE DETECTION (CRITICAL):
BEFORE extracting pricing, ask: "Can this tool be purchased ALONE, or is it only available as part of a larger suite?"

Detection criteria (Use ONLY these signals, not brand recognition):
- If pricing pages say "Included in [Suite]" or "Part of [Suite]" → BUNDLED
- If you can't find a standalone pricing page for THIS tool → BUNDLED
- If the only prices are for a parent product (e.g., showing "Workspace Business Starter $6/user" but no standalone pricing) → BUNDLED
- If the product description mentions "included with" or "part of" a larger offering → BUNDLED

Common examples (for reference, but rely on signals above):
- Communication tools bundled in suites: Google Meet (in Workspace), Microsoft Teams (in 365)
- Storage tools bundled in suites: Google Drive (in Workspace), OneDrive (in 365)
- Productivity tools bundled in suites: Google Calendar (in Workspace), Outlook (in 365)

If the tool is BUNDLED (cannot be purchased alone):
1. In pricing_analysis_log, write: "BUNDLE DETECTED: ${input.toolName} is bundled in [Suite Name] and cannot be purchased separately. Extracting parent suite pricing."
2. Set is_standalone: false
3. Set bundled_in: "[Suite Name]" (e.g., "Google Workspace", "Microsoft 365")
4. Extract the PARENT suite's pricing (e.g., "Google Workspace Business Starter: $6/user/mo")
5. Set pricing_model to the parent suite's model (usually "per_seat")
6. In plan names, use the parent suite slug (e.g., "workspace-business-starter" NOT "meet-business-starter")
7. DO NOT use "${toolSlug}" in plan IDs - use the parent suite slug instead

UNIT NORMALIZATION (CRITICAL):
DO NOT multiply prices by team size. Extract the PER-UNIT price only.

Common mistakes to avoid:
- Slack Standard is ~$7.25/user/mo, NOT $72+ (that's 10 users × $7.25)
- Notion Plus is ~$10/user/mo, NOT $100+ (that's 10 users × $10)
- If you see $70-100 for a tool that's obviously per-user pricing, CHECK:
  1. Did you accidentally multiply by team size? (WRONG - extract just $7.25)
  2. Is this the annual total? (Calculate monthly: $87/year ÷ 12 = $7.25/mo)
  3. Is this enterprise pricing with minimums? (Extract the per-user rate, note minimums separately)

NEVER calculate team costs in price_monthly - that field is the per-unit price ONLY.
If there's a minimum seat purchase (e.g., "Min 10 seats"), extract that in min_seats field.

CHAIN OF THOUGHT (REQUIRED):
Before filling pricing data, think through this analysis and put it in "pricing_analysis_log":
1. "BUSINESS MODEL: [ad_platform / usage_api / saas_subscription]"
2. "CONSUMER FILTER: Found consumer pricing at $X/mo, discarding. Looking for business pricing."
   OR "No consumer pricing confusion detected."
3. For SaaS: "Found monthly price: $X" or "No monthly price found"
4. For SaaS: "Found annual price: $Y" OR "Annual shown as $X/mo billed annually"
5. For Ad Platforms: "Found minimum daily budget: $X/day → monthly = $Y" OR "Minimum budget: $X/mo"
6. For Ad Platforms: "Average CPC/CPM: $X per [unit]"
7. For Usage-Based: "Per-unit rate: $X per [unit]" OR "Free tier: X units, then $Y per unit"
8. "SCALING: Price is per [user/seat/flat/usage/click/token]"
9. "MODEL TYPE: [free/flat/per_seat/per_unit/tiered/hybrid/contact_sales/ad_spend/usage_based]"

ANNUAL PRICE RULES (CRITICAL - DO NOT SKIP):
- SaaS pricing is often displayed as "$X/mo billed annually"
- IF you see "$10/mo billed annually":
  - price_monthly: 10
  - price_annual: 120 (YOU MUST CALCULATE: 10 * 12)
- IF you see "$100/year":
  - price_monthly: 8.33 (Calculate: 100 / 12)
  - price_annual: 100
- DO NOT leave price_annual null if a monthly price exists and there's annual billing

SCALING UNIT RULES (MANDATORY FOR PER_SEAT):
- If the pricing model is "per_seat", scaling_unit CANNOT be null
- Look for: "per user", "per seat", "per member", "per agent"
- If the page says "$10/mo" in per-user context, set scaling_unit to "user"

1. IDENTIFY THE PRICING MODEL (from STEP 1 above):
   - "free": Completely free forever
   - "flat": Fixed price regardless of users (e.g., Basecamp $99/mo unlimited)
   - "per_seat": Price scales with users (e.g., Slack $8.75/user/mo)
   - "per_unit": Price scales with usage (e.g., Twilio per message)
   - "tiered": Multiple plans with different feature sets (e.g., HubSpot Free → Starter → Pro)
   - "hybrid": Combination (e.g., Notion has free tier + per-user paid)
   - "contact_sales": Enterprise pricing not publicly available
   - "ad_spend": Advertising platform with variable budgets (CPC/CPM bidding)
   - "usage_based": Pay-as-you-go API/cloud (per token, per request, per GB)

1a. SPECIAL HANDLING FOR AD_SPEND MODELS:
If model is 'ad_spend', extract variable pricing data:
- Look for "Minimum Daily Budget" or "Minimum Monthly Budget"
  * If found "$5/day minimum", calculate: price_monthly = 5 * 30 = 150
  * Put this in the plan's price_monthly field
- Look for average CPC (Cost Per Click) or CPM (Cost Per 1000 Impressions)
  * Extract the unit: variable_unit = "click" or "1k impressions"
  * Extract average price: variable_price = 0.50 (if "$0.50 per click")
  * Describe the range: variable_logic_desc = "Bidding based, typically $0.40-$2.00 CPC depending on targeting"
- Create one plan called "Self-Service" or "Advertising" with this data
- List platform features in the plan's features array (e.g., ["Pixel tracking", "Audience targeting", "A/B testing"])

1b. SPECIAL HANDLING FOR USAGE_BASED MODELS:
If model is 'usage_based', extract per-unit pricing:
- Look for the base unit (e.g., "per 1,000 requests", "per 1M tokens", "per GB")
  * Extract: variable_unit = "1k requests" or "1M tokens"
  * Extract: variable_price = 0.02 (if "$0.02 per 1M tokens")
- Look for "Monthly Minimum" or "Free Tier" limits
  * If "$0/mo up to 10k requests", create a Free plan with max limits
  * If "$10/mo minimum", put that in price_monthly
- Describe the logic: variable_logic_desc = "Pay as you go, $0.02/1M tokens after free tier"

2. EXTRACT ALL PLANS (STORE EVERYTHING - UI will filter later):

CRITICAL: Extract EVERY pricing tier you find, regardless of context.
- If you find Free, Team, Business, Enterprise → Extract all 4
- If researching for business context but tool has a Free tier → Still extract the Free tier
- If researching for student context but tool has Enterprise → Still extract Enterprise tier

The UI will filter plans based on page context. Your job is to capture ALL the data.

For each plan extracted:
   - Plan ID: Use format "${toolSlug}-{plan-name}" (e.g., "${toolSlug}-pro", "${toolSlug}-enterprise")
   - target_audience: REQUIRED field. Infer who this plan targets based on features/pricing:
     * "individual" - Solo users, freelancers (usually 1 user, basic features, personal/hobby tier)
     * "team" - Small teams 2-10 people (collaboration features, shared workspaces)
     * "business" - Medium businesses 10-100 (advanced features, some compliance, admin controls)
     * "enterprise" - Large organizations 100+ (SSO, SLA, custom contracts, dedicated support)
     If unclear from plan name/features, infer from: Free/Personal→individual, Starter/Team→team, Professional/Business→business, Enterprise/Premium→enterprise
   - price_monthly: Monthly price as NUMBER (e.g., 10 not "$10/mo"). Use 0 for free plans.
   - price_annual: TOTAL annual price as NUMBER (e.g., 96 not "8/mo billed annually"). null if no annual option.
   - For per-seat plans: extract scaling_unit ("user"/"seat") AND price_per_unit
   - included_units: If plan includes X users for base price (e.g., "includes 5 users")
   - max_users: User limit. null = unlimited.
   - Feature flags: includes_sso, includes_api, includes_sla, includes_priority_support, is_enterprise

3. DETECT HIDDEN COSTS:
   - min_seats: Minimum seat purchase (e.g., "Min 5 seats")
   - implementation_fee: One-time setup fee
   - annual_discount_pct: % discount for annual billing (e.g., 20 means 20% off)

4. SET CONFIDENCE:
   - "high": Data from official pricing page or official website
   - "medium": Data from review sites (G2, Capterra)
   - "low": Inferred, incomplete, or potentially outdated

=== THE INVESTIGATOR: TECHNICAL CAPABILITIES ===

5. EXTRACT PORTABILITY DATA (most SaaS tools have these - look carefully):
   - has_data_export: Can users export their data? (Most SaaS tools = true)
   - export_formats: ["CSV", "JSON", "PDF", etc.] - common formats supported
   - has_api_export: Can users programmatically export via API? (If API exists = true)
   - migration_difficulty: How hard to leave? (trivial/easy/moderate/hard/locked)
   - import_from: Tools that have import wizards INTO this tool
   - export_to: Tools that have export wizards FROM this tool

6. EXTRACT INTEGRATIONS:
   - has_api: Does it have a public API? (Most modern SaaS tools = true)
   - has_zapier: Does it integrate with Zapier/Make?
   - has_webhooks: Does it support webhooks?
   - notable: Array of notable integrations [{name, type, direction}]

7. EXTRACT TAXONOMY:
   - primary_function: Main category ("Project Management", "CRM", "Communication")
   - secondary_functions: Other things it does
   - likely_departments: Who typically pays? ["Engineering", "Marketing", "Sales", etc.]

Search Results:

## Reviews & User Feedback:
${input.reviewsSnippets.join('\n')}

## Pricing & Features:
${input.pricingSnippets.join('\n')}

## Alternatives & Comparisons:
${input.alternativesSnippets.join('\n')}

## Company Info & Background:
${input.companySnippets.join('\n')}

## Technical & Integrations:
${input.technicalSnippets.join('\n')}
${input.pricingDeepContent ? `
=== DEEP DIVE: FULL PRICING PAGE CONTENT ===
(Use this RICH DATA for the Forensic Accountant role - it contains the actual pricing tables)
${input.pricingDeepContent}
` : ''}
Extract the knowledge card JSON with complete company info, smp_pricing, smp_taxonomy, smp_portability, and integrations sections.
IMPORTANT: Include "pricing_analysis_log" field with your chain of thought reasoning about pricing.`;

    const model = this.client.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        temperature: 0.1, // Low temperature for fact extraction
        responseMimeType: 'application/json',
        responseSchema: GeminiKnowledgeCardSchema as never,
      },
    });

    const generateFn = async () => {
      try {
        return await model.generateContent(prompt);
      } catch (error) {
        throw classifyGeminiError(error);
      }
    };
    const response = withRetry
      ? await withRetry(generateFn, 'Gemini fact extraction')
      : await generateFn();

    const content = response.response.text();
    if (!content) throw new Error('Empty response from Gemini fact extraction');

    const parsed = JSON.parse(content);

    // Add extraction date
    parsed.meta = {
      ...parsed.meta,
      extraction_date: new Date().toISOString().split('T')[0],
    };

    // Fix website_url: validate and remove if invalid
    if (parsed.website_url) {
      try {
        new URL(parsed.website_url);
      } catch {
        if (typeof parsed.website_url === 'string' && !parsed.website_url.startsWith('http')) {
          try {
            new URL(`https://${parsed.website_url}`);
            parsed.website_url = `https://${parsed.website_url}`;
          } catch {
            parsed.website_url = null;
          }
        } else {
          parsed.website_url = null;
        }
      }
    }

    // Fix logo_url similarly
    if (parsed.logo_url) {
      try {
        new URL(parsed.logo_url);
      } catch {
        parsed.logo_url = null;
      }
    }

    // Validate with Zod
    const validated = KnowledgeCardSchema.parse(parsed);

    const tokensUsed = Math.ceil((prompt.length + content.length) / 4);

    return { knowledgeCard: validated, tokensUsed };
  }

  /**
   * Synthesize analysis with contextual review (Pass 2 - The Architect)
   */
  async synthesize(
    input: SynthesizeInput,
    withRetry?: <T>(fn: () => Promise<T>, operation: string) => Promise<T>
  ): Promise<{ analysis: HunterAnalysis; tokensUsed: number }> {
    // Prompt should already be interpolated with variables
    const prompt = input.promptTemplate;

    const model = this.client.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        temperature: 0.3,
        responseMimeType: 'application/json',
      },
    });

    const generateFn = async () => {
      try {
        return await model.generateContent(prompt);
      } catch (error) {
        throw classifyGeminiError(error);
      }
    };
    const response = withRetry
      ? await withRetry(generateFn, 'Gemini synthesis')
      : await generateFn();

    const result = response.response;
    const content = result.text();
    if (!content) throw new Error('Empty response from Gemini');

    const parsed = JSON.parse(content);

    // Fix common AI mistakes: source_type and claim_type confusion
    // AI sometimes puts "fact"/"opinion" in source_type instead of claim_type
    const validSourceTypes = ['official', 'editorial', 'community'];
    const fixClaim = (claim: unknown) => {
      if (typeof claim === 'object' && claim !== null) {
        const c = claim as Record<string, unknown>;
        // If source_type has a claim_type value, swap them
        if (c.source_type && !validSourceTypes.includes(c.source_type as string)) {
          // source_type has invalid value - check if it looks like a claim_type
          if (c.source_type === 'fact' || c.source_type === 'opinion') {
            // Move the value to claim_type if claim_type is missing
            if (!c.claim_type) {
              c.claim_type = c.source_type;
            }
            // Default source_type to 'editorial' (safe middle ground)
            c.source_type = 'editorial';
          }
        }
      }
      return claim;
    };
    if (Array.isArray(parsed.pros)) {
      parsed.pros = parsed.pros.map(fixClaim);
    }
    if (Array.isArray(parsed.cons)) {
      parsed.cons = parsed.cons.map(fixClaim);
    }

    // Fix verdict: truncate if too long (max 200 chars)
    if (parsed.verdict && typeof parsed.verdict === 'string' && parsed.verdict.length > 200) {
      parsed.verdict = parsed.verdict.slice(0, 197) + '...';
    }

    // Fix shortDescription: truncate if too long (max 200 chars)
    if (parsed.shortDescription && typeof parsed.shortDescription === 'string' && parsed.shortDescription.length > 200) {
      parsed.shortDescription = parsed.shortDescription.slice(0, 197) + '...';
    }

    // Fix websiteUrl: validate and remove if invalid
    if (parsed.websiteUrl) {
      try {
        new URL(parsed.websiteUrl);
      } catch {
        // Invalid URL - try to fix common issues
        if (typeof parsed.websiteUrl === 'string') {
          // Add https:// if missing
          if (!parsed.websiteUrl.startsWith('http')) {
            try {
              new URL(`https://${parsed.websiteUrl}`);
              parsed.websiteUrl = `https://${parsed.websiteUrl}`;
            } catch {
              // Still invalid, remove it
              delete parsed.websiteUrl;
            }
          } else {
            // Can't fix, remove it
            delete parsed.websiteUrl;
          }
        } else {
          delete parsed.websiteUrl;
        }
      }
    }

    const validated = AnalysisSchema.parse(parsed);

    // Estimate token count
    const tokensUsed = Math.ceil((prompt.length + content.length) / 4);

    return {
      analysis: validated as HunterAnalysis,
      tokensUsed,
    };
  }

  /**
   * Generate text embeddings for semantic search
   */
  async generateEmbedding(
    text: string,
    withRetry?: <T>(fn: () => Promise<T>, operation: string) => Promise<T>
  ): Promise<number[]> {
    const model = this.client.getGenerativeModel({ model: 'text-embedding-004' });

    const embedFn = async () => {
      try {
        return await model.embedContent(text);
      } catch (error) {
        throw classifyGeminiError(error);
      }
    };
    const response = withRetry
      ? await withRetry(embedFn, 'Gemini embedding')
      : await embedFn();

    return response.embedding.values;
  }
}
