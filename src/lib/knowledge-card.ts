/**
 * Knowledge Card Schema
 *
 * Structured facts extracted by the Hunter "Librarian" pass.
 * This provides the foundation for comparison tables and fact-based reviews.
 */

import { z } from 'zod';

// Confidence level for extracted facts
export const ConfidenceLevel = z.enum(['verified', 'inferred', 'unknown']);
export type ConfidenceLevel = z.infer<typeof ConfidenceLevel>;

// Fact with confidence tracking
const FactWithConfidence = <T extends z.ZodTypeAny>(schema: T) =>
  z.object({
    value: schema,
    confidence: ConfidenceLevel.default('inferred'),
    source_url: z.string().url().optional(),
  });

// Pricing tier structure (legacy)
export const PricingTierSchema = z.object({
  name: z.string(),                        // "Free", "Pro", "Enterprise"
  price: z.string().nullable(),            // "$9/mo", "Custom", null if unknown
  billing_period: z.enum(['monthly', 'yearly', 'one-time', 'custom']).nullable().optional(),
  features: z.array(z.string()).default([]),
});
export type PricingTier = z.infer<typeof PricingTierSchema>;

// V3: SMP Plan structure (for cost calculations)
// Includes transforms for fallback calculations when LLM fails to compute
export const SMPPlanSchema = z.object({
  id: z.string(),                          // Deterministic: `${slug}-${plan_name_slug}`
  name: z.string(),                         // "Free", "Pro", "Enterprise"
  target_audience: z.enum(['individual', 'team', 'business', 'enterprise']).nullable().optional()
    .describe("Who is this plan for? individual=solo users, team=2-10, business=10-100, enterprise=100+"),
  price_monthly: z.number().nullable().optional(),  // Monthly price (null/undefined = no monthly option)
  price_annual: z.number().nullable().optional(),   // Total annual price (null/undefined = no annual option)
  // Tolerant Reader: Accept any string to avoid pipeline failures on novel units
  // Common units: user, seat, contact, subscriber, GB, message, request, token, project
  // Unique units preserved as-is: zap, credit, compute, invocation, etc.
  scaling_unit: z.string().nullable().optional()
    .describe("The noun being counted. Use standard units (user, contact, gb) where possible, but preserve unique terms (zap, token, credit) if the tool uses them."),
  price_per_unit: z.number().nullable().optional(),
  included_units: z.number().nullable().optional(),
  max_users: z.number().nullable().optional(),
  max_storage_gb: z.number().nullable().optional(),
  max_projects: z.number().nullable().optional(),
  includes_sso: z.boolean().default(false),
  includes_api: z.boolean().default(false),
  includes_sla: z.boolean().default(false),
  includes_priority_support: z.boolean().default(false),
  is_enterprise: z.boolean().default(false),

  // Variable pricing (for ad_spend and usage_based models)
  variable_unit: z.string().nullable().optional(),           // e.g., "click", "1k impressions", "1M tokens"
  variable_price: z.number().nullable().optional(),          // e.g., 0.50, 0.02
  variable_logic_desc: z.string().nullable().optional(),     // e.g., "Bidding based, $0.40-$2.00 avg CPC"
}).transform((plan) => {
  // FALLBACK MATH: If LLM failed to calculate annual, we do it here
  if (plan.price_monthly && plan.price_monthly > 0 && !plan.price_annual) {
    plan.price_annual = plan.price_monthly * 12;
  }

  // REVERSE MATH: If we only have annual (rare, but happens)
  if (!plan.price_monthly && plan.price_annual && plan.price_annual > 0) {
    plan.price_monthly = parseFloat((plan.price_annual / 12).toFixed(2));
  }

  // NORMALIZE UNITS: Map 'member' to 'user' for consistency
  if (plan.scaling_unit === 'member') {
    plan.scaling_unit = 'user';
  }

  return plan;
});
export type SMPPlan = z.infer<typeof SMPPlanSchema>;

// V3: SMP Pricing Data (for cost calculations)
export const SMPPricingDataSchema = z.object({
  model: z.enum(['free', 'flat', 'per_seat', 'per_unit', 'tiered', 'hybrid', 'contact_sales', 'ad_spend', 'usage_based']),
  // Suite bundling (V3.2)
  is_standalone: z.boolean().describe("False if primarily sold as part of a suite (e.g., Google Meet, Teams)").default(true),
  bundled_in: z.string().nullable().describe("Parent suite name (e.g., 'Google Workspace', 'Microsoft 365')").optional(),
  currency: z.enum(['USD', 'EUR', 'GBP']).default('USD'),
  billing_cycles: z.array(z.enum(['monthly', 'annual', 'quarterly'])).default(['monthly']),
  annual_discount_pct: z.number().nullable().optional(),
  plans: z.array(SMPPlanSchema).default([]),
  min_seats: z.number().nullable().optional(),
  implementation_fee: z.number().nullable().optional(),
  pricing_page_url: z.string().url().nullable().optional(),
  confidence: z.enum(['high', 'medium', 'low']).default('medium'),
  discounts_available: z.array(z.enum(['startup', 'nonprofit', 'education', 'government', 'annual_prepay'])).default([]),

  // Seat types (member/guest/viewer)
  seat_types: z.array(z.object({
    type: z.enum(['member', 'guest', 'viewer', 'contractor', 'admin']),
    price_per_unit: z.number().nullable().optional(),
    free_units: z.number().nullable().optional(),
    notes: z.string().nullable().optional(),
  })).optional(),

  // Volume tiers (seat ranges with price overrides)
  volume_tiers: z.array(z.object({
    min_units: z.number(),
    max_units: z.number().nullable().optional(),
    price_per_unit: z.number(),
    applies_to: z.enum(['member', 'seat', 'workspace', 'gb', 'request']).nullable().optional(),
  })).optional(),

  // Usage meters (GB/requests/messages)
  usage_meters: z.array(z.object({
    unit: z.enum(['gb', 'message', 'request', 'minute', 'api_call']),
    price_per_unit: z.number(),
    included_units: z.number().nullable().optional(),
    billing_cycle: z.enum(['monthly', 'annual', 'quarterly']),
  })).optional(),

  // Add-ons (SSO, audit logs, storage)
  add_ons: z.array(z.object({
    name: z.string(),
    price: z.number(),
    unit: z.enum(['seat', 'account', 'org', 'gb', 'request']),
    required: z.boolean().default(false),
    notes: z.string().nullable().optional(),
  })).optional(),
});
export type SMPPricingData = z.infer<typeof SMPPricingDataSchema>;

// V3: Taxonomy Data (for department budgets)
export const SMPTaxonomySchema = z.object({
  primary_function: z.string(),              // "Project Management", "CRM"
  // V4: Sub-category for deeper comparison granularity
  // Prevents comparing APIs (Twilio) with SaaS apps (Slack) just because both are "Communication"
  sub_category: z.string().nullable().optional()
    .describe('Technical sub-category for comparison granularity. Examples: "CPaaS" vs "Team Chat", "Infrastructure API" vs "SaaS Application", "Marketing Automation" vs "Email Client"'),
  secondary_functions: z.array(z.string()).default([]),
  likely_departments: z.array(z.string()).default([]),
});
export type SMPTaxonomy = z.infer<typeof SMPTaxonomySchema>;

// V3: Portability Data (for switching analysis)
export const SMPPortabilitySchema = z.object({
  has_data_export: z.boolean().default(false),
  export_formats: z.array(z.string()).default([]),
  has_api_export: z.boolean().default(false),
  migration_difficulty: z.enum(['trivial', 'easy', 'moderate', 'hard', 'locked']).nullable().optional(),
  import_from: z.array(z.string()).default([]),    // Tools with import wizards
  export_to: z.array(z.string()).default([]),      // Tools with export wizards
  min_commitment_months: z.number().nullable().optional(),
  cancellation_notice_days: z.number().nullable().optional(),
});
export type SMPPortability = z.infer<typeof SMPPortabilitySchema>;

// =============================================================================
// V4: CONSTRAINTS SCHEMA (The "Cynical CTO" Layer)
// =============================================================================

export const ConstraintTypeSchema = z.enum([
  'record_count',
  'storage_gb',
  'api_requests_per_month',
  'api_rate_limit_per_sec',
  'seat_count',
  'project_count',
  'active_contacts',
  'message_credits',
]);
export type ConstraintType = z.infer<typeof ConstraintTypeSchema>;

export const ConstraintConsequenceSchema = z.enum([
  'hard_stop',        // Service stops working
  'soft_throttle',    // Service slows down
  'auto_charge',      // Automatically bills credit card
  'upgrade_locked',   // Must upgrade to continue
  'data_deletion',    // Data gets deleted
]);
export type ConstraintConsequence = z.infer<typeof ConstraintConsequenceSchema>;

export const ConstraintSchema = z.object({
  plan_name_match: z.string().nullable(),  // Plan name string for fuzzy matching (NOT plan_id)
  type: ConstraintTypeSchema,
  value: z.number(),
  consequence: ConstraintConsequenceSchema,
  description: z.string(),  // Detailed explanation
  source_url: z.string().url().optional(),  // Optional - may fall back to pricing_page_url
  overage: z.object({  // Overage costs for auto_charge limits
    cost: z.number(),
    unit: z.string(),  // e.g., "per 1k records", "per GB"
    currency: z.string().default('USD'),
  }).optional(),
});
export type Constraint = z.infer<typeof ConstraintSchema>;

export const HiddenCostSchema = z.object({
  description: z.string(),
  cost: z.number().nullable().optional(),
  currency: z.string().default('USD'),
  trigger: z.string(),  // When does this cost apply?
});
export type HiddenCost = z.infer<typeof HiddenCostSchema>;

export const ToolConstraintsSchema = z.object({
  hard_limits: z.array(ConstraintSchema).default([]),
  hidden_costs: z.array(HiddenCostSchema).default([]),
});
export type ToolConstraints = z.infer<typeof ToolConstraintsSchema>;

// =============================================================================
// V3.1: REVIEW CONTEXT SCHEMA (The "Human Touch" Layer)
// =============================================================================

// --- Role 1: The Budget Analyst (The CFO) ---
export const BudgetAnalystSchema = z.object({
  cost_drivers: z.array(z.string())
    .describe("Factual factors that increase TCO. e.g., 'SSO requires Enterprise', 'Guests are billable', 'Storage overage fees'")
    .default([]),
  one_time_fees: z.array(z.string())
    .describe("Implementation, Setup, or Mandatory Training fees")
    .default([]),
  commitment_terms: z.string().nullable()
    .describe("Contract constraints. e.g., 'Annual only', '30-day cancellation notice'")
    .optional(),
  roi_threshold: z.string().nullable()
    .describe("At what scale does the paid plan become worth it? e.g., 'Team of 20+', 'Need Audit Logs'")
    .optional(),
});
export type BudgetAnalyst = z.infer<typeof BudgetAnalystSchema>;

// --- Role 2: The User Advocate (The Senior Engineer) ---
export const UserAdvocateSchema = z.object({
  vibe: z.string()
    .describe("2-3 words on the 'soul' of the tool. e.g., 'Enterprise Grey', 'Hacker Chic', 'Friendly & Slow'")
    .nullable()
    .optional(),
  origin_story: z.string().nullable()
    .describe("One sentence on context. e.g., 'Started as a game chat, now used for work'")
    .optional(),
  ideal_for: z.array(z.string())
    .describe("Specific personas. e.g., 'Solo founders', 'Async-first teams', 'Design teams'")
    .default([]),
  avoid_if: z.array(z.string())
    .describe("Deal-breakers. e.g., 'Need HIPAA compliance', 'Offline-heavy workflow', 'You hate keyboard shortcuts'")
    .default([]),
  power_tip: z.string().nullable()
    .describe("One specific 'insider' shortcut or feature regular users might miss. e.g., 'Use Cmd+K to navigate'")
    .optional(),
  delighters: z.array(z.string())
    .describe("Specific features users rave about. e.g., 'The command palette', 'Dark mode', 'Real-time collaboration'")
    .default([]),
  frustrations: z.array(z.string())
    .describe("Specific UX complaints (NOT price complaints, those go in Budget Analyst). e.g., 'Search is slow', 'Mobile app is buggy'")
    .default([]),
});
export type UserAdvocate = z.infer<typeof UserAdvocateSchema>;

// --- Main Context Schema ---
export const ReviewContextSchema = z.object({
  human_verdict: z.string()
    .describe("A 2-sentence summary in 'Coffee Shop Speak'. No corporate jargon like 'seamless', 'empowers', 'robust'. Honest assessment of who it's for. Example: 'It's basically a glorified spreadsheet, but the automation engine is so good you won't care.'")
    .nullable()
    .optional(),
  budget_analyst: BudgetAnalystSchema.default({}),
  user_advocate: UserAdvocateSchema.default({}),
});
export type ReviewContext = z.infer<typeof ReviewContextSchema>;

// Integration/connection
export const IntegrationSchema = z.object({
  name: z.string(),                        // "Slack", "Google Drive"
  type: z.enum(['native', 'api', 'zapier', 'webhook', 'plugin']),
  direction: z.enum(['import', 'export', 'bidirectional']).nullable().optional(),
});
export type Integration = z.infer<typeof IntegrationSchema>;

// Platform availability
export const PlatformAvailabilitySchema = z.object({
  platform: z.enum(['web', 'mac', 'windows', 'linux', 'ios', 'android', 'cli', 'api', 'self-hosted']),
  available: z.boolean(),
  notes: z.string().nullable().optional(),            // "Beta", "Via PWA", etc.
});
export type PlatformAvailability = z.infer<typeof PlatformAvailabilitySchema>;

// Feature capability
export const FeatureCapabilitySchema = z.object({
  name: z.string(),                        // "Offline Mode", "Real-time Collaboration"
  status: z.enum(['full', 'partial', 'none', 'planned', 'beta']),
  notes: z.string().nullable().optional(),
});
export type FeatureCapability = z.infer<typeof FeatureCapabilitySchema>;

// =============================================================================
// MAIN KNOWLEDGE CARD SCHEMA
// =============================================================================

export const KnowledgeCardSchema = z.object({
  // === IDENTITY ===
  official_name: z.string(),
  tagline: z.string().nullable().optional(),          // Official tagline if found
  website_url: z.string().url().nullable().optional(),
  logo_url: z.string().url().nullable().optional(),

  // === COMPANY INFO ===
  company: z.object({
    name: z.string().nullable().optional(),
    founded_year: z.number().int().min(1970).max(2030).nullable().optional(),
    headquarters: z.string().nullable().optional(),   // "San Francisco, CA"
    employee_count: z.enum(['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+']).nullable().optional(),
    funding_stage: z.enum(['bootstrapped', 'seed', 'series-a', 'series-b', 'series-c+', 'public', 'acquired']).nullable().optional(),
  }).default({}),

  // === PRICING ===
  pricing: z.object({
    model: z.enum(['free', 'freemium', 'paid', 'enterprise', 'open_source']),
    has_free_tier: z.boolean(),
    has_free_trial: z.boolean(),
    trial_days: z.number().int().nullable().default(null),
    starting_price: z.string().nullable().default(null), // "$5/user/mo"
    tiers: z.array(PricingTierSchema).default([]),
  }),

  // === PLATFORMS ===
  platforms: z.array(PlatformAvailabilitySchema).default([]),

  // === FEATURES ===
  features: z.object({
    core: z.array(z.string()).default([]), // Main capabilities
    unique: z.array(z.string()).default([]), // What sets it apart
    capabilities: z.array(FeatureCapabilitySchema).default([]),
  }).default({}),

  // === INTEGRATIONS ===
  integrations: z.object({
    total_count: z.number().int().nullable().optional(),
    notable: z.array(IntegrationSchema).default([]),
    has_api: z.boolean().optional().default(false),
    has_webhooks: z.boolean().optional().default(false),
    has_zapier: z.boolean().optional().default(false),
  }).default({}),

  // === TARGET AUDIENCE ===
  audience: z.object({
    primary: z.array(z.string()).default([]),  // "Developers", "Small Teams"
    use_cases: z.array(z.string()).default([]), // "Project Management", "Note-Taking"
    team_size: z.enum(['solo', 'small', 'medium', 'enterprise', 'any']).nullable().optional(),
    skill_level: z.enum(['beginner', 'intermediate', 'advanced', 'any']).nullable().optional(),
  }).default({}),

  // === COMPETITIVE LANDSCAPE ===
  competitive: z.object({
    main_alternatives: z.array(z.string()).default([]),
    differentiators: z.array(z.string()).default([]), // What makes it different
    best_for: z.string().nullable().optional(),       // "Best for X because Y"
    not_ideal_for: z.string().nullable().optional(),  // "Not ideal for X because Y"
  }).default({}),

  // === DATA & SECURITY ===
  security: z.object({
    soc2_certified: z.boolean().nullable().optional(),
    gdpr_compliant: z.boolean().nullable().optional(),
    hipaa_compliant: z.boolean().nullable().optional(),
    data_encryption: z.enum(['at-rest', 'in-transit', 'both', 'none', 'unknown']).nullable().optional(),
    sso_available: z.boolean().nullable().optional(),
    two_factor: z.boolean().nullable().optional(),
    self_hosted_option: z.boolean().optional().default(false),
  }).default({}),

  // === SUPPORT ===
  support: z.object({
    has_documentation: z.boolean().optional().default(false),
    has_community: z.boolean().optional().default(false),            // Forum, Discord, etc.
    has_live_chat: z.boolean().optional().default(false),
    has_phone_support: z.boolean().optional().default(false),
    has_dedicated_support: z.boolean().optional().default(false),    // Enterprise tier
  }).default({}),

  // === META ===
  meta: z.object({
    last_major_update: z.string().nullable().optional(), // "2024-01", approximate
    active_development: z.boolean().nullable().optional(),
    user_sentiment: z.enum(['very_positive', 'positive', 'mixed', 'negative', 'very_negative']).nullable().optional(),
    data_quality: z.enum(['high', 'medium', 'low']),  // How confident we are overall
    extraction_date: z.string(),           // ISO date when facts extracted
  }),

  // === LEARNING & ADOPTION ===
  learning_curve: z.enum(['minutes', 'hours', 'days', 'weeks', 'months']).nullable().optional(),

  // === V3: SMP DATA (for SaaS Management Platform) ===
  smp_pricing: SMPPricingDataSchema.optional(),
  smp_taxonomy: SMPTaxonomySchema.optional(),
  smp_portability: SMPPortabilitySchema.optional(),

  // === V4: CONSTRAINTS (The "Cynical CTO" Layer) ===
  constraints: ToolConstraintsSchema.optional(),

  // === V3.1: REVIEW CONTEXT (The "Human Touch" Layer) ===
  review_context: ReviewContextSchema.optional(),

  // === CHAIN OF THOUGHT: Reasoning logs for QA ===
  pricing_analysis_log: z.string().optional(), // LLM's reasoning about pricing extraction
});

export type KnowledgeCard = z.infer<typeof KnowledgeCardSchema>;

// =============================================================================
// GEMINI RESPONSE SCHEMA (for structured output)
// =============================================================================

// Simplified version for Gemini (without default values that confuse the model)
export const GeminiKnowledgeCardSchema = {
  type: 'object',
  properties: {
    official_name: { type: 'string' },
    tagline: { type: 'string', nullable: true },
    website_url: { type: 'string', nullable: true },
    logo_url: { type: 'string', nullable: true },
    company: {
      type: 'object',
      properties: {
        name: { type: 'string', nullable: true },
        founded_year: { type: 'integer', nullable: true },
        headquarters: { type: 'string', nullable: true },
        employee_count: { type: 'string', nullable: true, enum: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'] },
        funding_stage: { type: 'string', nullable: true, enum: ['bootstrapped', 'seed', 'series-a', 'series-b', 'series-c+', 'public', 'acquired'] },
      },
    },
    pricing: {
      type: 'object',
      properties: {
        model: { type: 'string', enum: ['free', 'freemium', 'paid', 'enterprise', 'open_source'] },
        has_free_tier: { type: 'boolean' },
        has_free_trial: { type: 'boolean' },
        trial_days: { type: 'integer', nullable: true },
        starting_price: { type: 'string', nullable: true },
        tiers: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              price: { type: 'string', nullable: true },
              billing_period: { type: 'string', nullable: true, enum: ['monthly', 'yearly', 'one-time', 'custom'] },
              features: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
      required: ['model', 'has_free_tier', 'has_free_trial'],
    },
    platforms: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          platform: { type: 'string', enum: ['web', 'mac', 'windows', 'linux', 'ios', 'android', 'cli', 'api', 'self-hosted'] },
          available: { type: 'boolean' },
          notes: { type: 'string', nullable: true },
        },
        required: ['platform', 'available'],
      },
    },
    features: {
      type: 'object',
      properties: {
        core: { type: 'array', items: { type: 'string' } },
        unique: { type: 'array', items: { type: 'string' } },
        capabilities: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              status: { type: 'string', enum: ['full', 'partial', 'none', 'planned', 'beta'] },
              notes: { type: 'string', nullable: true },
            },
            required: ['name', 'status'],
          },
        },
      },
    },
    integrations: {
      type: 'object',
      properties: {
        total_count: { type: 'integer', nullable: true },
        notable: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              type: { type: 'string', enum: ['native', 'api', 'zapier', 'webhook', 'plugin'] },
              direction: { type: 'string', enum: ['import', 'export', 'bidirectional'], nullable: true },
            },
            required: ['name', 'type'],
          },
        },
        has_api: { type: 'boolean' },
        has_webhooks: { type: 'boolean' },
        has_zapier: { type: 'boolean' },
      },
    },
    audience: {
      type: 'object',
      properties: {
        primary: { type: 'array', items: { type: 'string' } },
        use_cases: { type: 'array', items: { type: 'string' } },
        team_size: { type: 'string', nullable: true, enum: ['solo', 'small', 'medium', 'enterprise', 'any'] },
        skill_level: { type: 'string', nullable: true, enum: ['beginner', 'intermediate', 'advanced', 'any'] },
      },
    },
    competitive: {
      type: 'object',
      properties: {
        main_alternatives: { type: 'array', items: { type: 'string' } },
        differentiators: { type: 'array', items: { type: 'string' } },
        best_for: { type: 'string', nullable: true },
        not_ideal_for: { type: 'string', nullable: true },
      },
    },
    security: {
      type: 'object',
      properties: {
        soc2_certified: { type: 'boolean', nullable: true },
        gdpr_compliant: { type: 'boolean', nullable: true },
        hipaa_compliant: { type: 'boolean', nullable: true },
        data_encryption: { type: 'string', nullable: true, enum: ['at-rest', 'in-transit', 'both', 'none', 'unknown'] },
        sso_available: { type: 'boolean', nullable: true },
        two_factor: { type: 'boolean', nullable: true },
        self_hosted_option: { type: 'boolean' },
      },
    },
    support: {
      type: 'object',
      properties: {
        has_documentation: { type: 'boolean' },
        has_community: { type: 'boolean' },
        has_live_chat: { type: 'boolean' },
        has_phone_support: { type: 'boolean' },
        has_dedicated_support: { type: 'boolean' },
      },
    },
    meta: {
      type: 'object',
      properties: {
        last_major_update: { type: 'string', nullable: true },
        active_development: { type: 'boolean', nullable: true },
        user_sentiment: { type: 'string', nullable: true, enum: ['very_positive', 'positive', 'mixed', 'negative', 'very_negative'] },
        data_quality: { type: 'string', enum: ['high', 'medium', 'low'] },
      },
      required: ['data_quality'],
    },
    learning_curve: { type: 'string', nullable: true, enum: ['minutes', 'hours', 'days', 'weeks', 'months'] },
    // V3: SMP Data for SaaS Management Platform
    smp_pricing: {
      type: 'object',
      description: 'Structured pricing data for cost calculations. Extract pricing LOGIC, not just strings.',
      properties: {
        model: { type: 'string', description: 'The pricing model. Valid values: free, flat (Basecamp $99/mo), per_seat (Slack $8/user), per_unit (Twilio per message), tiered (HubSpot), hybrid (Notion free + per user), contact_sales (enterprise), ad_spend (Google Ads, Meta Ads - CPC/CPM bidding), usage_based (OpenAI API, AWS - pay per token/GB/request)' },
        // Suite bundling (V3.2)
        is_standalone: { type: 'boolean', default: true, description: 'False if primarily sold as part of a suite (e.g., Google Meet, Microsoft Teams cannot be purchased alone)' },
        bundled_in: { type: 'string', nullable: true, description: 'Parent suite name if bundled (e.g., "Google Workspace", "Microsoft 365"). null for standalone tools.' },
        currency: { type: 'string', enum: ['USD', 'EUR', 'GBP'], default: 'USD' },
        billing_cycles: { type: 'array', items: { type: 'string', enum: ['monthly', 'annual', 'quarterly'] }, description: 'Available billing options' },
        annual_discount_pct: { type: 'number', nullable: true, description: 'Percentage discount for annual billing (e.g., 20 means 20% off)' },
        plans: {
          type: 'array',
          description: 'All available pricing plans with their costs and limits',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Plan identifier: tool-slug-plan-name-slug (e.g., "notion-plus")' },
              name: { type: 'string', description: 'Display name: "Free", "Pro", "Enterprise"' },
              price_monthly: { type: 'number', nullable: true, description: 'Monthly price in base currency units (e.g., 10 for $10/mo). null if no monthly option.' },
              price_annual: { type: 'number', nullable: true, description: 'TOTAL annual price (e.g., 96 for $96/year). NOT monthly equivalent.' },
              scaling_unit: { type: 'string', nullable: true, description: 'What the price scales with: user, seat, member, GB, message, request, project, workspace, hour' },
              price_per_unit: { type: 'number', nullable: true, description: 'Price per unit for per_seat/per_unit models' },
              included_units: { type: 'number', nullable: true, description: 'Units included in base price (e.g., "includes 5 users")' },
              max_users: { type: 'number', nullable: true, description: 'User limit for this plan. null = unlimited.' },
              max_storage_gb: { type: 'number', nullable: true },
              max_projects: { type: 'number', nullable: true },
              target_audience: { type: 'string', enum: ['individual', 'team', 'business', 'enterprise'], nullable: true, description: 'REQUIRED: Who is this plan for? individual=solo/freelancer (1 user), team=2-10 people, business=10-100, enterprise=100+. Infer from features: Free/Personal→individual, Starter/Team→team, Professional/Business→business, Enterprise/Premium→enterprise' },
              includes_sso: { type: 'boolean', default: false },
              includes_api: { type: 'boolean', default: false },
              includes_sla: { type: 'boolean', default: false },
              includes_priority_support: { type: 'boolean', default: false },
              is_enterprise: { type: 'boolean', default: false, description: 'true if this is "Contact Sales" pricing' },
              // Variable pricing fields (for ad_spend and usage_based models)
              variable_unit: { type: 'string', nullable: true, description: 'Unit for variable pricing: "click", "1k impressions", "1M tokens", "GB", "API call". Only for ad_spend/usage_based models.' },
              variable_price: { type: 'number', nullable: true, description: 'Price per variable_unit (e.g., 0.50 for "$0.50 per click"). Only for ad_spend/usage_based models.' },
              variable_logic_desc: { type: 'string', nullable: true, description: 'Human-readable explanation of variable pricing (e.g., "Bidding based, typically $0.40-$2.00 CPC depending on targeting"). Only for ad_spend/usage_based models.' },
            },
            required: ['id', 'name', 'target_audience'],
          },
        },
        min_seats: { type: 'number', nullable: true, description: 'Minimum seat purchase (e.g., "Min 5 seats")' },
        implementation_fee: { type: 'number', nullable: true, description: 'One-time setup/implementation fee' },
        pricing_page_url: { type: 'string', nullable: true, description: 'URL to official pricing page for verification' },
        confidence: { type: 'string', enum: ['high', 'medium', 'low'], description: 'How confident are you in this pricing data? high = from official pricing page, medium = from review sites, low = inferred or outdated' },
        discounts_available: { type: 'array', items: { type: 'string', enum: ['startup', 'nonprofit', 'education', 'government', 'annual_prepay'] } },
      },
      required: ['model', 'confidence'],
    },
    smp_taxonomy: {
      type: 'object',
      description: 'Classification for spend-by-category analysis',
      properties: {
        primary_function: { type: 'string', description: 'Primary function: "Project Management", "CRM", "Communication", "Documentation", etc.' },
        sub_category: { type: 'string', nullable: true, description: 'Technical sub-category for comparison granularity. Use to distinguish technical types within the same category. Examples: For "Communication": "CPaaS" (Twilio) vs "Team Chat" (Slack) vs "Video Conferencing" (Zoom). For "Marketing": "Marketing Automation" vs "Email Service Provider" vs "Ad Platform". For "Data": "Data Warehouse" vs "ETL Tool" vs "BI Dashboard".' },
        secondary_functions: { type: 'array', items: { type: 'string' }, description: 'Secondary functions the tool also serves' },
        likely_departments: { type: 'array', items: { type: 'string' }, description: 'Departments that typically own/pay for this tool: "Engineering", "Product", "Marketing", "Sales", "Operations", "Finance", "HR", "Legal", "IT Security", "Customer Success"' },
      },
      required: ['primary_function'],
    },
    smp_portability: {
      type: 'object',
      description: 'Data for switching feasibility analysis',
      properties: {
        has_data_export: { type: 'boolean', description: 'Can users export their data?' },
        export_formats: { type: 'array', items: { type: 'string' }, description: 'Available export formats: "CSV", "JSON", "XML", "PDF", "ZIP"' },
        has_api_export: { type: 'boolean', description: 'Can users programmatically extract all their data via API?' },
        migration_difficulty: { type: 'string', nullable: true, enum: ['trivial', 'easy', 'moderate', 'hard', 'locked'], description: 'How hard is it to migrate away from this tool?' },
        import_from: { type: 'array', items: { type: 'string' }, description: 'Tool names that have import wizards INTO this tool' },
        export_to: { type: 'array', items: { type: 'string' }, description: 'Tool names that have import wizards FROM this tool' },
        min_commitment_months: { type: 'number', nullable: true, description: 'Minimum contract commitment in months. null = month-to-month.' },
        cancellation_notice_days: { type: 'number', nullable: true, description: 'Required notice period for cancellation in days' },
      },
    },
    // V4: Constraints (The "Cynical CTO" Layer)
    // NOTE: Removed from Gemini schema due to complexity limits.
    // Will be extracted in a separate pass if needed.
    // V3.1: Review Context (The "Human Touch" Layer)
    review_context: {
      type: 'object',
      description: 'Tribal knowledge, vibe, and opinionated guidance extracted from Reddit, forums, and honest user reviews.',
      properties: {
        human_verdict: {
          type: 'string',
          nullable: true,
          description: 'A 2-sentence summary in "Coffee Shop Speak". NO corporate jargon like "seamless", "empowers", "robust", "game-changer". Write as if texting a founder friend. Example: "It\'s basically a glorified spreadsheet, but the automation engine is so good you won\'t care."'
        },
        budget_analyst: {
          type: 'object',
          description: 'The CFO perspective: How the bill works (factual, no judgment)',
          properties: {
            cost_drivers: {
              type: 'array',
              items: { type: 'string' },
              description: 'Factual factors that increase TCO. Examples: "SSO requires Enterprise tier", "Guests count as billable users", "Storage overage fees after 100GB", "Implementation fee for Enterprise"'
            },
            one_time_fees: {
              type: 'array',
              items: { type: 'string' },
              description: 'One-time costs. Examples: "$500 implementation fee", "Mandatory onboarding training at $200/hr"'
            },
            commitment_terms: {
              type: 'string',
              nullable: true,
              description: 'Contract constraints. Examples: "Annual only, no monthly option", "30-day cancellation notice required", "Auto-renews unless cancelled 60 days prior"'
            },
            roi_threshold: {
              type: 'string',
              nullable: true,
              description: 'When does premium become worth it? Examples: "Worth it at 20+ team members", "Only if you need audit logs", "Makes sense if you use webhooks heavily"'
            },
          },
        },
        user_advocate: {
          type: 'object',
          description: 'The Senior Engineer perspective: Vibe, tribal knowledge, and honest experience',
          properties: {
            vibe: {
              type: 'string',
              nullable: true,
              description: '2-3 words on the "soul" of the tool. Examples: "Enterprise Grey", "Hacker Chic", "Friendly & Slow", "Blazing Fast", "Playful", "Corporate", "Minimalist"'
            },
            origin_story: {
              type: 'string',
              nullable: true,
              description: 'One sentence on context. Examples: "Started as game chat for WoW guilds, now used by startups", "Built by designer frustrated with Jira", "Originally an internal tool at Spotify"'
            },
            ideal_for: {
              type: 'array',
              items: { type: 'string' },
              description: 'Specific personas who thrive. Examples: "Solo founders", "Async-first remote teams", "Design teams at scale", "Developers who love keyboard shortcuts"'
            },
            avoid_if: {
              type: 'array',
              items: { type: 'string' },
              description: 'Deal-breaker scenarios. Examples: "You need offline access", "You work in a regulated industry (HIPAA)", "Your team hates keyboard shortcuts", "You prefer visual/GUI workflows"'
            },
            power_tip: {
              type: 'string',
              nullable: true,
              description: 'One specific insider shortcut or hidden feature. Examples: "Use /collapse to hide all gifs in Slack", "Cmd+K opens command palette", "Enable vim mode in settings"'
            },
            delighters: {
              type: 'array',
              items: { type: 'string' },
              description: 'Specific features users rave about. Examples: "The command palette is chef\'s kiss", "Dark mode actually looks good", "Real-time collaboration just works"'
            },
            frustrations: {
              type: 'array',
              items: { type: 'string' },
              description: 'Specific UX complaints (NOT pricing). Examples: "Search is painfully slow after 10k messages", "Mobile app crashes frequently", "No offline mode"'
            },
          },
        },
      },
    },
    // Chain of Thought: LLM reasoning about pricing extraction
    pricing_analysis_log: {
      type: 'string',
      nullable: true,
      description: 'Your step-by-step reasoning about pricing extraction. Format: "1. Found monthly: $X 2. Found annual: $Y or CALCULATED X*12=Z 3. Scaling: per user/seat/flat 4. Model: [type]"'
    },
  },
  required: ['official_name', 'pricing', 'meta'],
};

// =============================================================================
// COMPARISON HELPERS
// =============================================================================

/**
 * Extract comparable facts from a Knowledge Card for side-by-side comparison
 */
export function getComparableFacts(card: KnowledgeCard): Record<string, unknown> {
  return {
    // Pricing
    'Pricing Model': card.pricing.model,
    'Free Tier': card.pricing.has_free_tier ? 'Yes' : 'No',
    'Free Trial': card.pricing.has_free_trial ? (card.pricing.trial_days ? `${card.pricing.trial_days} days` : 'Yes') : 'No',
    'Starting Price': card.pricing.starting_price || 'N/A',

    // Platforms
    'Web App': card.platforms.find(p => p.platform === 'web')?.available ? 'Yes' : 'No',
    'Mac App': card.platforms.find(p => p.platform === 'mac')?.available ? 'Yes' : 'No',
    'Windows App': card.platforms.find(p => p.platform === 'windows')?.available ? 'Yes' : 'No',
    'iOS App': card.platforms.find(p => p.platform === 'ios')?.available ? 'Yes' : 'No',
    'Android App': card.platforms.find(p => p.platform === 'android')?.available ? 'Yes' : 'No',
    'API Access': card.integrations.has_api ? 'Yes' : 'No',
    'Self-Hosted': card.security.self_hosted_option ? 'Yes' : 'No',

    // Integrations
    'Zapier': card.integrations.has_zapier ? 'Yes' : 'No',
    'Webhooks': card.integrations.has_webhooks ? 'Yes' : 'No',

    // Security
    'SSO': card.security.sso_available === true ? 'Yes' : card.security.sso_available === false ? 'No' : 'Unknown',
    '2FA': card.security.two_factor === true ? 'Yes' : card.security.two_factor === false ? 'No' : 'Unknown',
    'SOC 2': card.security.soc2_certified === true ? 'Yes' : card.security.soc2_certified === false ? 'No' : 'Unknown',

    // Audience
    'Best For': card.competitive.best_for || card.audience.primary.join(', ') || 'N/A',
    'Team Size': card.audience.team_size || 'Any',

    // Support
    'Documentation': card.support.has_documentation ? 'Yes' : 'No',
    'Community': card.support.has_community ? 'Yes' : 'No',
    'Live Chat': card.support.has_live_chat ? 'Yes' : 'No',
  };
}

/**
 * Find differences between two Knowledge Cards
 */
export function findDifferences(
  cardA: KnowledgeCard,
  cardB: KnowledgeCard
): Array<{ field: string; valueA: unknown; valueB: unknown }> {
  const factsA = getComparableFacts(cardA);
  const factsB = getComparableFacts(cardB);

  const differences: Array<{ field: string; valueA: unknown; valueB: unknown }> = [];

  for (const [field, valueA] of Object.entries(factsA)) {
    const valueB = factsB[field];
    if (valueA !== valueB) {
      differences.push({ field, valueA, valueB });
    }
  }

  return differences;
}
