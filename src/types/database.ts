/**
 * StackHunt Database Types
 * Auto-generated from Supabase schema - keep in sync with migrations
 *
 * V2 REFACTOR: tools → items
 * - Item is the new canonical type (supports tool/gear polymorphism)
 * - Tool is kept as an alias for backward compatibility
 * - All tool_id fields renamed to item_id
 */

import type { ReviewContext, ToolConstraints } from '@/lib/knowledge-card';

// ============================================================================
// SUPABASE GENERIC TYPES
// ============================================================================

export type DatabaseRelationship = {
  foreignKeyName: string;
  columns: string[];
  referencedRelation: string;
  referencedColumns: string[];
  isOneToOne?: boolean;
};

export type DatabaseTable<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: DatabaseRelationship[];
};

export type DatabaseView<Row = Record<string, unknown>> = {
  Row: Row;
  Insert?: Record<string, unknown>;
  Update?: Record<string, unknown>;
  Relationships: DatabaseRelationship[];
};

export type DatabaseFunction<Args = Record<string, unknown>, Returns = unknown> = {
  Args: Args;
  Returns: Returns;
};

// ============================================================================
// ENUMS
// ============================================================================

export type PricingModel = 'free' | 'freemium' | 'paid' | 'enterprise' | 'open_source';

export type ItemType = 'tool' | 'gear';

export type HuntStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type HuntQueueStatus = 'pending' | 'claimed' | 'processing' | 'completed' | 'failed';

export type HuntType = 'full' | 'refresh' | 'price_only';

export type HuntSource =
  | 'admin'
  | 'api'
  | 'suggestion'
  | 'competitor_scan'
  | 'user_request'
  | 'scheduled';

export type MarketSourceType = 'api' | 'scrape' | 'manual';

export type CategoryType = 'function' | 'audience' | 'platform' | 'department';

export type TitleTemplate = 'best' | 'top_10' | 'alternatives' | 'vs' | 'free' | 'open_source';

export type ContentIdeaStatus = 'pending' | 'analyzed' | 'approved' | 'rejected' | 'queued';

export type ImportBatchStatus = 'processing' | 'completed' | 'completed_with_errors' | 'failed';

export type ArticleStatus = 'draft' | 'published' | 'archived';

// V2.2: Comparison infrastructure
export type LearningCurve = 'minutes' | 'hours' | 'days' | 'weeks' | 'months';

export type AudienceFitType = 'ideal' | 'good' | 'neutral' | 'poor' | 'avoid';

// V3: SaaS Management Platform (SMP) types
export type SMPPricingModel =
  | 'free'
  | 'flat'
  | 'per_seat'
  | 'per_unit'
  | 'tiered'
  | 'hybrid'
  | 'usage_based'
  | 'ad_spend'
  | 'contact_sales';

export type BillingCycle = 'monthly' | 'annual' | 'quarterly';

// Tolerant Reader: ScalingUnit is now a string to avoid pipeline failures on novel units
// Common values: user, seat, contact, subscriber, GB, message, request, token, project
// The display layer (display.ts) categorizes these into team/audience/resource/usage
export type ScalingUnit = string;

export type PricingConfidence = 'high' | 'medium' | 'low';

export type MigrationDifficulty = 'trivial' | 'easy' | 'moderate' | 'hard' | 'locked';

export type DiscountType = 'startup' | 'nonprofit' | 'education' | 'government' | 'annual_prepay';
export type PricingValidationStatus = 'verified' | 'inferred' | 'conflicted';
export type PricingV2BillingCadence = 'monthly' | 'annual' | 'one_time';
export type PricingV2ChargeTiming = 'in_advance' | 'in_arrears';
export type PricingV2RateType =
  | 'flat'
  | 'unit'
  | 'tiered_graduated'
  | 'tiered_volume'
  | 'package'
  | 'percentage';
export type PricingV2ComponentKind = 'base' | 'addon' | 'overage';
export type PricingV2SourceType =
  | 'official'
  | 'docs'
  | 'support'
  | 'legal'
  | 'editorial'
  | 'community';
export type PricingV2AcquisitionMode = 'LINK_ONLY' | 'API_ONLY' | 'SCRAPE_ALLOWED' | 'BLOCKED';
export type PricingV2LlmIngestionAllowed = 'NO' | 'YES_LIMITED' | 'YES';
export type PricingV2Category = 'team' | 'usage' | 'resource' | 'audience' | 'money';
export type PricingV2RoundingMode = 'ceil' | 'floor' | 'nearest';
export type PricingV2OverageMode = 'none' | 'unit_overage' | 'tiered_overage';

// ============================================================================
// V3: SMP PRICING & TAXONOMY SCHEMAS (for SaaS Management Platform)
// ============================================================================

/**
 * Data Governance for compliance and data sovereignty
 * Used by Journey 1 (Compliance-First) and Journey 6 (Data Sovereign European)
 */
export interface DataGovernanceData {
  // Data location (Journey 1 & 6)
  data_residency: string[]; // ["US", "EU (Frankfurt)", "UK", "Global"]
  residency_configurable: boolean; // Can you choose your region?

  // Self-hosting (Journey 6)
  self_hostable: boolean;
  self_host_complexity?: 'docker' | 'k8s' | 'vm' | 'enterprise_only';

  // Sub-processors disclosure (Journey 6 - GDPR Article 28)
  sub_processors?: Array<{
    name: string; // e.g., "OpenAI", "AWS", "Stripe"
    purpose: string; // e.g., "AI features", "Hosting", "Payments"
    data_location: string; // e.g., "US", "EU", "Global"
    data_types: string[]; // e.g., ["user content", "metadata only"]
    can_disable: boolean; // Can you opt out of this sub-processor?
  }>;

  // Compliance (Journey 1)
  gdpr_compliant: boolean;
  gdpr_notes?: string; // "DPA available on request", "EU representative: ..."
  dpa_available: boolean; // Data Processing Agreement available
  compliance_certifications: string[]; // ["SOC2 Type II", "ISO 27001", "HIPAA BAA"]
  encryption_options: string[]; // ["AES-256", "BYOK", "Customer Managed Keys"]
}

/**
 * Setup step for onboarding guide
 */
export interface SetupStep {
  step: number;
  action: string; // "Run `brew install cursor`" or "Visit cursor.sh/download"
  command?: string; // Extract CLI command if present: "brew install cursor"
  description?: string; // Additional context: "Downloads .dmg for macOS"
}

/**
 * Red tape flags - setup blockers that surprise users
 */
export interface SetupRedTape {
  cc_required?: boolean; // Credit card required for "free" trial
  domain_required?: boolean; // Cannot use Gmail, requires business domain
  admin_required?: boolean; // Needs Full Disk Access (macOS) or Admin privileges
  sales_gated?: boolean; // "Contact Sales" to provision
  approval_required?: boolean; // Email/domain verification takes time
}

/**
 * Setup complexity for non-technical buyers
 * Used by Journey 4 (Non-Technical Agency Owner)
 *
 * V2: Expanded with detailed setup path extraction
 */
export interface SetupComplexityData {
  // V1: Binary flags (keep for backward compatibility)
  requires_developer: boolean;
  requires_it_admin: boolean;
  implementation_partner_needed: boolean;
  estimated_setup_time: 'minutes' | 'hours' | 'days' | 'weeks';
  technical_blockers?: string[]; // ["API configuration", "DNS setup", "Custom SMTP"]

  // V2: Detailed setup path (The "First 5 Minutes")
  setup_type?: 'cli' | 'web' | 'installer' | 'hybrid' | 'api_only';
  friction_score?: number; // 1 (instant) to 10 (multi-day setup)
  steps?: SetupStep[]; // Actual setup steps extracted from docs
  aha_moment?: string; // "Seeing the 'Composer' (Cmd+I) refactor your first file"
  red_tape?: SetupRedTape; // Flags for common blockers
  setup_url?: string; // Link to official setup guide
}

/**
 * Migration warning for hostage migrators
 * Used by Journey 3 (Hostage Migrator)
 */
export interface MigrationWarning {
  feature: string; // "Notion Synced Blocks"
  breaks_on_export_to: string[]; // ["obsidian", "roam-research"]
  becomes: string; // "static text (no longer syncs)"
  workaround?: string | null;
  severity: 'critical' | 'major' | 'minor'; // Data loss vs cosmetic
}

/**
 * Individual pricing plan (for dropdown selection in future user dashboard)
 * ID format: `${item_slug}-${slugify(name)}` for deterministic matching
 */
export interface SMPPlanData {
  id: string; // Deterministic: `${item_slug}-${slugify(name)}`
  name: string; // "Free", "Pro", "Enterprise"

  // Pricing (null = not available at this cycle)
  price_monthly?: number | null; // Monthly price, null if no monthly option
  price_annual?: number | null; // Total annual price (NOT monthly equivalent)

  // For per-seat/per-unit models
  scaling_unit?: ScalingUnit | null;
  price_per_unit?: number | null; // e.g., $8.75/user
  included_units?: number | null; // e.g., "Includes 5 users"

  // For usage-based/ad-spend models
  variable_unit?: string | null; // e.g., "GB", "1k requests", "% ad spend"
  variable_price?: number | null; // e.g., 0.12
  variable_logic_desc?: string | null; // e.g., "0.2% of ad spend"

  // Plan positioning metadata
  target_audience?: string | null;
  works_for_lenses?: Array<'personal' | 'startup' | 'enterprise'> | null;

  // Limits (for plan comparison)
  max_users?: number | null; // null = unlimited
  max_storage_gb?: number | null;
  max_projects?: number | null;

  // V3.3: Free Tier Safety (Journey 2 - Bootstrapped Solo Dev)
  free_tier_behavior?: 'hard_limit' | 'soft_limit' | 'throttle' | 'pay_as_you_go';
  overage_policy?: {
    auto_charges: boolean; // 🚨 DANGER FLAG - Does it auto-charge your credit card?
    charge_per_unit?: number; // e.g., $0.10 per 1k requests
    max_overage_pct?: number; // e.g., 20 = can't exceed 120% of included quota
    grace_period_days?: number;
    hard_cap_available: boolean; // Can you set a spending limit?
  } | null;

  // Key features (for plan comparison and recommendations)
  includes_sso: boolean;
  includes_api: boolean;
  includes_sla: boolean;
  includes_priority_support: boolean;

  // V3.3: Enterprise Features (Journey 5 - Scale-Up CTO)
  includes_audit_logs?: boolean;
  audit_log_retention_days?: number; // 90, 365, etc.
  uptime_sla?: string; // "99.9%", "99.99%", "none"
  support_response_time?: string; // "1 hour", "4 hours", "24 hours", "best effort"

  // Enterprise flag
  is_enterprise: boolean; // true = "Contact Sales"
}

/**
 * Structured pricing data for SMP cost calculations
 * Stored in items.specs.pricing_data
 */
export interface SMPPricingData {
  // Model & Currency
  model: SMPPricingModel;
  currency: string; // 3-letter ISO code (e.g., USD, EUR, GBP, SGD, INR)

  // Billing options
  billing_cycles: BillingCycle[];
  annual_discount_pct?: number | null; // e.g., 20 = 20% off

  // Plans array (the money data)
  plans: SMPPlanData[];

  // Seat types (member/guest/viewer) with pricing overrides
  seat_types?: Array<{
    type: 'member' | 'guest' | 'viewer' | 'contractor' | 'admin';
    price_per_unit?: number | null;
    free_units?: number | null;
    notes?: string | null;
  }>;

  // Volume tiers (seat ranges with price overrides)
  volume_tiers?: Array<{
    min_units: number;
    max_units?: number | null;
    price_per_unit: number;
    applies_to?: 'member' | 'seat' | 'workspace' | 'gb' | 'request' | null;
  }>;

  // Usage meters (GB/requests/messages)
  usage_meters?: Array<{
    unit: 'gb' | 'message' | 'request' | 'minute' | 'api_call';
    price_per_unit: number;
    included_units?: number | null;
    billing_cycle: BillingCycle;
  }>;

  // Add-ons (SSO, audit logs, storage)
  add_ons?: Array<{
    name: string;
    price: number;
    unit: 'seat' | 'account' | 'org' | 'gb' | 'request';
    required: boolean;
    notes?: string | null;
  }>;

  // Hidden costs
  min_seats?: number | null; // e.g., "Min 5 seats"
  implementation_fee?: number | null; // One-time setup cost

  // Verification & Confidence
  pricing_page_url?: string | null; // For user reference & verification
  last_verified?: string | null; // ISO date when pricing was verified
  confidence?: PricingConfidence | null; // How certain we are about this data

  // Discounts available
  discounts_available: DiscountType[];
}

/**
 * Taxonomy data for "spend by category" analysis
 * Used for department budgets and function-based filtering
 */
export interface SMPTaxonomyData {
  // Primary classification
  primary_function: string; // e.g., "Project Management", "CRM", "Chat"
  sub_category?: string | null;
  original_function?: string;
  secondary_functions: string[]; // e.g., ["Documentation", "Wiki"]

  // Department ownership (who pays)
  likely_departments: string[]; // e.g., ["Engineering", "Product"]
}

/**
 * Portability data for switching recommendations
 * Determines if switching is feasible and how hard it is
 */
export interface SMPPortabilityData {
  // Export capabilities
  has_data_export: boolean;
  export_formats: string[]; // ['csv', 'json', 'xml', 'pdf']
  has_api_export: boolean; // Can programmatically extract all data

  // Migration analysis
  migration_difficulty?: MigrationDifficulty | null;
  import_from: string[]; // Tool slugs with import wizards FROM
  export_to: string[]; // Tool slugs with export wizards TO

  // V3.3: Migration Warnings (Journey 3 - Hostage Migrator)
  migration_warnings?: MigrationWarning[]; // What breaks when you migrate

  // Contract terms (for switching timing)
  min_commitment_months?: number | null; // null = month-to-month
  cancellation_notice_days?: number | null;
}

export interface ToolCanonicalFacts {
  pricing_plan_entities?: Array<{
    plan_id: string;
    plan_name: string;
    audience?: string | null;
    works_for_lenses?: Array<'personal' | 'startup' | 'enterprise'> | null;
    seat_type?: string | null;
    price_monthly?: number | null;
    price_annual?: number | null;
    source_url?: string | null;
    currency?: string | null;
  }>;
  latest_models_comparison?: string[];
  model_inventory_raw?: string[];
  setup_tracks?: {
    dev?: SetupStep[];
    non_dev?: SetupStep[];
  };
  quality?: {
    conflicts_count?: number;
    pricing_conflicts_count?: number;
    pricing_conflicts?: Array<{
      key: string;
      values: unknown[];
      urls: string[];
    }>;
    pricing_lens_coverage?: {
      personal?: number;
      startup?: number;
      enterprise?: number;
    };
    constraints_lens_coverage?: {
      personal?: number;
      startup?: number;
      enterprise?: number;
    };
    integrations_lens_coverage?: {
      personal?: number;
      startup?: number;
      enterprise?: number;
    };
  };
  faq_locked?: Array<{
    question: string;
    answer: string;
    answer_source_url?: string;
    answer_source_type?: 'official' | 'editorial' | 'community';
  }>;
}

// ============================================================================
// PRICING V2 (Compositional pricing model for deterministic comparisons)
// ============================================================================

export interface PricingV2PolicySnapshot {
  acquisition_mode: PricingV2AcquisitionMode;
  llm_ingestion_allowed: PricingV2LlmIngestionAllowed;
  policy_version?: string;
}

export interface PricingV2EvidenceRef {
  url: string;
  source_type: PricingV2SourceType;
  retrieved_at: string;
  claim_id: string;
  policy_snapshot: PricingV2PolicySnapshot;
}

export interface PricingV2Meter {
  id: string;
  label: string;
  unit_ucum: string;
  category: PricingV2Category;
}

export interface PricingV2Tier {
  up_to?: number | null;
  unit_price?: number | null;
  package_size?: number | null;
  package_price?: number | null;
  percent_rate?: number | null;
}

export interface PricingV2PriceComponent {
  id: string;
  component_kind: PricingV2ComponentKind;
  meter_id: string | null;
  rate_type: PricingV2RateType;
  cadence: PricingV2BillingCadence;
  timing: PricingV2ChargeTiming;
  currency: string;
  min_units?: number | null;
  included_units?: number | null;
  max_units?: number | null;
  is_optional: boolean;
  requires_component_ids?: string[];
  flat_price?: number | null;
  unit_price?: number | null;
  tiers?: PricingV2Tier[] | null;
  percent_rate?: number | null;
  min_charge?: number | null;
  max_charge?: number | null;
  rounding_mode?: PricingV2RoundingMode;
  overage_mode?: PricingV2OverageMode;
  evidence: PricingV2EvidenceRef[];
  notes?: string | null;
  validation_status: PricingValidationStatus;
  needs_review?: boolean;
}

export interface PricingV2PlanBillingOption {
  cadence: Exclude<PricingV2BillingCadence, 'one_time'>;
  price_components: PricingV2PriceComponent[];
}

export interface PricingV2Plan {
  id: string;
  name: string;
  is_free: boolean;
  is_enterprise: boolean;
  billing_options: PricingV2PlanBillingOption[];
  contract_terms?: {
    annual_only?: boolean;
  } | null;
  evidence: PricingV2EvidenceRef[];
}

export interface PricingV2Conflict {
  key: string;
  values: unknown[];
  urls: string[];
}

export interface PricingV2ProductPricing {
  product_id: string;
  official_pricing_url: string | null;
  currency_default: string;
  meters: PricingV2Meter[];
  plans: PricingV2Plan[];
  last_verified_at: string | null;
  confidence: 'high' | 'med' | 'low';
  conflicts: PricingV2Conflict[];
}

// ============================================================================
// SPECS TYPES (Type-specific structured data in JSONB)
// ============================================================================

/** Specs schema for software tools */
export interface ToolSpecs {
  // Pricing (legacy - kept for backward compatibility)
  pricing_model?: PricingModel; // ⚠️ DEPRECATED: Use pricing_type column instead
  starting_price?: string | null; // e.g., "$12/mo"
  free_tier_limits?: string | null; // e.g., "5 projects, 10 users"
  trial_days?: number | null; // e.g., 14

  // V3: SMP Pricing Data (structured for cost calculations)
  pricing_data?: SMPPricingData;
  pricing_v2?: PricingV2ProductPricing;

  // V3: SMP Taxonomy (for spend-by-category analysis)
  taxonomy?: SMPTaxonomyData;

  // V3: SMP Portability (for switching recommendations)
  portability?: SMPPortabilityData;

  // V4: Constraints (Cynical CTO - hidden ceilings)
  constraints?: ToolConstraints;

  // V3.2: Data Governance (Journey 1 & 6 - Compliance-First & Data Sovereign)
  data_governance?: DataGovernanceData;

  // V3.2: Setup Complexity (Journey 4 - Non-Technical Agency Owner)
  setup_complexity?: SetupComplexityData;

  // Platform & Integration
  integrations?: string[] | Record<string, unknown>; // e.g., ["Slack", "Zapier", "Google Drive"]
  platforms?: string[]; // e.g., ["Web", "iOS", "Mac", "Windows", "Linux"]
  support_options?: string[]; // e.g., ["Chat", "Email", "Phone", "Docs"]

  // Security & Compliance (legacy - use data_governance for new data)
  security?: string[]; // e.g., ["SSO", "SOC2", "GDPR", "HIPAA"]
  sso_providers?: string[]; // e.g., ["Google", "Microsoft", "SAML", "Okta"]
  data_export_formats?: string[]; // e.g., ["CSV", "JSON", "PDF"]

  // Developer
  api_available?: boolean;
  open_source_repo?: string | null; // GitHub URL if applicable

  // V2.2: Migration & Portability (legacy - use portability for new data)
  data_import_from?: string[]; // Slugs of tools that can be imported from
  migration_out_difficulty?: 1 | 2 | 3 | 4 | 5; // 1=trivial, 5=very hard
  proprietary_features?: string[]; // Features that won't transfer on migration

  // V5: Cynical CTO layers
  vetoLogic?: unknown[];
  realityChecks?: unknown[];
  user_signal_summary?: {
    community_pros: number;
    community_cons: number;
    editorial_pros: number;
    editorial_cons: number;
    corroborating_community_domains: number;
    community_domains: string[];
    reddit_claims: number;
    forum_claims: number;
    hn_claims: number;
    top_user_reported_signals: string[];
    top_user_reported_claims: Array<{
      text: string;
      source_type: 'community' | 'editorial';
      source_domain: string | null;
      source_channel?: 'reddit' | 'forum' | 'hn' | 'editorial' | 'other';
    }>;
  };
  user_reported_pros?: Array<{
    text: string;
    source_url: string;
    source_type: 'community' | 'editorial';
    claim_type: 'opinion' | 'fact';
    corroborating_source_count?: number;
    claim_confidence_tier?: 'high' | 'medium' | 'low';
    retrieved_at?: string;
  }>;
  user_reported_cons?: Array<{
    text: string;
    source_url: string;
    source_type: 'community' | 'editorial';
    claim_type: 'opinion' | 'fact';
    corroborating_source_count?: number;
    claim_confidence_tier?: 'high' | 'medium' | 'low';
    retrieved_at?: string;
  }>;

  // V4: Category-specific extracted data
  categorySpecificData?: Record<string, unknown>;
  specifics?: Record<string, unknown>;
  canonical?: ToolCanonicalFacts;
  research_data?: Record<string, unknown>;
  detected_category?: string;

  // Legacy carry-over (context-specific elsewhere, but allow for compatibility)
  pros?: unknown[];
  cons?: unknown[];
}

/** Specs schema for hardware gear */
export interface GearSpecs {
  weight?: string; // e.g., "2.5 lbs"
  dimensions?: string; // e.g., "12 x 8 x 4 inches"
  battery_life?: string; // e.g., "8 hours"
  warranty?: string; // e.g., "2 years"
  connectivity?: string[]; // e.g., ["USB-C", "Bluetooth 5.0", "WiFi 6"]
  materials?: string[]; // e.g., ["Aluminum", "Gorilla Glass"]
  certifications?: string[]; // e.g., ["IP67", "MIL-STD-810G"]
  in_box?: string[]; // e.g., ["Device", "Cable", "Manual"]
}

/** Union type for all specs */
export type ItemSpecs = ToolSpecs | GearSpecs | Record<string, unknown>;

/** Base score breakdown for objective quality metrics (JSONB) */
export interface BaseScoreBreakdown {
  reliability?: number; // 0-100: uptime, stability
  features?: number; // 0-100: feature completeness
  value?: number; // 0-100: price-to-value ratio
  support?: number; // 0-100: customer support quality
  ux?: number; // 0-100: user experience
  documentation?: number; // 0-100: docs quality
  data_portability?: number; // 0-100: ease of export/migration
}

/** Company info stored in metadata JSONB */
export interface CompanyInfo {
  founded_year?: number; // e.g., 2015
  headquarters?: string; // e.g., "San Francisco, CA"
  funding_stage?:
    | 'bootstrapped'
    | 'seed'
    | 'series_a'
    | 'series_b'
    | 'series_c'
    | 'public'
    | 'acquired';
  employee_range?: '1-10' | '10-50' | '50-100' | '100-500' | '500-1000' | '1000+';
  owned_by?: string | null; // Parent company if acquired
  publicly_traded?: boolean;
}

/** Extended metadata schema (Knowledge Card + company + competitors) */
export interface ItemMetadata {
  // Knowledge Card fields (from existing schema)
  website_url?: string;
  pricing_type?: PricingModel;
  short_description?: string;
  features?: string[];
  target_audiences?: string[];
  meta?: {
    data_quality: 'high' | 'medium' | 'low';
    extraction_date: string;
  };
  company_info?: {
    name?: string;
    latest_version?: string;
  };
  version?: string;

  // V4.1: Authentic FAQs (from PAA/forums/Reddit)
  faqs?: Array<{
    question: string;
    answer: string;
    question_source: 'paa' | 'forum' | 'reddit';
    question_source_url?: string;
    answer_source_url: string;
    answer_source_type: 'official' | 'editorial' | 'community';
  }>;

  // V2: Company info
  company?: CompanyInfo;

  // V2: Related items (slugs)
  competitors?: string[]; // Direct competitors
  related_items?: string[]; // Complementary tools
}

// ============================================================================
// BASE TYPES (Raw database rows)
// ============================================================================

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  type: CategoryType;
  display_order: number;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
}

export interface ItemCategoryLink {
  id: string;
  item_id: string;
  category_id: string;
  relevance_score: number;
  created_at: string;
}

/** @deprecated Use ItemCategoryLink instead */
export type ToolCategoryLink = ItemCategoryLink;

/**
 * Item - The core entity type (formerly "Tool")
 * Supports polymorphic types: tool (software), gear (hardware)
 */
export interface Item {
  id: string;
  name: string;
  slug: string;
  website: string | null;
  logo_path: string | null;
  logo_url: string | null;
  short_description: string | null;
  long_description: string | null;
  // Derived/attached (not stored)
  category?: Category | null;
  view_count?: number | null;
  pricing_type: PricingModel;
  avg_score: number; // Aggregated from contextual reviews
  review_count: number;
  embedding: number[] | null; // vector(1536)
  metadata: ItemMetadata | null; // Knowledge Card + company + competitors
  is_featured: boolean;
  is_verified: boolean;
  type: ItemType; // Discriminator: 'tool' (software) or 'gear' (hardware)
  video_id: string | null; // YouTube video ID
  video_title: string | null;

  // V2: New columns (queryable)
  verdict: string | null; // One-line bottom-line conclusion
  base_score: number | null; // Objective quality score (0-100)
  last_major_update: string | null; // ISO date string

  // V2: New JSONB fields
  specs: ItemSpecs; // Type-specific structured data
  base_score_breakdown: BaseScoreBreakdown; // Detailed scoring components

  // V2.2: Comparison infrastructure
  data_confidence: number | null; // 0.0-1.0, hedge claims below 0.8
  learning_curve: LearningCurve | null; // Time to basic proficiency

  // V3: SMP pricing verification
  pricing_verified_at: string | null; // When pricing was last verified
  pricing_confidence: PricingConfidence | null; // How confident we are in pricing data

  // V3.1: Review Context (The "Human Touch" Layer)
  review_context: ReviewContext | null; // Tribal knowledge, vibe, and opinionated guidance

  // V3.2: Parent/Child Relationship (Suite Bundling)
  parent_id: string | null; // References parent suite (e.g., Google Meet → Google Workspace)

  // V3.3: Pricing Normalization (Computed fields for apples-to-apples comparison)
  effective_starting_price_monthly: number | null; // True minimum monthly cost (accounts for min_seats)
  effective_starting_price_annual: number | null; // True minimum annual cost
  pricing_comparison_tier: 'individual' | 'team' | 'business' | 'enterprise' | null; // Which plan tier used for comparison
  pricing_comparison_plan_id: string | null; // Plan ID from specs.pricing_data.plans[].id
  normalized_price_per_seat_monthly: number | null; // Per-seat monthly price (null for flat-rate)
  normalized_price_per_seat_annual: number | null; // Per-seat annual price

  created_at: string;
  updated_at: string;
}

/**
 * @deprecated Use Item instead. Kept for backward compatibility.
 */
export type Tool = Item;

export interface RateLimit {
  id: string;
  identifier: string;
  endpoint: string;
  window_start: string;
  request_count: number;
}

export interface AdminSession {
  id: string;
  token_hash: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  expires_at: string;
  last_used_at: string;
  is_revoked: boolean;
}

export interface Context {
  id: string;
  title: string;
  slug: string;
  intro_text: string | null;
  meta_description: string | null;
  category_id: string | null;
  primary_item_id: string | null; // V2: renamed from primary_tool_id
  tool_count: number; // Kept as tool_count for semantic clarity
  is_featured: boolean;
  // Knowledge Graph fields
  title_template: TitleTemplate;
  title_noun: string | null;
  title_modifier: string | null;
  function_category_id: string | null;
  audience_category_id: string | null;
  platform_category_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: string;
  item_id: string; // V2: renamed from tool_id
  context_id: string;
  score: number | null; // Contextual score (different from item.base_score)
  summary_markdown: string | null;
  pros: string[];
  cons: string[];
  sentiment_tags: string[];
  sources?: unknown[];
  generation_quality?: Record<string, unknown> | null;
  upvotes: number;
  downvotes: number;
  display_order: number;

  // V2.2: Contextual fit enhancements
  fit_score: number | null; // 0-100, how well item fits THIS context
  value_rating: number | null; // 1-5, value for money for this audience
  standout_features: string[]; // Features especially relevant to this context
  dealbreakers: string[]; // Concerns that might be dealbreakers for this audience
  switching_from: string[]; // Common tools this audience switches FROM

  created_at: string;
  updated_at: string;
}

export interface Article {
  id: string;
  title: string;
  slug: string;
  status: ArticleStatus;
  summary_markdown: string | null;
  content_markdown: string | null;
  outline: Record<string, unknown> | null;
  tags: string[];
  source_tool_ids: string[];
  source_context_ids: string[];
  source_data: Record<string, unknown> | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ArticleInsight {
  id: string;
  item_id: string | null;
  context_id: string | null;
  insight_type: string;
  insight: string;
  source_url: string | null;
  source_type: 'official' | 'editorial' | 'community' | null;
  claim_type: 'fact' | 'opinion' | null;
  tags: string[];
  confidence: number | null;
  created_at: string;
}

export interface SourcePolicyRegistry {
  domain: string;
  acquisition_mode: 'LINK_ONLY' | 'API_ONLY' | 'SCRAPE_ALLOWED' | 'BLOCKED';
  storage_mode: 'URL_ONLY' | 'METADATA_ONLY' | 'SHORT_EXCERPT' | 'NO_STORE';
  display_mode: 'LINK_ONLY' | 'ATTRIBUTED_EXCERPT' | 'NO_DISPLAY';
  llm_ingestion_allowed: 'NO' | 'YES_LIMITED' | 'YES';
  review_status: 'VERIFIED' | 'DEFAULT';
  tos_url: string | null;
  last_reviewed_at: string | null;
  policy_version: string | null;
  notes: string | null;
  path_overrides: Array<{
    path_prefix: string;
    acquisition_mode?: 'LINK_ONLY' | 'API_ONLY' | 'SCRAPE_ALLOWED' | 'BLOCKED';
    llm_ingestion_allowed?: 'NO' | 'YES_LIMITED' | 'YES';
    notes?: string;
  }> | null;
  max_chars_ingested: number | null;
  created_at: string;
  updated_at: string;
}

export type SourcePolicyRegistryInsert = SourcePolicyRegistry;
export type SourcePolicyRegistryUpdate = Partial<SourcePolicyRegistry>;

export interface SourcePolicyReviewQueue {
  domain: string;
  first_seen_at: string;
  last_seen_at: string;
  count_seen: number;
  sample_urls: string[] | null;
  sample_titles: string[] | null;
  suggested_tos_url: string | null;
  status: 'OPEN' | 'TRIAGED' | 'APPROVED' | 'BLOCKED';
  updated_at: string;
}

export type SourcePolicyReviewQueueInsert = SourcePolicyReviewQueue;
export type SourcePolicyReviewQueueUpdate = Partial<SourcePolicyReviewQueue>;

export interface Claim {
  id: string;
  item_id: string;
  context_id: string | null;
  claim_type: string;
  value_json: Record<string, unknown> | null;
  source_url: string | null;
  source_domain: string | null;
  policy_snapshot: Record<string, unknown> | null;
  confidence: number | null;
  intent: string | null;
  extracted_at: string;
}

export type ClaimInsert = Omit<Claim, 'id' | 'extracted_at'> & {
  id?: string;
  extracted_at?: string;
};
export type ClaimUpdate = Partial<Claim>;

// V2.2: Item-Audience Fit (links items to audience categories)
export interface ItemAudienceFit {
  id: string;
  item_id: string;
  category_id: string; // Reference to audience category
  fit_type: AudienceFitType;
  reason: string | null;
  created_at: string;
}

// V2.2: Comparison Insights (sparse, curated for high-traffic pairs)
export interface ComparisonInsight {
  id: string;
  item_a_slug: string; // Alphabetically ordered (a < b)
  item_b_slug: string;
  item_a_id: string | null;
  item_b_id: string | null;

  // Curated insights
  verdict: string | null; // "Notion for teams, Obsidian for power users"
  choose_a_if: string[]; // ["You need real-time collaboration"]
  choose_b_if: string[]; // ["You want local-first"]
  migration_notes_a_to_b: string | null;
  migration_notes_b_to_a: string | null;
  why_switch_a_to_b: string[]; // Reasons people switch
  why_switch_b_to_a: string[];

  // Context-specific winners
  // { "students": { "winner": "a", "confidence": 0.9, "reason": "Free .edu plan" } }
  winner_by_context: Record<
    string,
    {
      winner: 'a' | 'b' | 'tie';
      confidence: number;
      reason?: string;
    }
  >;

  // Metadata
  is_curated: boolean;
  curator_notes: string | null;
  data_sources: string[];
  generated_at: string | null;
  curated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AffiliateOffer {
  id: string;
  item_id: string; // V2: renamed from tool_id
  url: string;
  cta_text: string;
  is_affiliate: boolean;
  network: string | null;
  commission_note: string | null;
  is_primary: boolean;
  display_order: number;
  // Strategic architecture
  priority: number;
  is_active: boolean;
  tracking_params: Record<string, unknown> | null;
  click_count: number;
  last_click_at: string | null;
  expires_at: string | null;
  // Network tier & health tracking
  network_tier: 1 | 2 | 3; // 1=API (PartnerStack/Impact), 2=Legacy (ShareASale), 3=Manual
  network_program_id: string | null;
  last_verified_at: string | null;
  verification_status: 'healthy' | 'broken' | 'expired' | 'pending' | 'unknown';
  created_at: string;
  updated_at: string;
}

export interface Vote {
  id: string;
  review_id: string;
  vote_type: -1 | 1;
  ip_hash: string;
  fingerprint_hash: string | null;
  turnstile_token: string | null;
  created_at: string;
}

// ============================================================================
// STRATEGIC ARCHITECTURE TYPES
// ============================================================================

export interface MarketState {
  id: string;
  item_id: string; // V2: renamed from tool_id
  // Pricing
  price_cents: number | null;
  price_currency: string;
  price_display: string | null;
  price_interval: string | null;
  // Free tier
  has_free_tier: boolean;
  has_free_trial: boolean;
  trial_days: number | null;
  // Availability
  in_stock: boolean;
  stock_quantity: number | null;
  is_available: boolean;
  is_deprecated: boolean;
  // Source tracking (critical)
  source_type: MarketSourceType;
  source_provider: string | null;
  source_url: string | null;
  source_raw: Record<string, unknown> | null;
  // Quality
  confidence_score: number;
  last_verified_at: string;
  verification_note: string | null;
  // Scheduling
  next_check_at: string | null;
  check_frequency_hours: number;
  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface PriceHistory {
  id: string;
  item_id: string; // V2: renamed from tool_id
  price_cents: number | null;
  price_currency: string;
  price_display: string | null;
  source_type: MarketSourceType | null;
  source_provider: string | null;
  recorded_at: string;
}

export interface ClickEvent {
  id: string;
  offer_id: string;
  item_id: string; // V2: renamed from tool_id
  referrer: string | null;
  user_agent: string | null;
  ip_hash: string | null;
  country_code: string | null;
  region: string | null;
  source_page: string | null;
  source_context_id: string | null;
  clicked_at: string;
}

export interface HuntQueue {
  id: string;
  // What to hunt
  tool_name: string;
  context_title: string | null;
  category_slug: string | null;
  // Configuration
  hunt_type: HuntType;
  force_regenerate: boolean;
  // Priority
  priority: number;
  scheduled_for: string | null;
  deadline_at: string | null;
  // Source
  source: HuntSource;
  requested_by: string | null;
  // State
  status: HuntQueueStatus;
  attempts: number;
  max_attempts: number;
  // Worker
  claimed_by: string | null;
  claimed_at: string | null;
  heartbeat_at: string | null;
  // Results
  item_id: string | null; // V2: renamed from tool_id
  context_id: string | null;
  review_id: string | null;
  // Errors
  error_message: string | null;
  error_details: Record<string, unknown> | null;
  // Metrics
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
  tokens_used: number | null;
  // Timestamps
  created_at: string;
  updated_at: string;
}

// ============================================================================
// STRATEGY GATEKEEPER TYPES
// ============================================================================

export interface ContentIdea {
  id: string;
  keyword: string;
  tool_name: string | null;
  context_query: string | null;
  // SEO Metrics
  search_volume: number | null;
  keyword_difficulty: number | null;
  cpc: number | null;
  roi_score: number | null;
  // Duplicate Detection
  is_duplicate: boolean;
  duplicate_tool_id: string | null;
  duplicate_review_id: string | null;
  duplicate_reason: string | null;
  semantic_similarity: number | null;
  embedding: number[] | null;
  // Workflow
  status: ContentIdeaStatus;
  source: string;
  source_file: string | null;
  import_batch_id: string | null;
  notes: string | null;
  rejection_reason: string | null;
  approved_by: string | null;
  approved_at: string | null;
  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface ImportBatch {
  id: string;
  filename: string;
  total_rows: number;
  imported_rows: number;
  skipped_rows: number;
  duplicate_rows: number;
  error_rows: number;
  status: ImportBatchStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  completed_at: string | null;
}

// ============================================================================
// INSERT TYPES (For creating new records)
// ============================================================================

export interface CategoryInsert {
  name: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
  display_order?: number;
  is_featured?: boolean;
}

export interface ItemInsert {
  name: string;
  slug: string;
  website?: string | null;
  logo_path?: string | null;
  logo_url?: string | null;
  short_description?: string | null;
  long_description?: string | null;
  pricing_type?: PricingModel;
  embedding?: number[] | null;
  metadata?: ItemMetadata | null;
  is_featured?: boolean;
  is_verified?: boolean;
  type?: ItemType;
  video_id?: string | null;
  video_title?: string | null;
  // V2: New columns
  verdict?: string | null;
  base_score?: number | null;
  last_major_update?: string | null; // ISO date
  // V2: New JSONB
  specs?: ItemSpecs;
  base_score_breakdown?: BaseScoreBreakdown;
  // V2.2: Comparison infrastructure
  data_confidence?: number | null;
  learning_curve?: LearningCurve | null;
  // V3: SMP pricing verification
  pricing_verified_at?: string | null;
  pricing_confidence?: PricingConfidence | null;
  // V3.1: Review Context
  review_context?: ReviewContext | null;
  // V3.2: Parent/Child Relationship
  parent_id?: string | null;
}

/** @deprecated Use ItemInsert instead */
export type ToolInsert = ItemInsert;

export interface ContextInsert {
  title: string;
  slug: string;
  intro_text?: string | null;
  meta_description?: string | null;
  category_id?: string | null;
  primary_item_id?: string | null; // V2: renamed from primary_tool_id
  is_featured?: boolean;
}

export interface ReviewInsert {
  item_id: string; // V2: renamed from tool_id
  context_id: string;
  score?: number | null;
  summary_markdown?: string | null;
  pros?: string[];
  cons?: string[];
  sentiment_tags?: string[];
  generation_quality?: Record<string, unknown> | null;
  display_order?: number;
  // V2.2: Contextual fit
  fit_score?: number | null;
  value_rating?: number | null;
  standout_features?: string[];
  dealbreakers?: string[];
  switching_from?: string[];
}

export interface ArticleInsert {
  title: string;
  slug: string;
  status?: ArticleStatus;
  summary_markdown?: string | null;
  content_markdown?: string | null;
  outline?: Record<string, unknown> | null;
  tags?: string[];
  source_tool_ids?: string[];
  source_context_ids?: string[];
  source_data?: Record<string, unknown> | null;
  published_at?: string | null;
}

export interface ArticleInsightInsert {
  item_id?: string | null;
  context_id?: string | null;
  insight_type: string;
  insight: string;
  source_url?: string | null;
  source_type?: 'official' | 'editorial' | 'community' | null;
  claim_type?: 'fact' | 'opinion' | null;
  tags?: string[];
  confidence?: number | null;
}

export interface AffiliateOfferInsert {
  item_id: string; // V2: renamed from tool_id
  url: string;
  cta_text?: string;
  is_affiliate?: boolean;
  network?: string | null;
  commission_note?: string | null;
  is_primary?: boolean;
  display_order?: number;
  priority?: number;
  is_active?: boolean;
  tracking_params?: Record<string, unknown> | null;
  expires_at?: string | null;
  network_tier?: 1 | 2 | 3;
  network_program_id?: string | null;
  verification_status?: 'healthy' | 'broken' | 'expired' | 'pending' | 'unknown';
}

export interface MarketStateInsert {
  item_id: string; // V2: renamed from tool_id
  source_type: MarketSourceType;
  price_cents?: number | null;
  price_currency?: string;
  price_display?: string | null;
  price_interval?: string | null;
  has_free_tier?: boolean;
  has_free_trial?: boolean;
  trial_days?: number | null;
  in_stock?: boolean;
  stock_quantity?: number | null;
  is_available?: boolean;
  is_deprecated?: boolean;
  source_provider?: string | null;
  source_url?: string | null;
  source_raw?: Record<string, unknown> | null;
  confidence_score?: number;
  verification_note?: string | null;
  next_check_at?: string | null;
  check_frequency_hours?: number;
}

export interface HuntQueueInsert {
  tool_name: string;
  context_title?: string | null;
  category_slug?: string | null;
  hunt_type?: HuntType;
  force_regenerate?: boolean;
  priority?: number;
  scheduled_for?: string | null;
  deadline_at?: string | null;
  source?: HuntSource;
  requested_by?: string | null;
}

export interface ClickEventInsert {
  offer_id: string;
  item_id: string; // V2: renamed from tool_id
  referrer?: string | null;
  user_agent?: string | null;
  ip_hash?: string | null;
  country_code?: string | null;
  region?: string | null;
  source_page?: string | null;
  source_context_id?: string | null;
}

export interface ContentIdeaInsert {
  keyword: string;
  tool_name?: string | null;
  context_query?: string | null;
  search_volume?: number | null;
  keyword_difficulty?: number | null;
  cpc?: number | null;
  source?: string;
  source_file?: string | null;
  import_batch_id?: string | null;
  notes?: string | null;
}

export interface ImportBatchInsert {
  filename: string;
  total_rows: number;
  created_by?: string | null;
  notes?: string | null;
}

// V2.2: Comparison infrastructure inserts
export interface ItemAudienceFitInsert {
  item_id: string;
  category_id: string;
  fit_type: AudienceFitType;
  reason?: string | null;
}

export interface ComparisonInsightInsert {
  item_a_slug: string; // Must be < item_b_slug (alphabetical)
  item_b_slug: string;
  item_a_id?: string | null;
  item_b_id?: string | null;
  verdict?: string | null;
  choose_a_if?: string[];
  choose_b_if?: string[];
  migration_notes_a_to_b?: string | null;
  migration_notes_b_to_a?: string | null;
  why_switch_a_to_b?: string[];
  why_switch_b_to_a?: string[];
  winner_by_context?: Record<
    string,
    { winner: 'a' | 'b' | 'tie'; confidence: number; reason?: string }
  >;
  is_curated?: boolean;
  curator_notes?: string | null;
  data_sources?: string[];
}

// ============================================================================
// UPDATE TYPES (For partial updates)
// ============================================================================

export type CategoryUpdate = Partial<Omit<Category, 'id' | 'created_at' | 'updated_at'>>;
export type ItemUpdate = Partial<Omit<Item, 'id' | 'created_at' | 'updated_at'>>;
/** @deprecated Use ItemUpdate instead */
export type ToolUpdate = ItemUpdate;
export type ContextUpdate = Partial<Omit<Context, 'id' | 'created_at' | 'updated_at'>>;
export type ReviewUpdate = Partial<Omit<Review, 'id' | 'created_at' | 'updated_at'>>;
export type ArticleUpdate = Partial<Omit<Article, 'id' | 'created_at' | 'updated_at'>>;
export type ArticleInsightUpdate = Partial<Omit<ArticleInsight, 'id' | 'created_at'>>;
export type AffiliateOfferUpdate = Partial<
  Omit<AffiliateOffer, 'id' | 'created_at' | 'updated_at'>
>;
export type MarketStateUpdate = Partial<
  Omit<MarketState, 'id' | 'item_id' | 'created_at' | 'updated_at'>
>;
export type HuntQueueUpdate = Partial<Omit<HuntQueue, 'id' | 'created_at' | 'updated_at'>>;
export type ContentIdeaUpdate = Partial<Omit<ContentIdea, 'id' | 'created_at' | 'updated_at'>>;
export type ImportBatchUpdate = Partial<Omit<ImportBatch, 'id' | 'created_at'>>;
// V2.2: Comparison infrastructure updates
export type ItemAudienceFitUpdate = Partial<
  Omit<ItemAudienceFit, 'id' | 'item_id' | 'category_id' | 'created_at'>
>;
export type ComparisonInsightUpdate = Partial<
  Omit<ComparisonInsight, 'id' | 'item_a_slug' | 'item_b_slug' | 'created_at' | 'updated_at'>
>;

// ============================================================================
// JOINED/ENRICHED TYPES (For queries with relations)
// ============================================================================

export interface ItemWithCategory extends Item {
  category: Category | null;
}
/** @deprecated Use ItemWithCategory instead */
export type ToolWithCategory = ItemWithCategory;

export interface CategoryTag {
  id: string;
  name: string;
  type: CategoryType;
  slug: string;
}

export interface ItemWithTags extends Item {
  function_tags: CategoryTag[];
  audience_tags: CategoryTag[];
  platform_tags: CategoryTag[];
}
/** @deprecated Use ItemWithTags instead */
export type ToolWithTags = ItemWithTags;

export interface ItemWithDetails extends Item {
  category: Category | null;
  affiliate_offers: AffiliateOffer[];
  reviews: ReviewWithContext[];
  function_tags?: CategoryTag[];
  audience_tags?: CategoryTag[];
  platform_tags?: CategoryTag[];
}
/** @deprecated Use ItemWithDetails instead */
export type ToolWithDetails = ItemWithDetails;

export interface ReviewWithItem extends Review {
  item: Item;
}
/** @deprecated Use ReviewWithItem instead */
export type ReviewWithTool = ReviewWithItem;

export interface ReviewWithContext extends Review {
  context: Context;
}

export interface ReviewFull extends Review {
  item: Item;
  context: Context;
}

export interface ContextWithReviews extends Context {
  category: Category | null;
  primary_item: Item | null;
  reviews: ReviewWithItem[];
  // Knowledge Graph relations
  function_category?: Category | null;
  audience_category?: Category | null;
  platform_category?: Category | null;
}

export interface ContextListItem extends Context {
  category: Category | null;
  top_items: Pick<Item, 'id' | 'name' | 'slug' | 'logo_url'>[];
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface VoteResult {
  success: boolean;
  action?: 'created' | 'changed' | 'unchanged';
  error?: string;
}

export interface SearchResult {
  id: string;
  name: string;
  slug: string;
  short_description: string | null;
  logo_url: string | null;
  similarity: number;
}

// ============================================================================
// HUNTER AGENT TYPES
// ============================================================================

export interface HunterInput {
  toolName: string;
  contextTitle?: string; // e.g., "Best for Small Teams"
  contextSlug?: string; // Auto-generated if not provided
}

export interface HunterAnalysis {
  score: number;
  pros: string[];
  cons: string[];
  summary: string; // Markdown
  sentimentTags: string[];
  pricingType: PricingModel;
}

export interface SerperSearchResult {
  title: string;
  link: string;
  snippet: string;
  position: number;
}

export interface SerperResponse {
  organic: SerperSearchResult[];
  searchParameters: {
    q: string;
  };
}

// ============================================================================
// SUPABASE DATABASE TYPE (for client generation)
// ============================================================================

// NOTE: Supabase client typing is intentionally permissive for now to avoid
// breakage from partial schema types. Use concrete interfaces (Item, Review, etc.)
// where you want strict typing.
export type Database = any;
