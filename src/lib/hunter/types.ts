/**
 * Hunter Type Definitions
 *
 * All interfaces, types, and Zod schemas used by the Hunter system.
 *
 * @module hunter/types
 */

import { z } from 'zod';
import type { KnowledgeCard } from '../knowledge-card';
import type { ClaimVolatility, ClaimVerificationMethod } from '@/lib/claim-policy';
import type { PricingModel, HuntType } from '@/types/database';
import type { SynthesisGenerationQuality } from './services/gemini';

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface HunterConfig {
  supabaseUrl: string;
  supabaseServiceKey: string;
  geminiApiKey: string;
  serperApiKey: string;
  inventoryApiKeys?: Record<string, string | undefined>;
  isDraftMode?: boolean; // If true, reviews are created as 'draft'
  maxTokensPerHunt?: number; // Hard cap for total tokens used in a single hunt
}

// ============================================================================
// INPUT TYPES
// ============================================================================

export interface HunterInput {
  toolName: string;
  entityScope?: HunterEntityScope;
  contextTitle?: string;
  categorySlug?: string;
  website?: string;
  specialInstructions?: string; // Admin-provided guidance for this run
  queueItemId?: string; // If processing from queue
  forceUpdate?: boolean; // Bypass duplicate detection and re-extract data
  huntType?: HuntType; // 'full' | 'refresh' | 'price_only'
  skipSynthesis?: boolean; // Two-stage pipeline: stop after research phase (for batch mode)
  researchDossier?: {
    // V5: Pre-generated queries from Classifier
    normalized_tool_name: string;
    primary_category: string;
    scout_queries: string[];
    forensic_targets: string[];
    confidence: 'high' | 'medium' | 'low';
    red_flags?: string[];
  };
}

// Guidance for context hunt (optional hints for better articles)
export interface ContextHuntGuidance {
  mustIncludeTools?: string[]; // Tools that must be in the article
  sourcesToCheck?: string[]; // Domains to prioritize (e.g., reddit.com)
  specialInstructions?: string; // Free-form instructions
}

// Context-first hunt input (for "Best X for Y" discovery)
export interface ContextHuntInput {
  contextQuery: string; // e.g., "Best Note-Taking Apps for Students"
  maxTools?: number; // How many tools to find (default 5)
  guidance?: ContextHuntGuidance; // Optional hints for better research
}

// ============================================================================
// RESULT TYPES
// ============================================================================

export interface HunterResult {
  success: boolean;
  toolId?: string;
  toolName?: string;
  queueStatus?: 'completed' | 'research_complete' | 'failed' | 'defunct';
  contextId?: string;
  contextTitle?: string;
  reviewId?: string;
  defunctStatus?: {
    isDefunct: boolean;
    confidence: 'high' | 'medium' | 'low';
    shutdownDate?: string;
    reason?: string;
    evidence?: string;
  };
  error?: string;
  tokensUsed?: number;
  durationMs?: number;
  telemetry?: HuntTelemetry;
}

export interface HuntTokenTelemetry {
  total: number;
  research: number;
  analysis: number;
  other: number;
}

export interface HuntRetryTelemetry {
  retries: number;
  timeoutFailures: number;
  timeoutFallbackInvocations: number;
}

export interface HuntCostTelemetry {
  estimatedUsd: number;
  usdPerMillionTokens: {
    research: number;
    analysis: number;
    other: number;
  };
}

export interface HuntTelemetry {
  tokens: HuntTokenTelemetry;
  retries: HuntRetryTelemetry;
  cost: HuntCostTelemetry;
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

// ============================================================================
// SOURCE ATTRIBUTION TYPES (Legal Protection)
// ============================================================================

/**
 * Source type classification for legal protection
 * - official: From the tool's own website (highest confidence, factual)
 * - editorial: From independent analysis/publications (high confidence)
 * - community: From public discussions/forums (opinion, requires hedging)
 */
export type SourceType = 'official' | 'editorial' | 'community';

/**
 * Claim type classification
 * - fact: Objectively verifiable (pricing, features, platform support)
 * - opinion: Subjective assessment (reported experiences)
 */
export type ClaimType = 'fact' | 'opinion';
export type ClaimKind = 'verbatim_feature' | 'derived_metric' | 'comparison' | 'inference';

// ============================================================================
// ANALYSIS TYPES
// ============================================================================

/**
 * Pro/con claim with required source attribution for legal protection
 *
 * Every claim MUST have:
 * - source_url: Where this information came from
 * - source_type: Classification of the source's authority
 * - claim_type: Whether this is fact or opinion (determines hedging)
 * - retrieved_at: When this claim was gathered (for time-bound defense)
 */
export interface ClaimWithSource {
  text: string;
  source_url: string;
  source_type: SourceType;
  source_channel?: 'reddit' | 'forum' | 'hn' | 'editorial' | 'other';
  claim_type: ClaimType;
  retrieved_at: string; // ISO 8601 timestamp - provides "staleness" defense
  checked_at?: string;
  source_urls?: string[];
  verification_method?: ClaimVerificationMethod;
  scope?: string;
  volatility?: ClaimVolatility;
  recheck_by?: string;
  claim_kind?: ClaimKind;
  vendor_phrase?: string;
  comparison_basis_source_url?: string;
  claim_confidence_score?: number;
  claim_confidence_tier?: 'high' | 'medium' | 'low';
}

/**
 * Legacy claim format (plain string) - for backwards compatibility
 * New hunts should always produce ClaimWithSource objects
 */
export type LegacyClaim = string;

export interface HunterAnalysis {
  score: number;
  pros: (string | ClaimWithSource)[];
  cons: (string | ClaimWithSource)[];
  userReportedPros?: (string | ClaimWithSource)[];
  userReportedCons?: (string | ClaimWithSource)[];
  faqs?: Array<{
    question: string;
    answer: string;
    question_source: 'paa' | 'forum' | 'reddit';
    question_source_url?: string;
    answer_source_url: string;
    answer_source_type?: 'official' | 'editorial' | 'community';
  }>;
  summary: string;
  sentimentTags: string[];
  pricingType: PricingModel;
  websiteUrl?: string;
  shortDescription?: string;
  verdict?: string; // One-line conclusion
  // Knowledge Graph tags
  graphTags: {
    functions: string[]; // What it does: "Notetaking", "CRM"
    audiences: string[]; // Who it's for: "Students", "Small Teams"
    platforms: string[]; // Where it runs: "Web", "iOS", "Mac"
  };
  // Structured title parts (for context)
  titleParts?: {
    noun: string; // "Note-Taking Apps"
    modifier?: string; // "for Students"
  };
  // Knowledge Card (structured facts from two-pass extraction)
  knowledgeCard?: KnowledgeCard;
  // Context-specific review fields (Migration 022)
  fitScore?: number; // 0-100: How well tool fits THIS context
  valueRating?: number; // 1-5: Value for money for this audience
  standoutFeatures?: string[]; // Features especially relevant to this context
  dealbreakers?: string[]; // Concerns that might be dealbreakers
  switchingFrom?: string[]; // Common tools this audience switches FROM
  // V3.1: Review Context (The "Human Touch" Layer)
  reviewContext?: {
    humanVerdict?: string | null;
    decisionIntro?: {
      what_it_is?: string | null;
      best_for?: string | null;
      not_for?: string | null;
      main_tradeoff?: string | null;
      summary?: string | null;
    };
    decisionEvidence?: {
      best_for_reason?: {
        text?: string | null;
        source_url?: string | null;
        source_type?: SourceType | null;
        claim_type?: ClaimType | null;
      };
      not_for_reason?: {
        text?: string | null;
        source_url?: string | null;
        source_type?: SourceType | null;
        claim_type?: ClaimType | null;
      };
      tradeoff_reason?: {
        text?: string | null;
        source_url?: string | null;
        source_type?: SourceType | null;
        claim_type?: ClaimType | null;
      };
    };
    decision_intro?: {
      what_it_is?: string | null;
      best_for?: string | null;
      not_for?: string | null;
      main_tradeoff?: string | null;
      summary?: string | null;
    };
    decision_evidence?: {
      best_for_reason?: {
        text?: string | null;
        source_url?: string | null;
        source_type?: SourceType | null;
        claim_type?: ClaimType | null;
      };
      not_for_reason?: {
        text?: string | null;
        source_url?: string | null;
        source_type?: SourceType | null;
        claim_type?: ClaimType | null;
      };
      tradeoff_reason?: {
        text?: string | null;
        source_url?: string | null;
        source_type?: SourceType | null;
        claim_type?: ClaimType | null;
      };
    };
    budgetAnalyst?: {
      costDrivers: string[];
      oneTimeFees: string[];
      commitmentTerms?: string | null;
      roiThreshold?: string | null;
    };
    userAdvocate?: {
      vibe?: string | null;
      originStory?: string | null;
      idealFor: string[];
      avoidIf: string[];
      powerTip?: string | null;
      delighters: string[];
      frustrations: string[];
    };
  };
  vetoLogic?: Array<{
    text?: string;
    condition?: string;
    alternative?: string;
    reason?: string;
    source_url?: string;
    source_type?: SourceType;
    claim_type?: ClaimType;
    retrieved_at?: string;
  }>;
  realityChecks?: Array<{
    text: string;
    source_url?: string;
    source_type?: SourceType;
    claim_type?: ClaimType;
    retrieved_at?: string;
  }>;
  // V4: Smart Schema - Category-specific extracted data
  categorySpecificData?: Record<string, unknown>;
  // V4: Tool Hints - VIP tool-specific extracted data
  specifics?: Record<string, unknown>;
  canonicalFacts?: {
    latest_models_comparison?: string[];
    model_inventory_raw?: string[];
    quick_checks?: string[];
    team_it_checks?: string[];
    setup_tracks?: {
      dev?: Array<{ step: number; action: string; command?: string; description?: string }>;
      non_dev?: Array<{ step: number; action: string; command?: string; description?: string }>;
    };
    quality?: {
      conflicts_count?: number;
    };
  };
}

// ============================================================================
// SERPER API TYPES
// ============================================================================

export interface SerperResponse {
  organic: Array<{
    title: string;
    link: string;
    snippet: string;
    position: number;
    date?: string;
    dateString?: string;
    timeSince?: string;
  }>;
  peopleAlsoAsk?: Array<{
    question: string;
    snippet?: string;
    link?: string;
  }>;
  searchParameters: { q: string };
}

// ============================================================================
// PHASE INPUT/OUTPUT TYPES (for 3-phase pipeline)
// ============================================================================

/**
 * Hunter Context - flows through all phases
 * Enables early exits and accumulates data from each phase
 */
export interface HunterContext {
  // Input
  toolName: string;
  entityScope?: HunterEntityScope;
  contextTitle?: string;
  categorySlug?: string;
  website?: string;
  specialInstructions?: string;
  queueItemId?: string;
  forceUpdate?: boolean; // Bypass duplicate detection
  huntType?: HuntType;
  researchDossier?: {
    // V5: Pre-generated queries from Classifier (moves intelligence from Hunter to Classifier)
    normalized_tool_name: string;
    primary_category: string;
    scout_queries: string[];
    forensic_targets: string[];
    confidence: 'high' | 'medium' | 'low';
    red_flags?: string[];
  };
  classification?: {
    category?: string;
    confidence?: 'high' | 'medium' | 'low';
  };

  // Flags for early exits (cost optimization)
  skipAnalysis?: boolean; // Set if duplicate found
  skipPersistence?: boolean; // Set if validation fails
  insufficientSources?: boolean; // Set if not enough snippets for quality review

  // Accumulated data
  research?: ResearchOutput;
  analysis?: AnalysisOutput;

  // Two-stage pipeline fields (batch synthesis optimization)
  detectedCategory?: string; // Category detected during research (for batch grouping)
  skipSynthesis?: boolean; // If true, stop after research phase (batch mode)
  batchId?: string; // UUID linking items in same synthesis batch

  // Metadata
  startTime: number;
  tokensUsed: number;
  logs: string[];
}

export type SourceIntent =
  | 'pricing'
  | 'security'
  | 'portability'
  | 'integrations'
  | 'limits'
  | 'reviews'
  | 'alternatives';

export type HunterEntityScope =
  | 'core'
  | 'copilot'
  | 'actions'
  | 'enterprise_cloud'
  | 'enterprise_server';

export type ScoutSourceType =
  | 'official'
  | 'docs'
  | 'support'
  | 'legal'
  | 'editorial'
  | 'community'
  | 'directory';

export type RawSource = {
  url: string;
  title: string;
  snippet: string;
  domain: string;
  published_at?: string;
  retrieved_at: string;
  canonical_url: string;
  source_type: ScoutSourceType;
  intent_tags: SourceIntent[];
  policy: {
    acquisition_mode: 'LINK_ONLY' | 'API_ONLY' | 'SCRAPE_ALLOWED' | 'BLOCKED';
    llm_ingestion_allowed: 'NO' | 'YES_LIMITED' | 'YES';
    display_mode: 'LINK_ONLY' | 'ATTRIBUTED_EXCERPT' | 'NO_DISPLAY';
    reason?: string;
    policy_version?: string;
  };
};

export type CuratedSources = Record<
  SourceIntent,
  Array<{
    url: string;
    canonical_url: string;
    domain: string;
    score: number;
    authority: 'A' | 'B' | 'C';
    deep_scrape_allowed: boolean;
    notes?: string;
  }>
>;

export type Fact = {
  key: string;
  value: unknown;
  confidence: 'high' | 'med' | 'low';
  evidence: Array<{ url: string; domain: string }>;
};

export type ScoutFacts = {
  identity?: { official_name?: string; website_url?: string };
  pricing?: {
    pricing_type?: 'freemium' | 'paid' | 'free';
    paid_pricing_metric?: 'per_seat' | 'usage' | 'flat';
    pricing_page_url?: string;
  };
  security?: { soc2?: { claimed: boolean }; gdpr?: { claimed: boolean } };
  portability?: { export_formats?: string[]; api_export?: boolean };
  integrations?: { has_api?: boolean; has_webhooks?: boolean; notable?: string[] };
  facts_ledger: Fact[];
};

export type ScrapePlan = Record<
  SourceIntent,
  {
    candidates: string[];
    selected: string[];
    blocked: Array<{ url: string; reason: string }>;
  }
>;

export type ScoutQuality = {
  conflicts: Array<{ key: string; values: unknown[]; sources: string[] }>;
  missing: string[];
  freshness: Record<SourceIntent, 'fresh' | 'stale' | 'unknown'>;
  needs_review: boolean;
  notes?: string[];
};

/**
 * Phase 1 (Research) Output
 */
export interface ResearchOutput {
  scoutResult: {
    raw_sources: RawSource[];
    curated_sources: CuratedSources;
    facts: ScoutFacts;
    scrape_plan: ScrapePlan;
    quality: ScoutQuality;
    faqs?: Array<{
      question: string;
      answer: string;
      source: 'paa' | 'forum' | 'reddit';
      source_url?: string;
    }>;
  };
  knowledgeCard: KnowledgeCard;
  tokensUsed: number;
  isDuplicate?: boolean; // Gatekeeper: hard duplicate detected
  existingToolId?: string; // If duplicate, reference to existing
  defunctStatus?: {
    // Defunct tool detection
    isDefunct: boolean;
    confidence: 'high' | 'medium' | 'low';
    shutdownDate?: string;
    reason?: string;
    evidence?: string;
  };
  validationReport?: {
    // Data quality validation results
    isValid: boolean;
    score: number; // 0-100 quality score
    shouldPublish: boolean; // Gate low-quality content
    humanReviewRequired: boolean;
  };
  video?: {
    // Best video found for the tool
    videoId: string;
    title: string;
    channel: string;
  };
}

/**
 * Phase 2 (Analysis) Output
 */
export interface AnalysisOutput {
  analysis: HunterAnalysis;
  embedding: number[];
  logo: { path: string; url: string } | null;
  tokensUsed: number;
  generationQuality?: SynthesisGenerationQuality;
}

/**
 * Phase 3 (Persistence) Output
 */
export interface PersistenceOutput {
  toolId: string;
  contextId: string | null;
  reviewId: string | null;
  wasReused: boolean; // True if existing tool/context reused
}

/**
 * Dependencies injected into phases
 */
export interface HunterDependencies {
  supabase: any; // SupabaseClient<Database> but avoiding circular deps
  serper: any; // SerperService
  gemini: any; // GeminiService
  inventory: any; // ModelInventoryService
  logo: any; // LogoService
  config: HunterConfig;
  withRetry: <T>(fn: () => Promise<T>, operation: string, maxRetries?: number) => Promise<T>;
  log: (message: string) => void;
}

// ============================================================================
// CONTEXT DISCOVERY TYPES
// ============================================================================

export interface ContextToolAnalysis {
  name: string;
  score: number;
  pros: string[];
  cons: string[];
  summary: string;
  pricingType: string;
  websiteUrl?: string;
  shortDescription?: string;
}

export interface ContextMeta {
  titleNoun: string;
  titleModifier?: string;
  introText: string;
  metaDescription?: string;
}

// ============================================================================
// ZOD VALIDATION SCHEMAS
// ============================================================================

// Source type enum for validation
export const SourceTypeSchema = z.enum(['official', 'editorial', 'community']);

// Claim type enum for validation
export const ClaimTypeSchema = z.enum(['fact', 'opinion']);
export const ClaimKindSchema = z.enum([
  'verbatim_feature',
  'derived_metric',
  'comparison',
  'inference',
]);
export const ClaimVolatilitySchema = z.enum(['high', 'medium', 'low']);
export const ClaimVerificationMethodSchema = z.enum([
  'source_presence',
  'cross_source',
  'manual_review',
]);

// Schema for pro/con with REQUIRED source attribution (new format)
export const ClaimWithSourceSchema = z.object({
  text: z.string().min(10).max(300),
  source_url: z.string().url(),
  source_type: SourceTypeSchema,
  claim_type: ClaimTypeSchema,
  retrieved_at: z.string().datetime().optional(), // Optional in schema since it's added during persistence
  checked_at: z.string().datetime().optional(),
  source_urls: z.array(z.string().url()).optional(),
  verification_method: ClaimVerificationMethodSchema.optional(),
  scope: z.string().min(2).max(120).optional(),
  volatility: ClaimVolatilitySchema.optional(),
  recheck_by: z.string().datetime().optional(),
  claim_kind: ClaimKindSchema.optional(),
  vendor_phrase: z.string().min(3).max(300).optional(),
  comparison_basis_source_url: z.string().url().optional(),
  claim_confidence_score: z.number().min(0).max(1).optional(),
  claim_confidence_tier: z.enum(['high', 'medium', 'low']).optional(),
});

// Legacy schema (plain string) - for backwards compatibility
export const LegacyClaimSchema = z.string().min(10).max(300);

// Support both legacy string[] and new object[] format during transition
// New hunts should produce ClaimWithSource objects
export const ClaimArraySchema = z
  .array(z.union([LegacyClaimSchema, ClaimWithSourceSchema]))
  .min(1)
  .max(5);
export const OptionalClaimArraySchema = z
  .array(z.union([LegacyClaimSchema, ClaimWithSourceSchema]))
  .max(5);

export const AnalysisSchema = z.object({
  score: z.number().min(0).max(100),
  pros: ClaimArraySchema,
  cons: ClaimArraySchema,
  userReportedPros: OptionalClaimArraySchema.optional(),
  userReportedCons: OptionalClaimArraySchema.optional(),
  faqs: z
    .array(
      z.object({
        question: z.string().min(5).max(140),
        answer: z.string().min(10).max(600),
        question_source: z.enum(['paa', 'forum', 'reddit']),
        question_source_url: z.string().url().optional(),
        answer_source_url: z.string().url(),
        answer_source_type: z.enum(['official', 'editorial', 'community']).optional(),
      })
    )
    .max(5)
    .optional(),
  summary: z.string().min(50),
  sentimentTags: z.array(z.string()).min(1).max(5),
  pricingType: z.enum(['free', 'freemium', 'paid', 'enterprise', 'open_source']),
  websiteUrl: z.string().url().optional(),
  shortDescription: z.string().max(200).optional(),
  verdict: z.string().max(200).optional(), // One-line conclusion
  // V6: Cynical CTO - Veto Logic and Reality Checks (REQUIRED for forensic analysis)
  vetoLogic: z
    .array(
      z.object({
        condition: z.string(),
        alternative: z.string(),
        reason: z.string(),
        source_url: z.string().url(),
      })
    )
    .min(1)
    .max(3),
  realityChecks: z
    .array(
      z.object({
        claim: z.string(),
        reality: z.string(),
        impact: z.string(),
        source_url: z.string().url(),
      })
    )
    .min(1)
    .max(3),
  graphTags: z.object({
    functions: z.array(z.string()).min(1).max(5),
    audiences: z.array(z.string()).min(1).max(5),
    platforms: z.array(z.string()).min(1).max(10),
  }),
  titleParts: z
    .object({
      noun: z.string(),
      modifier: z.string().nullable().optional(),
    })
    .optional(),
  // Context-specific review fields (Migration 022)
  fitScore: z.number().min(0).max(100).optional(),
  valueRating: z.number().min(1).max(5).optional(),
  standoutFeatures: z.array(z.string()).max(5).optional(),
  dealbreakers: z.array(z.string()).max(5).optional(),
  switchingFrom: z.array(z.string()).max(5).optional(),
  // V3.1: Review Context (The "Human Touch" Layer) - extracted from tribal knowledge
  reviewContext: z
    .object({
      humanVerdict: z.string().nullable().optional(),
      decisionIntro: z
        .object({
          what_it_is: z.string().nullable().optional(),
          best_for: z.string().nullable().optional(),
          not_for: z.string().nullable().optional(),
          main_tradeoff: z.string().nullable().optional(),
          summary: z.string().nullable().optional(),
        })
        .optional(),
      decisionEvidence: z
        .object({
          best_for_reason: z
            .object({
              text: z.string().nullable().optional(),
              source_url: z.string().url().nullable().optional(),
              source_type: z.enum(['official', 'editorial', 'community']).nullable().optional(),
              claim_type: z.enum(['fact', 'opinion']).nullable().optional(),
            })
            .optional(),
          not_for_reason: z
            .object({
              text: z.string().nullable().optional(),
              source_url: z.string().url().nullable().optional(),
              source_type: z.enum(['official', 'editorial', 'community']).nullable().optional(),
              claim_type: z.enum(['fact', 'opinion']).nullable().optional(),
            })
            .optional(),
          tradeoff_reason: z
            .object({
              text: z.string().nullable().optional(),
              source_url: z.string().url().nullable().optional(),
              source_type: z.enum(['official', 'editorial', 'community']).nullable().optional(),
              claim_type: z.enum(['fact', 'opinion']).nullable().optional(),
            })
            .optional(),
        })
        .optional(),
      decision_intro: z
        .object({
          what_it_is: z.string().nullable().optional(),
          best_for: z.string().nullable().optional(),
          not_for: z.string().nullable().optional(),
          main_tradeoff: z.string().nullable().optional(),
          summary: z.string().nullable().optional(),
        })
        .optional(),
      decision_evidence: z
        .object({
          best_for_reason: z
            .object({
              text: z.string().nullable().optional(),
              source_url: z.string().url().nullable().optional(),
              source_type: z.enum(['official', 'editorial', 'community']).nullable().optional(),
              claim_type: z.enum(['fact', 'opinion']).nullable().optional(),
            })
            .optional(),
          not_for_reason: z
            .object({
              text: z.string().nullable().optional(),
              source_url: z.string().url().nullable().optional(),
              source_type: z.enum(['official', 'editorial', 'community']).nullable().optional(),
              claim_type: z.enum(['fact', 'opinion']).nullable().optional(),
            })
            .optional(),
          tradeoff_reason: z
            .object({
              text: z.string().nullable().optional(),
              source_url: z.string().url().nullable().optional(),
              source_type: z.enum(['official', 'editorial', 'community']).nullable().optional(),
              claim_type: z.enum(['fact', 'opinion']).nullable().optional(),
            })
            .optional(),
        })
        .optional(),
      budgetAnalyst: z
        .object({
          costDrivers: z.array(z.string()).default([]),
          oneTimeFees: z.array(z.string()).default([]),
          commitmentTerms: z.string().nullable().optional(),
          roiThreshold: z.string().nullable().optional(),
        })
        .optional(),
      userAdvocate: z
        .object({
          vibe: z.string().nullable().optional(),
          originStory: z.string().nullable().optional(),
          idealFor: z.array(z.string()).default([]),
          avoidIf: z.array(z.string()).default([]),
          powerTip: z.string().nullable().optional(),
          delighters: z.array(z.string()).default([]),
          frustrations: z.array(z.string()).default([]),
        })
        .optional(),
    })
    .optional(),
  // V4: Smart Schema - Category-specific extracted data
  categorySpecificData: z.record(z.string(), z.unknown()).optional(),
  // V4: Tool Hints - VIP tool-specific extracted data
  specifics: z.record(z.string(), z.unknown()).optional(),
});

// ============================================================================
// ROBUSTNESS: Additional validation schemas for service outputs
// ============================================================================

// Schema for tool discovery output from scout service
export const DiscoveredToolSchema = z.object({
  name: z.string().min(1),
  domain: z.string().min(3),
  confidence: z.enum(['high', 'medium', 'low']),
});

// Schema for context matching output
export const ContextMatchSchema = z.object({
  context_id: z.string().uuid(),
  context_title: z.string().min(1),
  relevance_score: z.number().min(0).max(100),
  reasoning: z.string().min(10),
});

// Schema for defunct tool detection
export const DefunctStatusSchema = z.object({
  isDefunct: z.boolean(),
  confidence: z.enum(['high', 'medium', 'low']),
  shutdownDate: z.string().nullable().optional(),
  reason: z.string().nullable().optional(),
  evidence: z.string().nullable().optional(),
});

// Schema for keyword intent parsing
export const KeywordIntentSchema = z.object({
  type: z.enum(['CONTEXT', 'TOOL_REVIEW', 'COMPARISON', 'ALTERNATIVES', 'MULTI_COMPARISON']),
  tools: z.array(z.string()),
  context: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  actionPlan: z
    .array(
      z.object({
        type: z.string(),
        params: z.record(z.any()),
      })
    )
    .min(1),
});
