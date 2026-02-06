/**
 * Category-Specific Smart Schemas for Hunter ETL Pipeline
 *
 * Philosophy: Different buyers care about different things.
 * A CTO evaluating databases cares about `free_tier_hard_cap`.
 * A VP evaluating CRMs cares about `contact_limit`.
 *
 * This file defines what to extract per category to maximize
 * relevance while minimizing extraction cost.
 */

import { z } from 'zod';

// ============================================================================
// UNIVERSAL BASELINE (Always Extract - ~$0.02/tool)
// ============================================================================

export const BaseToolSchema = z.object({
  // Identity
  name: z.string(),
  logo_url: z.string().nullable(),
  homepage_url: z.string().nullable(),
  description_short: z.string().describe('One sentence, max 150 chars'),

  // Pricing (simplified - details in pricing_data)
  pricing_model: z.enum(['free', 'freemium', 'flat', 'per_seat', 'usage_based', 'contact_sales']),
  starting_price_monthly: z.number().nullable().describe('Cheapest paid plan monthly price in USD'),
  currency: z.literal('USD').default('USD'),

  // Vibe
  ideal_customer_profile: z
    .string()
    .describe('e.g., "Freelancers", "Enterprise IT teams", "Indie hackers"'),
  killer_feature: z.string().describe('The ONE thing this tool does better than competitors'),

  // Platforms
  platforms: z.object({
    web: z.boolean().default(true),
    ios: z.boolean().default(false),
    android: z.boolean().default(false),
    mac: z.boolean().default(false),
    windows: z.boolean().default(false),
    linux: z.boolean().default(false),
  }),
});

export type BaseToolData = z.infer<typeof BaseToolSchema>;

// ============================================================================
// CATEGORY-SPECIFIC EXTENSIONS
// ============================================================================

/**
 * A. INFRASTRUCTURE & DATABASES (Supabase, Vercel, Firebase, PlanetScale)
 * Persona: CTO / Lead Dev
 * Anxiety: "Limits, lock-in, and compliance"
 * Cost: +$0.01 (security page scrape)
 */
export const InfrastructureSchema = z.object({
  // Journey 2: Bootstrapped Solo Dev - THE critical field
  free_tier_hard_cap: z
    .boolean()
    .describe('TRUE = app pauses when limit hit (safe). FALSE = auto-charges (dangerous)'),

  // Journey 6: Data Sovereign
  data_residency: z.array(z.string()).describe('Available regions: ["US", "EU", "AP", "Global"]'),

  self_hostable: z.boolean().describe('Can run on own infrastructure'),

  // Infra-specific
  backup_policy: z.string().nullable().describe('e.g., "Point-in-time recovery, 30 days"'),
  cold_start_time: z.string().nullable().describe('For serverless: "~250ms" or null'),

  // SKIP: learning_curve, mobile_app, requires_developer (devs expect to read docs)
});

/**
 * B. ENTERPRISE SAAS (Salesforce, HubSpot, Workday, ServiceNow)
 * Persona: VP / CIO
 * Anxiety: "Security, support, hidden costs"
 * Cost: +$0.02 (security + enterprise page scrape)
 */
export const EnterpriseSaaSSchema = z.object({
  // Journey 5: Scale-Up CTO
  sso_included_plan: z
    .string()
    .nullable()
    .describe('Plan name where SSO is included, or null if Enterprise-only'),
  sso_tax_pct: z
    .number()
    .nullable()
    .describe('% price increase to get SSO (computed: sso_plan_price / base_plan_price - 1)'),

  // Journey 1: Compliance-First
  compliance_certs: z.array(z.string()).describe('["SOC2 Type II", "ISO 27001", "HIPAA", "GDPR"]'),

  // Enterprise-specific
  implementation_time: z
    .enum(['instant', 'days', 'weeks', 'months'])
    .describe('How long to get fully deployed'),
  dedicated_support: z.boolean().describe('Named account manager available'),
  audit_logs_included: z.boolean().describe('Activity logs in standard plan'),

  // SKIP: free_tier (enterprises don't stay on free), community_vibe
});

/**
 * C. PRODUCTIVITY & KNOWLEDGE (Notion, Obsidian, Linear, Roam)
 * Persona: Knowledge Worker
 * Anxiety: "UX, speed, owning my data"
 * Cost: +$0.01 (migration page scrape)
 */
export const ProductivitySchema = z.object({
  // Journey 3: Hostage Migrator
  migration_difficulty: z
    .enum(['trivial', 'easy', 'moderate', 'hard', 'locked'])
    .describe('How hard to leave this tool'),
  export_formats: z.array(z.string()).describe('["Markdown", "HTML", "PDF", "JSON", "CSV"]'),
  import_from: z
    .array(z.string())
    .describe('Tool slugs with native import: ["notion", "evernote"]'),

  // Productivity-specific
  offline_mode: z.boolean().describe('Works without internet'),
  real_time_collab: z.boolean().describe('Google Docs-style multiplayer editing'),
  mobile_experience: z.enum(['native', 'pwa', 'wrapper', 'none']).describe('Quality of mobile app'),

  // SKIP: compliance_certs (unless B2B), implementation_fee
});

/**
 * D. DEVELOPER TOOLS (GitHub, Postman, Docker, Vercel)
 * Persona: Maker / Senior Engineer
 * Anxiety: "Automation and extensibility"
 * Cost: +$0.00 (info usually on main site)
 */
export const DevToolsSchema = z.object({
  // Dev-specific priorities
  api_completeness: z.boolean().describe('Can do everything via API'),
  cli_available: z.boolean().describe('Official CLI tool'),
  sdk_languages: z.array(z.string()).describe('["JavaScript", "Python", "Go", "Rust", "Ruby"]'),

  // Ecosystem
  extensions_marketplace: z.boolean().describe('Community plugins/extensions'),
  open_source_tier: z.boolean().describe('FOSS version available'),
  self_hostable: z.boolean().describe('Can run on own infra'),

  // Limits
  api_rate_limit: z.string().nullable().describe('e.g., "5000 req/hour"'),

  // SKIP: requires_developer (redundant), customer_support (devs prefer docs)
});

/**
 * E. DESIGN & MARKETING (Figma, Canva, Semrush, Ahrefs)
 * Persona: Creative / Marketing Manager
 * Anxiety: "Assets, credits, collaboration"
 * Cost: +$0.01 (limits page scrape)
 */
export const DesignMarketingSchema = z.object({
  // Asset management
  asset_storage_limit: z.string().nullable().describe('e.g., "Unlimited", "100GB", "1000 files"'),
  version_history_days: z.number().nullable().describe('How far back can undo'),

  // Collaboration
  collaboration_style: z
    .enum(['realtime', 'async', 'none'])
    .describe('Real-time multiplayer vs async comments'),
  guest_access: z.boolean().describe('Can share with non-paying viewers'),

  // Marketing tools specific
  usage_credits: z.string().nullable().describe('e.g., "500 keywords/day", "10k emails/mo"'),
  whitelabel: z.boolean().describe('Can remove vendor branding'),

  // SKIP: api_access (designers rarely script), self_hostable
});

/**
 * F. CRM & SALES (HubSpot, Pipedrive, Salesforce, Close)
 * Persona: VP of Sales
 * Anxiety: "Hidden costs, contact limits"
 * Cost: +$0.01 (pricing comparison page)
 */
export const CRMSalesSchema = z.object({
  // The big anxiety
  contact_limit: z.number().nullable().describe('Max contacts before price increase'),
  contact_overage_cost: z.string().nullable().describe('e.g., "$50/1000 contacts"'),

  // Sales-specific features
  email_sequence_limit: z.number().nullable().describe('Daily email send limit'),
  has_dialer: z.boolean().describe('Built-in calling/recording'),
  lead_scoring: z.boolean().describe('AI lead scoring included'),
  pipeline_views: z.number().nullable().describe('Number of deal pipelines allowed'),

  // SKIP: mobile_app_rating (sales reps need basic access only)
});

/**
 * G. CUSTOMER SUPPORT (Intercom, Zendesk, Freshdesk)
 * Persona: Support Lead
 * Anxiety: "Ticket volume costs"
 * Cost: +$0.01 (pricing model analysis)
 */
export const CustomerSupportSchema = z.object({
  // The critical distinction
  pricing_metric: z
    .enum(['per_agent', 'per_ticket', 'per_contact', 'flat'])
    .describe('How they charge'),

  // Support-specific
  chatbot_included: z.boolean().describe('AI/Bot in base plan or addon'),
  omnichannel: z
    .array(z.enum(['email', 'chat', 'phone', 'social', 'sms']))
    .describe('Supported channels'),
  canned_responses_limit: z.number().nullable().describe('Macro limit, null = unlimited'),

  // SKIP: deployment_options (usually SaaS only)
});

/**
 * H. HR & RECRUITING (Ashby, Deel, Rippling, Gusto)
 * Persona: HR Director
 * Anxiety: "Compliance and geography"
 * Cost: +$0.02 (compliance page important)
 */
export const HRRecruitingSchema = z.object({
  // Geography is everything
  geo_compliance: z
    .array(z.string())
    .describe('Countries supported: ["US", "UK", "CA", "DE", "FR"...]'),

  // Service type
  service_type: z
    .enum(['hris', 'ats', 'eor', 'payroll', 'benefits', 'all_in_one'])
    .describe('Primary function'),
  handles_contractors: z.boolean(),
  handles_full_time: z.boolean(),

  // Integrations that matter
  payroll_integrations: z.array(z.string()).describe('["Xero", "QuickBooks", "Gusto"]'),

  // SKIP: api_rate_limits (HR doesn't care)
});

/**
 * I. FINANCE & ACCOUNTING (QuickBooks, Xero, Brex, Ramp)
 * Persona: CFO / Controller
 * Anxiety: "Reconciliation and multi-entity"
 * Cost: +$0.01 (features page)
 */
export const FinanceSchema = z.object({
  // Global operations
  multi_currency: z.boolean().describe('Bill in USD, pay vendors in EUR'),
  multi_entity: z.boolean().describe('Consolidate multiple companies'),

  // Banking
  bank_feeds_regions: z.array(z.string()).describe('["US", "UK", "CA", "AU", "EU"]'),
  plaid_supported: z.boolean().describe('Direct bank connection'),

  // Workflows
  approval_workflows: z.boolean().describe('Require manager sign-off'),
  receipt_ocr: z.boolean().describe('Auto-scan expense receipts'),

  // SKIP: social_media_integrations (lol)
});

/**
 * J. SECURITY & IDENTITY (1Password, Okta, Auth0)
 * Persona: CISO
 * Anxiety: "Breaches and compliance"
 * Cost: +$0.02 (security page critical)
 */
export const SecurityIdentitySchema = z.object({
  // The big ones
  encryption_model: z
    .enum(['zero_knowledge', 'byok', 'managed', 'none'])
    .describe('Who holds the keys'),
  audit_log_retention_days: z.number().nullable().describe('How far back logs go'),

  // Device management
  device_management: z.boolean().describe('Remote wipe capability'),
  mfa_options: z.array(z.string()).describe('["TOTP", "WebAuthn", "SMS", "Email", "Push"]'),

  // Compliance
  compliance_reports_downloadable: z.boolean().describe('Can grab SOC2 PDF now'),

  // SKIP: user_interface_beauty (security pros tolerate ugly)
});

/**
 * K. COMMUNICATION & COLLABORATION (Slack, Discord, Teams, Zoom)
 * Persona: Ops Manager / Remote Team Lead
 * Anxiety: "Noise, history limits, and video quality"
 * Cost: +$0.01
 */
export const CommunicationSchema = z.object({
  // The big anxiety
  message_history_limit: z.string().describe('"90 days", "10k messages", "Unlimited"'),

  // Video/Audio
  video_quality: z.enum(['hd_1080p', 'hd_720p', 'sd', 'audio_only', 'none']),
  max_meeting_participants: z.number().nullable().describe('Limit for video calls'),
  screen_sharing: z.boolean().describe('Includes remote control'),
  recording_included: z.boolean().describe('Cloud recording in plan'),

  // Structure
  thread_style: z
    .enum(['sidebar', 'inline', 'none'])
    .describe('Slack-style sidebar vs Discord inline'),
  channel_limit: z.number().nullable().describe('Max channels/rooms'),

  // SKIP: marketing_automation, api_completeness
});

/**
 * L. ECOMMERCE & PAYMENTS (Stripe, Shopify, Square, WooCommerce)
 * Persona: Founder / eCommerce Manager
 * Anxiety: "Transaction fees and international support"
 * Cost: +$0.01
 */
export const EcommercePaymentsSchema = z.object({
  // The money question
  transaction_fee_pct: z.number().nullable().describe('e.g., 2.9 for 2.9%'),
  transaction_fee_fixed: z.number().nullable().describe('Fixed fee per transaction in cents'),
  monthly_fee: z.number().nullable().describe('Platform fee regardless of sales'),

  // International
  supported_currencies: z.number().nullable().describe('Number of currencies, null = all'),
  supported_countries: z.number().nullable().describe('Countries for payouts'),
  multi_currency_pricing: z.boolean().describe('Show prices in local currency'),

  // Features
  subscription_billing: z.boolean().describe('Recurring payments built-in'),
  invoicing: z.boolean().describe('Can send invoices'),
  pos_hardware: z.boolean().describe('Physical card readers available'),

  // SKIP: sso_support (usually not relevant)
});

/**
 * M. AI & AUTOMATION (OpenAI, Zapier, n8n, Make)
 * Persona: Power User / Automation Specialist
 * Anxiety: "Usage limits and vendor lock-in"
 * Cost: +$0.01
 */
export const AIAutomationSchema = z.object({
  // Usage is everything
  usage_metric: z
    .enum(['tokens', 'tasks', 'runs', 'credits', 'api_calls', 'minutes'])
    .describe('What they count'),
  free_tier_quota: z.string().nullable().describe('"100 tasks/mo", "1M tokens"'),
  overage_rate: z.string().nullable().describe('"$0.002/1k tokens"'),

  // AI-specific
  model_options: z.array(z.string()).nullable().describe('GPT-4, Claude, etc'),
  fine_tuning_available: z.boolean().describe('Can train custom models'),
  data_retention_policy: z.string().nullable().describe('"30 days", "None"'),

  // Automation-specific
  trigger_types: z.array(z.string()).nullable().describe('["webhook", "schedule", "email"]'),
  action_count: z.number().nullable().describe('Number of app integrations'),

  // SKIP: mobile_app (power users use desktop)
});

/**
 * N. ANALYTICS & BI (Mixpanel, Amplitude, Tableau, Metabase)
 * Persona: Product Manager / Data Analyst
 * Anxiety: "Event limits and data retention"
 * Cost: +$0.01
 */
export const AnalyticsBISchema = z.object({
  // The big limit
  event_limit: z.string().nullable().describe('"10M events/mo", "Unlimited"'),
  mtu_limit: z.number().nullable().describe('Monthly Tracked Users limit'),

  // Data
  data_retention_months: z.number().nullable().describe('How long data is kept'),
  raw_data_export: z.boolean().describe('Can export event-level data'),
  data_warehouse_sync: z.boolean().describe('Syncs to Snowflake/BigQuery'),

  // Features
  cohort_analysis: z.boolean().describe('User segmentation'),
  funnel_analysis: z.boolean().describe('Conversion funnel tracking'),
  ab_testing: z.boolean().describe('Built-in experimentation'),

  // SKIP: offline_mode (analytics needs real-time)
});

/**
 * O. CMS & WEBSITE BUILDERS (WordPress, Webflow, Contentful, Sanity)
 * Persona: Marketing Lead / Developer
 * Anxiety: "Hosting costs and flexibility"
 * Cost: +$0.01
 */
export const CMSWebsiteSchema = z.object({
  // Hosting model
  hosting_included: z.boolean().describe('Managed hosting or self-host'),
  bandwidth_limit: z.string().nullable().describe('"100GB/mo", "Unlimited"'),
  cdn_included: z.boolean().describe('Global CDN for assets'),

  // Content
  content_types: z.enum(['pages', 'headless', 'hybrid']).describe('CMS architecture'),
  localization: z.boolean().describe('Multi-language content'),
  media_storage: z.string().nullable().describe('Asset storage limit'),

  // Development
  custom_code: z.boolean().describe('Can inject custom HTML/JS'),
  api_access: z.boolean().describe('Headless API available'),
  version_control: z.boolean().describe('Content versioning'),

  // SKIP: video_quality (not relevant)
});

/**
 * P. NO-CODE & LOW-CODE (Bubble, Retool, Airtable, Notion)
 * Persona: Ops Manager / Citizen Developer
 * Anxiety: "Limits and performance"
 * Cost: +$0.01
 */
export const NoCodeLowCodeSchema = z.object({
  // Record limits (the killer)
  record_limit: z.string().nullable().describe('"10k records", "Unlimited"'),
  app_limit: z.number().nullable().describe('Number of apps/bases allowed'),

  // Capabilities
  database_included: z.boolean().describe('Built-in database'),
  external_db_connect: z.boolean().describe('Connect to Postgres/MySQL'),
  custom_code_option: z.boolean().describe('Can write code when needed'),

  // Deployment
  custom_domain: z.boolean().describe('Use your own domain'),
  white_label: z.boolean().describe('Remove vendor branding'),
  native_mobile_export: z.boolean().describe('Generate iOS/Android apps'),

  // SKIP: api_rate_limit (usually generous)
});

/**
 * Q. FILE STORAGE & SHARING (Dropbox, Google Drive, Box, OneDrive)
 * Persona: IT Admin / Team Lead
 * Anxiety: "Storage costs and sharing permissions"
 * Cost: +$0.01
 */
export const FileStorageSchema = z.object({
  // Storage (the main thing)
  storage_per_user: z.string().nullable().describe('"2TB", "Unlimited"'),
  file_size_limit: z.string().nullable().describe('Max single file size'),

  // Sharing
  link_expiration: z.boolean().describe('Can set link expiry dates'),
  password_protection: z.boolean().describe('Password-protect shared links'),
  granular_permissions: z.boolean().describe('View/edit/comment per file'),

  // Sync
  desktop_sync: z.boolean().describe('Local folder sync'),
  selective_sync: z.boolean().describe('Choose what to sync locally'),
  offline_access: z.boolean().describe('Access files without internet'),

  // Admin
  admin_console: z.boolean().describe('Centralized user management'),
  audit_logs: z.boolean().describe('File access tracking'),

  // SKIP: video_editing (not their job)
});

/**
 * R. SCHEDULING & BOOKING (Calendly, Cal.com, Acuity)
 * Persona: Sales Rep / Consultant
 * Anxiety: "Booking limits and integrations"
 * Cost: +$0.00
 */
export const SchedulingSchema = z.object({
  // Limits
  event_types_limit: z.number().nullable().describe('Number of booking types'),
  booking_pages: z.number().nullable().describe('Number of scheduling pages'),

  // Integrations
  calendar_sync: z.array(z.string()).describe('["Google", "Outlook", "iCloud"]'),
  video_integrations: z.array(z.string()).describe('["Zoom", "Meet", "Teams"]'),
  payment_collection: z.boolean().describe('Collect payment at booking'),

  // Features
  team_scheduling: z.boolean().describe('Round-robin or pooled availability'),
  buffer_time: z.boolean().describe('Set breaks between meetings'),
  custom_branding: z.boolean().describe('Your logo and colors'),

  // SKIP: offline_mode (scheduling needs real-time)
});

// ============================================================================
// CATEGORY MAPPING
// ============================================================================

/**
 * Maps category slugs to their schema extensions.
 * Used by Hunter to determine what fields to extract.
 */
export const CategorySchemaMap = {
  // Infrastructure & Databases
  databases: InfrastructureSchema,
  'backend-as-a-service': InfrastructureSchema,
  'cloud-hosting': InfrastructureSchema,
  serverless: InfrastructureSchema,
  infrastructure: InfrastructureSchema,

  // Enterprise SaaS
  'enterprise-software': EnterpriseSaaSSchema,
  erp: EnterpriseSaaSSchema,

  // Productivity & Knowledge
  productivity: ProductivitySchema,
  'note-taking': ProductivitySchema,
  'knowledge-management': ProductivitySchema,
  'project-management': ProductivitySchema,
  'task-management': ProductivitySchema,
  documentation: ProductivitySchema,

  // Developer Tools
  'developer-tools': DevToolsSchema,
  'dev-tools': DevToolsSchema,
  'api-tools': DevToolsSchema,
  'version-control': DevToolsSchema,
  'ci-cd': DevToolsSchema,

  // Design & Marketing
  design: DesignMarketingSchema,
  'graphic-design': DesignMarketingSchema,
  'video-editing': DesignMarketingSchema,
  marketing: DesignMarketingSchema,
  'seo-tools': DesignMarketingSchema,
  'email-marketing': DesignMarketingSchema,
  'social-media': DesignMarketingSchema,

  // CRM & Sales
  crm: CRMSalesSchema,
  'crm-sales': CRMSalesSchema,
  'sales-tools': CRMSalesSchema,
  'sales-engagement': CRMSalesSchema,

  // Customer Support
  'customer-support': CustomerSupportSchema,
  helpdesk: CustomerSupportSchema,
  'live-chat': CustomerSupportSchema,
  ticketing: CustomerSupportSchema,

  // HR & Recruiting
  'hr-recruiting': HRRecruitingSchema,
  hr: HRRecruitingSchema,
  recruiting: HRRecruitingSchema,
  payroll: HRRecruitingSchema,
  hris: HRRecruitingSchema,

  // Finance & Accounting
  finance: FinanceSchema,
  accounting: FinanceSchema,
  'expense-management': FinanceSchema,
  invoicing: FinanceSchema,

  // Security & Identity
  security: SecurityIdentitySchema,
  identity: SecurityIdentitySchema,
  'password-management': SecurityIdentitySchema,
  authentication: SecurityIdentitySchema,

  // Communication & Collaboration
  communication: CommunicationSchema,
  'team-chat': CommunicationSchema,
  'video-conferencing': CommunicationSchema,
  messaging: CommunicationSchema,
  collaboration: CommunicationSchema,

  // eCommerce & Payments
  ecommerce: EcommercePaymentsSchema,
  payments: EcommercePaymentsSchema,
  'payment-processing': EcommercePaymentsSchema,
  'online-store': EcommercePaymentsSchema,
  pos: EcommercePaymentsSchema,

  // AI & Automation
  'ai-automation': AIAutomationSchema,
  ai: AIAutomationSchema,
  automation: AIAutomationSchema,
  'workflow-automation': AIAutomationSchema,
  llm: AIAutomationSchema,

  // Analytics & BI
  analytics: AnalyticsBISchema,
  'business-intelligence': AnalyticsBISchema,
  'product-analytics': AnalyticsBISchema,
  'data-visualization': AnalyticsBISchema,

  // CMS & Website Builders
  cms: CMSWebsiteSchema,
  'website-builder': CMSWebsiteSchema,
  'headless-cms': CMSWebsiteSchema,
  'landing-pages': CMSWebsiteSchema,

  // No-Code & Low-Code
  'no-code': NoCodeLowCodeSchema,
  'low-code': NoCodeLowCodeSchema,
  'app-builder': NoCodeLowCodeSchema,
  'internal-tools': NoCodeLowCodeSchema,

  // File Storage & Sharing
  'file-storage': FileStorageSchema,
  'cloud-storage': FileStorageSchema,
  'file-sharing': FileStorageSchema,
  'document-management': FileStorageSchema,

  // Scheduling & Booking
  scheduling: SchedulingSchema,
  'appointment-booking': SchedulingSchema,
  calendar: SchedulingSchema,
  'meeting-scheduler': SchedulingSchema,
} as const;

export type CategorySlug = keyof typeof CategorySchemaMap;

// ============================================================================
// DYNAMIC SCHEMA GENERATOR
// ============================================================================

/**
 * Returns the combined schema for a given category.
 * Base schema + category-specific extension.
 *
 * @example
 * const schema = getSchemaForCategory('databases');
 * // Returns BaseToolSchema merged with InfrastructureSchema
 */
export function getSchemaForCategory(categorySlug: string) {
  const extension = CategorySchemaMap[categorySlug as CategorySlug];

  if (!extension) {
    // Unknown category - return base schema only
    console.warn(`[Schema] Unknown category "${categorySlug}", using base schema only`);
    return BaseToolSchema;
  }

  return BaseToolSchema.merge(extension);
}

/**
 * Returns just the category-specific fields (for extraction prompts).
 * Excludes base schema fields since those are always extracted.
 */
export function getCategorySpecificFields(categorySlug: string): string[] {
  const extension = CategorySchemaMap[categorySlug as CategorySlug];

  if (!extension) {
    return [];
  }

  return Object.keys(extension.shape);
}

/**
 * Returns extraction instructions for the LLM based on category.
 * Includes field descriptions from Zod schema.
 */
export function getExtractionPrompt(categorySlug: string): string {
  const extension = CategorySchemaMap[categorySlug as CategorySlug];

  if (!extension) {
    return 'Extract standard tool information only.';
  }

  const fields = Object.entries(extension.shape).map(([key, schema]) => {
    // @ts-ignore - accessing Zod internals for description
    const description = schema._def.description || '';
    return `- ${key}: ${description}`;
  });

  const categoryName = categorySlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return `You are analyzing a ${categoryName} tool. In addition to standard data, you MUST extract:

${fields.join('\n')}

If a field cannot be determined from public sources, return null. Do NOT hallucinate values.`;
}

// ============================================================================
// COST ESTIMATION
// ============================================================================

/**
 * Estimated additional cost per category (extra scrapes needed)
 */
export const CategoryExtractionCost: Record<string, number> = {
  // Infrastructure & Databases
  databases: 0.01,
  'backend-as-a-service': 0.01,
  'cloud-hosting': 0.01,
  infrastructure: 0.01,

  // Enterprise SaaS
  'enterprise-software': 0.02,
  erp: 0.02,

  // Productivity & Knowledge
  productivity: 0.01,
  'note-taking': 0.01,
  'project-management': 0.01,
  'knowledge-management': 0.01,

  // Developer Tools
  'developer-tools': 0.0,
  'dev-tools': 0.0,
  'api-tools': 0.0,

  // Design & Marketing
  design: 0.01,
  marketing: 0.01,
  'seo-tools': 0.01,

  // CRM & Sales
  crm: 0.01,
  'crm-sales': 0.01,

  // Customer Support
  'customer-support': 0.01,
  helpdesk: 0.01,

  // HR & Recruiting
  'hr-recruiting': 0.02,
  hr: 0.02,
  payroll: 0.02,

  // Finance & Accounting
  finance: 0.01,
  accounting: 0.01,

  // Security & Identity
  security: 0.02,
  identity: 0.02,
  authentication: 0.02,

  // Communication & Collaboration
  communication: 0.01,
  'team-chat': 0.01,
  'video-conferencing': 0.01,

  // eCommerce & Payments
  ecommerce: 0.01,
  payments: 0.01,
  'payment-processing': 0.01,

  // AI & Automation
  'ai-automation': 0.01,
  ai: 0.01,
  automation: 0.01,

  // Analytics & BI
  analytics: 0.01,
  'business-intelligence': 0.01,

  // CMS & Website Builders
  cms: 0.01,
  'website-builder': 0.01,

  // No-Code & Low-Code
  'no-code': 0.01,
  'low-code': 0.01,

  // File Storage & Sharing
  'file-storage': 0.01,
  'cloud-storage': 0.01,

  // Scheduling & Booking
  scheduling: 0.0,
  calendar: 0.0,
};

export function getEstimatedCost(categorySlug: string): number {
  const baseCost = 0.15; // Base Hunter cost
  const extraCost = CategoryExtractionCost[categorySlug] || 0.01;
  return baseCost + extraCost;
}
