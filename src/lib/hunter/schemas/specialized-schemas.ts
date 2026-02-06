/**
 * Specialized Schemas (Layer 3)
 *
 * These extend the category schemas for sub-specializations.
 * Structure: Universal Baseline → Category Schema → Specialized Schema
 *
 * Example hierarchy:
 * BaseToolSchema
 *   └── DevToolsSchema (api_completeness, cli, etc.)
 *       └── CICDSchema (build_minutes, parallelism, etc.)
 *       └── MonitoringSchema (host_limit, retention, etc.)
 */

import { z } from 'zod';

// ============================================================================
// DEVELOPER TOOLS SPECIALIZATIONS
// ============================================================================

/**
 * CI/CD Platforms (GitHub Actions, CircleCI, GitLab CI)
 * Extends: DevToolsSchema
 */
export const CICDSchema = z.object({
  // The main currency
  build_minutes_monthly: z.number().nullable().describe('Free tier minutes'),
  parallelism: z.number().nullable().describe('Concurrent jobs allowed'),

  // Execution
  self_hosted_runners: z.boolean().describe('Can run on your own machines'),
  docker_layer_caching: z.boolean().describe('Speeds up container builds'),
  matrix_builds: z.boolean().describe('Test multiple versions in parallel'),

  // Storage
  artifact_retention_days: z.number().nullable(),
  cache_size_limit: z.string().nullable().describe('"5GB per repo"'),
});

/**
 * Monitoring & Observability (Datadog, New Relic, Grafana)
 * Extends: DevToolsSchema
 */
export const MonitoringSchema = z.object({
  // The main limits
  host_limit: z.number().nullable().describe('Hosts in free tier'),
  metric_retention_days: z.number().nullable(),
  log_retention_days: z.number().nullable(),

  // Data ingestion
  custom_metrics_limit: z.number().nullable(),
  log_ingestion_limit: z.string().nullable().describe('"100GB/mo"'),

  // Features
  apm_included: z.boolean().describe('Application Performance Monitoring'),
  distributed_tracing: z.boolean(),
  alerting_channels: z.array(z.string()).describe('["Slack", "PagerDuty", "Email"]'),
});

/**
 * API Development (Postman, Insomnia, Hoppscotch)
 * Extends: DevToolsSchema
 */
export const APIDevSchema = z.object({
  // Collaboration
  workspace_members: z.number().nullable().describe('Team members allowed'),
  shared_collections: z.boolean(),

  // Mock servers
  mock_servers: z.boolean().describe('Can simulate API responses'),
  mock_requests_limit: z.number().nullable(),

  // Testing
  automated_testing: z.boolean(),
  monitoring_runs: z.number().nullable().describe('Scheduled API checks'),

  // Docs
  documentation_generation: z.boolean().describe('Auto-generate API docs'),
});

/**
 * Version Control & Code Hosting (GitHub, GitLab, Bitbucket)
 * Extends: DevToolsSchema
 */
export const VersionControlSchema = z.object({
  // Storage
  repo_storage_limit: z.string().nullable().describe('"10GB per repo"'),
  lfs_storage: z.string().nullable().describe('Git LFS storage'),
  lfs_bandwidth: z.string().nullable(),

  // Collaboration
  protected_branches: z.boolean(),
  required_reviews: z.boolean().describe('Enforce code review'),
  codeowners: z.boolean(),

  // Features
  issues_included: z.boolean(),
  wiki_included: z.boolean(),
  pages_hosting: z.boolean().describe('Static site hosting'),
});

// ============================================================================
// CRM SPECIALIZATIONS
// ============================================================================

/**
 * Sales CRM (Pipedrive, Close, Salesforce Sales Cloud)
 * Extends: CRMSalesSchema
 */
export const SalesCRMSchema = z.object({
  // Pipeline
  pipeline_stages: z.number().nullable(),
  deal_rotting: z.boolean().describe('Alerts for stale deals'),

  // Calling
  power_dialer: z.boolean().describe('Auto-dial lists'),
  call_recording_storage: z.string().nullable(),
  local_presence: z.boolean().describe('Match caller ID to region'),

  // Forecasting
  revenue_forecasting: z.boolean(),
  quota_tracking: z.boolean(),
});

/**
 * Marketing CRM / MAP (HubSpot Marketing, Marketo, Pardot)
 * Extends: CRMSalesSchema
 */
export const MarketingCRMSchema = z.object({
  // Email
  email_sends_monthly: z.number().nullable(),
  email_templates: z.number().nullable(),
  ab_testing_emails: z.boolean(),

  // Automation
  workflow_limit: z.number().nullable().describe('Marketing automation workflows'),
  landing_pages: z.number().nullable(),
  forms: z.number().nullable(),

  // Attribution
  multi_touch_attribution: z.boolean(),
  campaign_roi_tracking: z.boolean(),
});

// ============================================================================
// PRODUCTIVITY SPECIALIZATIONS
// ============================================================================

/**
 * Note-Taking Apps (Notion, Obsidian, Roam, Logseq)
 * Extends: ProductivitySchema
 */
export const NoteTakingSchema = z.object({
  // The note-taking specifics
  backlinks: z.boolean().describe('Bi-directional linking'),
  graph_view: z.boolean().describe('Visual knowledge graph'),
  daily_notes: z.boolean().describe('Built-in daily journal'),

  // Storage
  attachment_limit: z.string().nullable().describe('Per file or total'),
  block_limit: z.number().nullable().describe('Notion-style block limit'),

  // Sync
  sync_frequency: z.string().nullable().describe('"Real-time", "Every 5 min"'),
  conflict_resolution: z.enum(['manual', 'automatic', 'none']),
});

/**
 * Project Management (Asana, Linear, Monday, Jira)
 * Extends: ProductivitySchema
 */
export const ProjectManagementSchema = z.object({
  // Views
  view_types: z.array(z.enum(['kanban', 'gantt', 'list', 'calendar', 'timeline'])),
  custom_views: z.boolean(),

  // Hierarchy
  subtask_depth: z.enum(['none', 'one_level', 'infinite']),
  project_hierarchy: z.enum(['flat', 'folders', 'portfolios']),

  // Automation
  automation_runs_monthly: z.number().nullable(),
  custom_automations: z.boolean(),

  // Guests
  guest_access_policy: z.enum(['free', 'paid_seat', 'limited', 'none']),
  guest_permissions: z.array(z.string()).describe('["view", "comment", "edit"]'),
});

/**
 * Documentation (Confluence, GitBook, Notion, Slite)
 * Extends: ProductivitySchema
 */
export const DocumentationSchema = z.object({
  // Publishing
  public_docs: z.boolean().describe('Can publish externally'),
  custom_domain: z.boolean(),
  password_protection: z.boolean(),

  // Structure
  nested_pages: z.boolean(),
  page_templates: z.number().nullable(),

  // Collaboration
  inline_comments: z.boolean(),
  suggestion_mode: z.boolean().describe('Track changes like Google Docs'),

  // Developer
  docs_as_code: z.boolean().describe('Markdown/Git sync'),
  api_reference_gen: z.boolean().describe('Auto-generate from OpenAPI'),
});

// ============================================================================
// COMMUNICATION SPECIALIZATIONS
// ============================================================================

/**
 * Team Chat (Slack, Discord, Teams Chat)
 * Extends: CommunicationSchema
 */
export const TeamChatSchema = z.object({
  // Channels
  private_channels: z.boolean(),
  shared_channels: z.boolean().describe('Cross-org channels'),
  channel_archiving: z.boolean(),

  // Integrations
  app_directory_size: z.number().nullable().describe('Available integrations'),
  custom_bots: z.boolean(),
  workflow_builder: z.boolean(),

  // Admin
  message_retention_policy: z.boolean().describe('Can enforce retention'),
  dlp_support: z.boolean().describe('Data Loss Prevention'),
});

/**
 * Video Conferencing (Zoom, Meet, Teams Meetings)
 * Extends: CommunicationSchema
 */
export const VideoConferencingSchema = z.object({
  // Meeting limits
  meeting_duration_limit: z.number().nullable().describe('Minutes, null = unlimited'),
  breakout_rooms: z.boolean(),
  waiting_room: z.boolean(),

  // Recording
  cloud_recording_storage: z.string().nullable(),
  transcription: z.boolean(),
  ai_summary: z.boolean().describe('AI meeting notes'),

  // Webinars
  webinar_capacity: z.number().nullable(),
  webinar_registration: z.boolean(),
});

// ============================================================================
// ANALYTICS SPECIALIZATIONS
// ============================================================================

/**
 * Product Analytics (Mixpanel, Amplitude, PostHog)
 * Extends: AnalyticsBISchema
 */
export const ProductAnalyticsSchema = z.object({
  // Session replay
  session_replay: z.boolean(),
  replay_storage: z.string().nullable(),

  // Features
  feature_flags: z.boolean(),
  experiments_limit: z.number().nullable(),

  // User-level
  user_profiles: z.boolean(),
  user_journey_mapping: z.boolean(),
});

/**
 * Web Analytics (GA4, Plausible, Fathom)
 * Extends: AnalyticsBISchema
 */
export const WebAnalyticsSchema = z.object({
  // Privacy
  cookie_free: z.boolean().describe('No cookies required'),
  gdpr_compliant_default: z.boolean(),

  // Data
  pageview_limit: z.number().nullable(),
  goal_tracking: z.boolean(),

  // Reporting
  custom_dashboards: z.boolean(),
  email_reports: z.boolean(),
});

// ============================================================================
// ECOMMERCE SPECIALIZATIONS
// ============================================================================

/**
 * Payment Processing (Stripe, Square, PayPal)
 * Extends: EcommercePaymentsSchema
 */
export const PaymentProcessingSchema = z.object({
  // Methods
  payment_methods: z.array(z.string()).describe('["cards", "ach", "sepa", "crypto"]'),
  buy_now_pay_later: z.boolean().describe('Klarna, Affirm integration'),

  // Payouts
  payout_speed: z.enum(['instant', 'next_day', '2_day', 'weekly']),
  payout_fee_instant: z.number().nullable().describe('% for instant'),

  // Dev
  checkout_customization: z.enum(['hosted', 'embedded', 'api_only']),
  webhook_retries: z.number().nullable(),
});

/**
 * eCommerce Platforms (Shopify, WooCommerce, BigCommerce)
 * Extends: EcommercePaymentsSchema
 */
export const EcommercePlatformSchema = z.object({
  // Products
  product_limit: z.number().nullable(),
  variant_limit: z.number().nullable().describe('Options per product'),

  // Sales channels
  pos_included: z.boolean(),
  social_selling: z.array(z.string()).describe('["Instagram", "TikTok", "Facebook"]'),

  // Shipping
  shipping_labels: z.boolean(),
  inventory_locations: z.number().nullable(),
});

// ============================================================================
// SPECIALIZED CATEGORY MAPPING
// ============================================================================

export const SpecializedSchemaMap = {
  // Dev Tools specializations
  'ci-cd': CICDSchema,
  'github-actions': CICDSchema,
  'continuous-integration': CICDSchema,

  monitoring: MonitoringSchema,
  observability: MonitoringSchema,
  apm: MonitoringSchema,

  'api-development': APIDevSchema,
  'api-testing': APIDevSchema,

  'version-control': VersionControlSchema,
  'code-hosting': VersionControlSchema,
  'git-hosting': VersionControlSchema,

  // CRM specializations
  'sales-crm': SalesCRMSchema,
  'sales-engagement': SalesCRMSchema,

  'marketing-automation': MarketingCRMSchema,
  'marketing-crm': MarketingCRMSchema,
  'email-automation': MarketingCRMSchema,

  // Productivity specializations
  'note-taking': NoteTakingSchema,
  pkm: NoteTakingSchema,
  'second-brain': NoteTakingSchema,

  'project-management': ProjectManagementSchema,
  'task-management': ProjectManagementSchema,
  'work-management': ProjectManagementSchema,

  documentation: DocumentationSchema,
  'knowledge-base': DocumentationSchema,
  wiki: DocumentationSchema,

  // Communication specializations
  'team-chat': TeamChatSchema,
  'slack-alternative': TeamChatSchema,

  'video-conferencing': VideoConferencingSchema,
  'video-meetings': VideoConferencingSchema,
  webinar: VideoConferencingSchema,

  // Analytics specializations
  'product-analytics': ProductAnalyticsSchema,
  'user-analytics': ProductAnalyticsSchema,

  'web-analytics': WebAnalyticsSchema,
  'website-analytics': WebAnalyticsSchema,

  // eCommerce specializations
  'payment-processing': PaymentProcessingSchema,
  'payment-gateway': PaymentProcessingSchema,

  'ecommerce-platform': EcommercePlatformSchema,
  'online-store': EcommercePlatformSchema,
  'shopify-alternative': EcommercePlatformSchema,
} as const;

export type SpecializedSlug = keyof typeof SpecializedSchemaMap;

/**
 * Get the specialized schema for a sub-category.
 * Returns undefined if no specialization exists.
 */
export function getSpecializedSchema(subCategorySlug: string) {
  return SpecializedSchemaMap[subCategorySlug as SpecializedSlug];
}

/**
 * Check if a slug has a specialized schema available.
 */
export function hasSpecializedSchema(slug: string): boolean {
  return slug in SpecializedSchemaMap;
}
