/**
 * Hunter Type Definitions
 *
 * All interfaces, types, and Zod schemas used by the Hunter system.
 *
 * @module hunter/types
 */

import { z } from 'zod';
import type { KnowledgeCard } from '../knowledge-card';
import type { PricingModel, HuntType } from '@/types/database';

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface HunterConfig {
  supabaseUrl: string;
  supabaseServiceKey: string;
  geminiApiKey: string;
  serperApiKey: string;
  isDraftMode?: boolean; // If true, reviews are created as 'draft'
}

// ============================================================================
// INPUT TYPES
// ============================================================================

export interface HunterInput {
  toolName: string;
  contextTitle?: string;
  categorySlug?: string;
  queueItemId?: string; // If processing from queue
  forceUpdate?: boolean; // Bypass duplicate detection and re-extract data
  huntType?: HuntType; // 'full' | 'refresh' | 'price_only'
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

// ============================================================================
// RESULT TYPES
// ============================================================================

export interface HunterResult {
  success: boolean;
  toolId?: string;
  toolName?: string;
  contextId?: string;
  contextTitle?: string;
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

// ============================================================================
// SOURCE ATTRIBUTION TYPES (Legal Protection)
// ============================================================================

/**
 * Source type classification for legal protection
 * - official: From the tool's own website (highest confidence, factual)
 * - editorial: From established review sites like G2, Capterra, Gartner (high confidence)
 * - community: From Reddit, forums, HackerNews (opinion, requires hedging)
 */
export type SourceType = 'official' | 'editorial' | 'community';

/**
 * Claim type classification
 * - fact: Objectively verifiable (pricing, features, platform support)
 * - opinion: Subjective assessment (user sentiment, experience reports)
 */
export type ClaimType = 'fact' | 'opinion';

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
  claim_type: ClaimType;
  retrieved_at: string; // ISO 8601 timestamp - provides "staleness" defense
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
  summary: string;
  sentimentTags: string[];
  pricingType: PricingModel;
  websiteUrl?: string;
  shortDescription?: string;
  verdict?: string; // One-line conclusion
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
  // Context-specific review fields (Migration 022)
  fitScore?: number;              // 0-100: How well tool fits THIS context
  valueRating?: number;           // 1-5: Value for money for this audience
  standoutFeatures?: string[];    // Features especially relevant to this context
  dealbreakers?: string[];        // Concerns that might be dealbreakers
  switchingFrom?: string[];       // Common tools this audience switches FROM
  // V3.1: Review Context (The "Human Touch" Layer)
  reviewContext?: {
    humanVerdict?: string | null;
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
  // V4: Smart Schema - Category-specific extracted data
  categorySpecificData?: Record<string, unknown>;
  // V4: Tool Hints - VIP tool-specific extracted data
  specifics?: Record<string, unknown>;
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
  contextTitle?: string;
  categorySlug?: string;
  queueItemId?: string;
  forceUpdate?: boolean;        // Bypass duplicate detection
  huntType?: HuntType;
  researchDossier?: {           // V5: Pre-generated queries from Classifier (moves intelligence from Hunter to Classifier)
    normalized_tool_name: string;
    primary_category: string;
    scout_queries: string[];
    forensic_targets: string[];
    confidence: 'high' | 'medium' | 'low';
    red_flags?: string[];
  };

  // Flags for early exits (cost optimization)
  skipAnalysis?: boolean;       // Set if duplicate found
  skipPersistence?: boolean;    // Set if validation fails
  insufficientSources?: boolean; // Set if not enough snippets for quality review

  // Accumulated data
  research?: ResearchOutput;
  analysis?: AnalysisOutput;

  // Metadata
  startTime: number;
  tokensUsed: number;
  logs: string[];
}

/**
 * Phase 1 (Research) Output
 */
export interface ResearchOutput {
  scoutResult: {
    reviewsSnippets: string[];
    pricingSnippets: string[];
    alternativesSnippets: string[];
    companySnippets: string[];      // Company info, funding, history
    technicalSnippets: string[];    // API, export, integrations
    // V3.1: Tribal Knowledge Snippets (The "Human Touch")
    budgetAnalystSnippets: string[];    // Hidden costs, billing logic, implementation fees
    tribalKnowledgeSnippets: string[];  // Reddit reviews, honest feedback, power tips, "worth it" discussions
    // V6: Deep tribal content (full discussions, not snippets)
    tribalDeepContent?: string;         // Full Reddit/HN threads for authentic insights
    sources: Array<{
      url: string;
      title: string;
      snippet: string;
      domain: string;
    }>;
  };
  knowledgeCard: KnowledgeCard;
  tokensUsed: number;
  isDuplicate?: boolean;        // Gatekeeper: hard duplicate detected
  existingToolId?: string;      // If duplicate, reference to existing
  defunctStatus?: {             // Defunct tool detection
    isDefunct: boolean;
    confidence: 'high' | 'medium' | 'low';
    shutdownDate?: string;
    reason?: string;
    evidence?: string;
  };
  validationReport?: {          // Data quality validation results
    isValid: boolean;
    score: number;              // 0-100 quality score
    shouldPublish: boolean;     // Gate low-quality content
    humanReviewRequired: boolean;
  };
  video?: {                     // Best video found for the tool
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
}

/**
 * Phase 3 (Persistence) Output
 */
export interface PersistenceOutput {
  toolId: string;
  contextId: string | null;
  reviewId: string | null;
  wasReused: boolean;           // True if existing tool/context reused
}

/**
 * Dependencies injected into phases
 */
export interface HunterDependencies {
  supabase: any; // SupabaseClient<Database> but avoiding circular deps
  serper: any;   // SerperService
  gemini: any;   // GeminiService
  logo: any;     // LogoService
  config: HunterConfig;
  withRetry: <T>(fn: () => Promise<T>, operation: string) => Promise<T>;
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

// Schema for pro/con with REQUIRED source attribution (new format)
export const ClaimWithSourceSchema = z.object({
  text: z.string().min(10).max(300),
  source_url: z.string().url(),
  source_type: SourceTypeSchema,
  claim_type: ClaimTypeSchema,
  retrieved_at: z.string().datetime().optional(), // Optional in schema since it's added during persistence
});

// Legacy schema (plain string) - for backwards compatibility
export const LegacyClaimSchema = z.string().min(10).max(300);

// Support both legacy string[] and new object[] format during transition
// New hunts should produce ClaimWithSource objects
export const ClaimArraySchema = z.array(
  z.union([LegacyClaimSchema, ClaimWithSourceSchema])
).min(1).max(5);

export const AnalysisSchema = z.object({
  score: z.number().min(0).max(100),
  pros: ClaimArraySchema,
  cons: ClaimArraySchema,
  summary: z.string().min(50),
  sentimentTags: z.array(z.string()).min(1).max(5),
  pricingType: z.enum(['free', 'freemium', 'paid', 'enterprise', 'open_source']),
  websiteUrl: z.string().url().optional(),
  shortDescription: z.string().max(200).optional(),
  verdict: z.string().max(200).optional(), // One-line conclusion
  graphTags: z.object({
    functions: z.array(z.string()).min(1).max(5),
    audiences: z.array(z.string()).min(1).max(5),
    platforms: z.array(z.string()).min(1).max(10),
  }),
  titleParts: z.object({
    noun: z.string(),
    modifier: z.string().nullable().optional(),
  }).optional(),
  // Context-specific review fields (Migration 022)
  fitScore: z.number().min(0).max(100).optional(),
  valueRating: z.number().min(1).max(5).optional(),
  standoutFeatures: z.array(z.string()).max(5).optional(),
  dealbreakers: z.array(z.string()).max(5).optional(),
  switchingFrom: z.array(z.string()).max(5).optional(),
  // V3.1: Review Context (The "Human Touch" Layer) - extracted from tribal knowledge
  reviewContext: z.object({
    humanVerdict: z.string().nullable().optional(),
    budgetAnalyst: z.object({
      costDrivers: z.array(z.string()).default([]),
      oneTimeFees: z.array(z.string()).default([]),
      commitmentTerms: z.string().nullable().optional(),
      roiThreshold: z.string().nullable().optional(),
    }).optional(),
    userAdvocate: z.object({
      vibe: z.string().nullable().optional(),
      originStory: z.string().nullable().optional(),
      idealFor: z.array(z.string()).default([]),
      avoidIf: z.array(z.string()).default([]),
      powerTip: z.string().nullable().optional(),
      delighters: z.array(z.string()).default([]),
      frustrations: z.array(z.string()).default([]),
    }).optional(),
  }).optional(),
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
  shutdownDate: z.string().optional(),
  reason: z.string().optional(),
  evidence: z.string().optional(),
});

// Schema for keyword intent parsing
export const KeywordIntentSchema = z.object({
  type: z.enum(['CONTEXT', 'TOOL_REVIEW', 'COMPARISON', 'ALTERNATIVES', 'MULTI_COMPARISON']),
  tools: z.array(z.string()),
  context: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  actionPlan: z.array(z.object({
    type: z.string(),
    params: z.record(z.any()),
  })).min(1),
});
