/**
 * Knowledge Card Extraction Prompt
 *
 * The "Forensic Accountant" prompt for Pass 1 extraction.
 * Separated from service code for maintainability and A/B testing.
 *
 * @module hunter/prompts/extraction
 */

export interface ExtractionPromptInput {
  toolName: string;
  toolSlug: string;
  contextTitle?: string;
  reviewsSnippets: string[];
  pricingSnippets: string[];
  alternativesSnippets: string[];
  companySnippets: string[];
  technicalSnippets: string[];
  corporateProfilerSnippets?: string[];  // V4: Crunchbase/LinkedIn/stock data
  pricingDeepContent?: string;
}

/**
 * Build the Knowledge Card extraction prompt.
 *
 * V5: Refactored for focus and clarity.
 * - Context elevated to top (System Instruction style)
 * - Pricing Model Decision Tree (not 200 lines of signals)
 * - Split-Brain: Budget Analyst (facts) vs User Advocate (feelings)
 * - Taxonomy precision with sub_category
 */
export function buildExtractionPrompt(input: ExtractionPromptInput): string {
  const { toolName, toolSlug, contextTitle } = input;

  // Determine researcher role based on context
  const getResearcherRole = (): string => {
    if (!contextTitle) return 'ROLE: General Researcher. Extract all pricing tiers.';
    const ctx = contextTitle.toLowerCase();
    if (ctx.match(/business|ads|crm|startup|enterprise|team|marketing|b2b|alternative/)) {
      return 'ROLE: B2B Researcher. IGNORE consumer plans (ad-free, personal, family). Focus on business pricing.';
    }
    if (ctx.match(/student|personal|individual|consumer|budget/)) {
      return 'ROLE: Consumer Researcher. Focus on free tiers, individual plans, student discounts.';
    }
    return 'ROLE: General Researcher. Extract all pricing tiers.';
  };

  // Build source data section
  const sourceData = [
    input.pricingDeepContent ? `[PRICING PAGE - PRIMARY SOURCE]\n${input.pricingDeepContent}` : '',
    input.corporateProfilerSnippets?.length ? `[CORPORATE DATA - Trust for employee counts]\n${input.corporateProfilerSnippets.join('\n')}` : '',
    `[Reviews]\n${input.reviewsSnippets.join('\n')}`,
    `[Pricing]\n${input.pricingSnippets.join('\n')}`,
    `[Company]\n${input.companySnippets.join('\n')}`,
    `[Technical]\n${input.technicalSnippets.join('\n')}`,
    `[Alternatives]\n${input.alternativesSnippets.join('\n')}`,
  ].filter(Boolean).join('\n\n');

  return `You are a SaaS Data Extraction Engine for "${toolName}".

=== CONTEXT: "${contextTitle || 'General Business Software'}" ===
${getResearcherRole()}

=== STEP 1: PRICING MODEL (Decision Tree) ===
Analyze pricing text and pick ONE path:

1. AD_SPEND → Keywords: "CPC", "CPM", "Bidding", "Daily Budget", "Campaign"
   → Set model: "ad_spend"
   → Extract: variable_unit="click" or "1k impressions", variable_price, variable_logic_desc
   → If min daily budget found, record in variable_logic_desc (code calculates monthly)
   → Examples: Reddit Ads, Google Ads, LinkedIn Ads

2. USAGE_BASED → Keywords: "per request", "per token", "per GB", "API calls", "pay as you go"
   → Set model: "usage_based"
   → Extract: price_per_unit, scaling_unit (message/token/request/GB)
   → MULTI-PRODUCT APIs: Create SEPARATE plans per service
     * Twilio SMS ≠ Twilio Voice ≠ Twilio WhatsApp (each is a plan)
     * AWS EC2 ≠ S3 ≠ Lambda (each is a plan)

3. PER_SEAT/FLAT/TIERED → Keywords: "per user", "per seat", "/month", "per member"
   → Set model: "per_seat", "flat", "tiered", or "hybrid"
   → Extract: price_monthly, price_annual, scaling_unit

BUNDLE CHECK: If tool cannot be purchased alone (e.g., "Included in [Suite]"):
→ Set is_standalone: false, bundled_in: "[Suite Name]"
→ Extract parent suite pricing, use parent slug in plan IDs
→ Examples: Google Meet → bundled_in: "Google Workspace"

=== STEP 2: COMPANY FACTS ===
Extract into company object:
- name: Official company name
- founded_year: NUMBER (e.g., 2013 not "2013")
- headquarters: "City, Country"
- funding_stage: bootstrapped/seed/series-a/series-b/series-c+/public/acquired
- employee_count: ANTI-HALLUCINATION RULES:
  * NYSE/NASDAQ listed → "1000+", funding_stage: "public"
  * Use ONLY Crunchbase/LinkedIn data if available
  * Series C+ → "201-500"+, Series A/B → "51-200", Seed → "11-50"
  * If no reliable data → null (NEVER guess)

Also extract:
- features.core: 3-5 most important features
- features.unique: 1-3 differentiating features
- competitive.main_alternatives: 3-5 direct competitors
- competitive.best_for: "Best for X because Y"
- learning_curve: minutes/hours/days/weeks

=== STEP 3: BUDGET ANALYST (Hard Facts Only) ===
Extract into review_context.budget_analyst:
- cost_drivers: What increases TCO? ("SSO requires Enterprise", "Guests are billable", "Storage overage fees")
- one_time_fees: Setup/implementation costs ("$500 onboarding fee")
- commitment_terms: "Annual only", "30-day cancellation notice", "Auto-renews"
- roi_threshold: When is paid worth it? ("Team > 10", "Need audit logs", "High-volume senders")

=== STEP 4: USER ADVOCATE (Tribal Knowledge) ===
Extract into review_context.user_advocate:
- vibe: 2-3 words on UI feel ("Hacker Chic", "Enterprise Grey", "Friendly & Slow", "Blazing Fast")
- origin_story: One sentence context ("Started as game chat, now used for work")
- power_tip: One specific shortcut or hidden feature ("Cmd+K opens command palette", "Use /collapse to hide gifs")
- ideal_for: Specific personas ["Solo founders", "Async-first teams", "Design teams"]
- avoid_if: Deal-breakers ["Need offline mode", "Regulated industry (HIPAA)", "Hate keyboard shortcuts"]
- delighters: Features users rave about ["Command palette", "Dark mode", "Real-time collab"]
- frustrations: Specific UX complaints (NOT pricing) ["Search slow after 10k messages", "Mobile app buggy"]
- human_verdict: 2-3 sentences, max 2 paragraphs. Casual "senior engineer" tone. NO jargon (seamless, robust, empowers, game-changer).

=== STEP 5: TAXONOMY PRECISION ===
Extract into smp_taxonomy:
- primary_function: Broad category ("Communication", "CRM", "Marketing", "Project Management")
- sub_category: PRECISE technical type. CRITICAL for comparisons:
  * Communication: "CPaaS" (Twilio) vs "Team Chat" (Slack) vs "Video Conferencing" (Zoom)
  * Marketing: "Marketing Automation" vs "Email Service Provider" vs "Ad Platform"
  * Data: "Data Warehouse" vs "ETL Tool" vs "BI Dashboard"
  * CRM: "Sales CRM" vs "Support CRM" vs "All-in-one CRM"
  * RULE: APIs ≠ Apps. Twilio is NOT a Slack alternative.
- secondary_functions: Other things it does
- likely_departments: Who pays? ["Engineering", "Marketing", "Sales", "Operations"]

=== STEP 6: PORTABILITY & INTEGRATIONS ===
Extract into smp_portability:
- has_data_export: true/false (most SaaS = true)
- export_formats: ["CSV", "JSON", "PDF"]
- has_api_export: true if API exists
- migration_difficulty: trivial/easy/moderate/hard/locked
- import_from / export_to: Tools with migration wizards

Extract into integrations:
- has_api, has_zapier, has_webhooks: booleans
- notable: [{name, type: native/api/zapier/webhook, direction: import/export/bidirectional}]

=== EXTRACTION RULES ===

RECORDER MODE (No Math):
- "$10/mo" → price_monthly: 10, price_annual: null
- "$100/year" → price_monthly: null, price_annual: 100
- "$10/mo billed annually" (no total shown) → price_monthly: 10, price_annual: null
- Let code calculate. Your job is TRANSCRIBE, not compute.

SCALING UNIT (Required for non-flat models):
- Normalize: "member"→"user", "subscriber"→"contact", "api_call"→"request"
- Preserve unique terms: "Zap", "Credit", "Token"
- Email tools: scaling_unit="contact", included_units=contact limit
- Per-seat SaaS: scaling_unit="user" or "seat"
- API tools: scaling_unit="message"/"request"/"token"

PLAN EXTRACTION:
- Plan IDs: "${toolSlug}-{plan-name}" format (e.g., "${toolSlug}-pro")
- target_audience: individual (solo/freelancer) | team (2-10) | business (10-100) | enterprise (100+)
- Extract ALL tiers (Free through Enterprise) - UI filters later
- Feature flags: includes_sso, includes_api, includes_sla, includes_priority_support, is_enterprise

HIDDEN COSTS:
- min_seats: Minimum seat purchase
- implementation_fee: One-time setup cost
- annual_discount_pct: % discount for annual (e.g., 20 = 20% off)

CONFIDENCE:
- high: Official pricing page
- medium: Review sites (G2, Capterra)
- low: Inferred or outdated

=== SOURCE DATA ===
${sourceData}

=== OUTPUT ===
Return valid JSON matching KnowledgeCard schema with all sections:
- company, features, competitive, pricing, platforms
- smp_pricing (with plans array), smp_taxonomy, smp_portability
- integrations, review_context (budget_analyst + user_advocate)
- meta.data_quality

REQUIRED: Fill "pricing_analysis_log" with your reasoning:
"MODEL: [type]. EVIDENCE: [keywords found]. BUNDLE: [yes/no]. PLANS: [list]. CONFIDENCE: [level]"
`;
}
