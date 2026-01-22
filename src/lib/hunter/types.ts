/**
 * Hunter Type Definitions
 *
 * All interfaces, types, and Zod schemas used by the Hunter system.
 *
 * @module hunter/types
 */

import { z } from 'zod';
import type { KnowledgeCard } from '../knowledge-card';
import type { PricingModel } from '@/types/database';

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

  // Flags for early exits (cost optimization)
  skipAnalysis?: boolean;       // Set if duplicate found
  skipPersistence?: boolean;    // Set if validation fails

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
  graphTags: z.object({
    functions: z.array(z.string()).min(1).max(5),
    audiences: z.array(z.string()).min(1).max(5),
    platforms: z.array(z.string()).min(1).max(10),
  }),
  titleParts: z.object({
    noun: z.string(),
    modifier: z.string().nullable().optional(),
  }).optional(),
});
