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
  corporateProfilerSnippets?: string[]; // V4: Crunchbase/LinkedIn/stock data
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
    input.corporateProfilerSnippets?.length
      ? `[CORPORATE DATA - Trust for employee counts]\n${input.corporateProfilerSnippets.join('\n')}`
      : '',
    `[Reviews]\n${input.reviewsSnippets.join('\n')}`,
    `[Pricing]\n${input.pricingSnippets.join('\n')}`,
    `[Company]\n${input.companySnippets.join('\n')}`,
    `[Technical]\n${input.technicalSnippets.join('\n')}`,
    `[Alternatives]\n${input.alternativesSnippets.join('\n')}`,
  ]
    .filter(Boolean)
    .join('\n\n');

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

=== STEP 2.2: RECENCY SIGNALS (Freshness Bias) ===
Prefer recent evidence when sources conflict, but do NOT discard older sources if they provide stronger consensus or detail.
Look for dates/years in snippets (e.g., 2025, 2026) and release notes/changelog mentions.
Populate meta.last_major_update with an approximate YYYY-MM (or YYYY) if mentioned.
If all evidence appears outdated (>18 months), set meta.data_quality = "low" and meta.active_development = false.

=== STEP 2.5: SETUP PATH (The "First 5 Minutes") ===
Your role: Extract the ACTUAL onboarding steps. Ignore marketing promises like "Get started in seconds."
Hunt for: Installation guides, Quickstart docs, CLI commands, Setup wizards.

Extract into setup_complexity object:

**Binary Flags (V1)**:
- requires_developer: Does it require coding/CLI knowledge?
- requires_it_admin: Does it need server/domain/DNS access?
- implementation_partner_needed: Is professional services recommended?
- estimated_setup_time: minutes/hours/days/weeks (realistic, not marketing)
- technical_blockers: ["API configuration", "DNS setup", "Custom SMTP"]

**Detailed Setup Path (V2)**:
- setup_type: cli|web|installer|hybrid|api_only
  * cli: Installed via command line (npm, pip, brew, cargo, go install)
  * web: Sign up and use immediately (no installation)
  * installer: Download .exe/.dmg/.deb (desktop app)
  * hybrid: CLI + Web dashboard (e.g., Vercel, Supabase)
  * api_only: Library/API integration only (no UI)

- friction_score: 1-10 (1=instant, 10=multi-day setup)
  * 1: OAuth login with Google/GitHub (ChatGPT, Notion)
  * 3: npm install + API key (OpenAI SDK, Stripe)
  * 5: CLI setup + domain configuration (Vercel, Netlify)
  * 7: Docker setup + environment variables (self-hosted GitLab)
  * 10: Multi-server deployment + SSL + database migration (Kubernetes)

- steps: Array of 3-5 high-impact steps. Extract ACTUAL commands from docs:
  [
    { step: 1, action: "Run brew install cursor", command: "brew install cursor", description: "Downloads .dmg for macOS" },
    { step: 2, action: "Sign in with GitHub", description: "Imports VS Code extensions automatically" },
    { step: 3, action: "Open a folder and run 'Index Folder'", description: "Enables AI codebase awareness" }
  ]

  RULES:
  - If CLI tool: Extract the EXACT command (don't paraphrase)
  - If web tool: Describe the signup gate ("Verify email", "Connect GitHub")
  - If installer: Link to download page
  - Skip "Create account" if it's obvious - focus on the TECHNICAL steps
  - NO generic steps like "Follow the wizard" - be specific

- aha_moment: The first "wow" moment that proves it works
  Examples:
  * "Seeing the 'Composer' (Cmd+I) refactor your first file" (Cursor)
  * "Deploying your first function with 'vercel --prod'" (Vercel)
  * "Watching real-time collaboration cursors move" (Figma)

- red_tape: Flags for common blockers (set to true only if confirmed)
  * cc_required: "Free" trial requires credit card
  * domain_required: Cannot use Gmail, requires business domain (e.g., Slack Enterprise)
  * admin_required: Needs Full Disk Access (macOS) or Admin privileges (Windows)
  * sales_gated: "Contact Sales" button instead of self-serve signup
  * approval_required: Email/domain verification takes >1 hour

- setup_url: Direct link to official setup guide (prefer /docs/quickstart over /docs/installation)

**ANTI-HALLUCINATION RULES**:
- If no setup docs found → Set friction_score to null, steps to []
- If web-only tool → steps: [{ step: 1, action: "Sign up at [URL]" }]
- If API-only → steps: [{ step: 1, action: "Install SDK", command: "npm install [pkg]" }]
- DO NOT invent CLI commands - extract verbatim or leave null

=== STEP 3: BUDGET ANALYST (Hard Facts Only) ===
Extract into review_context.budget_analyst:
- cost_drivers: What increases TCO? ("SSO requires Enterprise", "Guests are billable", "Storage overage fees")
- one_time_fees: Setup/implementation costs ("$500 onboarding fee")
- commitment_terms: "Annual only", "30-day cancellation notice", "Auto-renews"
- roi_threshold: When is paid worth it? ("Team > 10", "Need audit logs", "High-volume senders")

=== STEP 4: USER ADVOCATE (Tribal Knowledge) ===
Extract into review_context.user_advocate:
- vibe: Ecosystem maturity & build style (2-3 words). Examples: "No-Code Modular", "Enterprise Rigid", "Developer-First", "Builder-Focused", "API-Centric", "Workflow Engine". AVOID vague descriptors like "Hacker Chic" or "Playful".
- origin_story: One sentence context ("Started as game chat, now used for work")
- power_tip: One specific shortcut or hidden feature ("Cmd+K opens command palette", "Use /collapse to hide gifs")
- ideal_for: Specific personas ["Solo founders", "Async-first teams", "Design teams"]
- avoid_if: Deal-breakers ["Need offline mode", "Regulated industry (HIPAA)", "Hate keyboard shortcuts"]
- delighters: Features users rave about ["Command palette", "Dark mode", "Real-time collab"]
- frustrations: Specific UX complaints (NOT pricing) ["Search slow after 10k messages", "Mobile app buggy"]
- human_verdict: Opinionated 2-3 sentence verdict with reviewer's voice. Include: (1) who it's perfect for, (2) who should avoid it, (3) one specific limitation. Example: "Airtable is strong for teams moving past spreadsheets but not ready for full CRM complexity. If you need multi-million row logging, its record ceilings become a blocker." AVOID neutral Wikipedia style.

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

=== STEP 6: FORENSIC ACCOUNTANT - HARD LIMITS ===
Your role: Ignore marketing language. Find the "No". Find the limits that will surprise users at scale.

Extract into constraints object:

**hard_limits**: Array of constraints with consequences
Types to look for:
  - record_count: Max records in database (Airtable, Notion, etc.)
  - storage_gb: Max file storage
  - api_requests_per_month: Monthly API call limit
  - api_rate_limit_per_sec: Requests per second throttle
  - seat_count: Max users/seats
  - project_count: Max projects/workspaces
  - active_contacts: Max contacts in CRM/email tool
  - message_credits: Max messages (chat, SMS, email)

Consequences (what happens when limit is hit):
  - hard_stop: Service stops working (e.g., "API returns 429 error")
  - soft_throttle: Service slows down (e.g., "Email sending throttled to 1/min")
  - auto_charge: Automatically bills credit card (e.g., "Overage billed at $0.10/GB")
  - upgrade_locked: Must upgrade plan (e.g., "Cannot add 11th user without upgrading")
  - data_deletion: Data gets deleted (e.g., "Files deleted after 60 days on free plan")

**plan_name_match**: Extract the EXACT plan name string (e.g., "Pro", "Business", "Enterprise").
  - Set to null if limit applies to ALL plans
  - DO NOT generate plan IDs - just copy the plan name verbatim
  - Persistence layer will fuzzy-match this to plan_id in code

**source_url**: Direct link to pricing page, ToS, or docs where limit is documented
  - PREFERRED but not required - include if you can find specific page
  - If unsure, leave empty - system will fall back to pricing_page_url
  - Prefer pricing page over generic docs

**hidden_costs**: Array of surprise charges
Examples:
  - "SSO requires $200/mo add-on"
  - "Storage overage at $10/GB"
  - "Implementation fee: $5,000"
  - "Premium support: $500/mo"
  - "Audit logs: $100/user/mo"

trigger: Describe when the cost kicks in (e.g., "When enabling SSO", "After 100GB storage")

EVIDENCE REQUIREMENTS (CRITICAL):
- Extract constraints only if you can cite evidence (source_url preferred)
- If pricing page says "Unlimited" or "No limits" → Do NOT add constraint
- If no limits are documented → Leave constraints empty
- If limit exists but consequence is unclear → Use "upgrade_locked" as default
- If multiple plans share same limit → Use plan_name_match: null

**overage**: For auto_charge consequences, extract the overage cost
  - Example: "50k records free, $0.01 per additional record" → overage: {cost: 0.01, unit: "per record"}
  - Example: "100GB included, $5/GB overage" → overage: {cost: 5, unit: "per GB"}

COMMON PATTERNS TO LOOK FOR:
- Email tools: active_contacts limit → usually upgrade_locked or auto_charge
- API platforms: api_requests_per_month + api_rate_limit_per_sec → hard_stop
- Storage/Database tools: storage_gb or record_count → auto_charge or data_deletion
- Collaboration tools: seat_count → upgrade_locked
- Free tiers: Often have data_deletion after retention period

ANTI-PATTERNS (DO NOT EXTRACT):
- Feature gates (e.g., "SSO on Enterprise only") → This is a plan feature, not a constraint
- Soft recommendations (e.g., "Recommended for teams of 5-10") → Not a hard limit
- Performance claims (e.g., "99.9% uptime") → Not a constraint
- Fair Use Policy / "Excessive use" → Do NOT extract unless specific number defined
- Vague throttling (e.g., "May slow down under heavy load") → Need specific threshold

Example output structure:
{
  "constraints": {
    "hard_limits": [
      {
        "plan_name_match": "Free",
        "type": "record_count",
        "value": 1000,
        "consequence": "hard_stop",
        "description": "Cannot add records beyond 1,000 on Free plan. Must upgrade to Team plan.",
        "source_url": "https://airtable.com/pricing"
      },
      {
        "plan_name_match": null,
        "type": "api_rate_limit_per_sec",
        "value": 5,
        "consequence": "soft_throttle",
        "description": "API requests throttled to 5 per second across all plans.",
        "source_url": "https://airtable.com/developers/web/api/rate-limits"
      },
      {
        "plan_name_match": "Pro",
        "type": "storage_gb",
        "value": 100,
        "consequence": "auto_charge",
        "description": "100GB included. Additional storage billed automatically.",
        "overage": {
          "cost": 5,
          "unit": "per GB",
          "currency": "USD"
        }
      }
    ],
    "hidden_costs": [
      {
        "description": "SSO (SAML) available only with $200/mo add-on",
        "cost": 200,
        "currency": "USD",
        "trigger": "When enabling single sign-on"
      }
    ]
  }
}

=== STEP 7: PORTABILITY & INTEGRATIONS ===
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
