/**
 * StackHunt Database Types
 * Auto-generated from Supabase schema - keep in sync with migrations
 */

// ============================================================================
// ENUMS
// ============================================================================

export type PricingModel = 'free' | 'freemium' | 'paid' | 'enterprise' | 'open_source';

export type HuntStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type CategoryType = 'function' | 'audience' | 'platform';

export type TitleTemplate = 'best' | 'top_10' | 'alternatives' | 'vs' | 'free' | 'open_source';

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

export interface ToolCategoryLink {
  id: string;
  tool_id: string;
  category_id: string;
  relevance_score: number;
  created_at: string;
}

export interface Tool {
  id: string;
  name: string;
  slug: string;
  website: string | null;
  logo_path: string | null;
  logo_url: string | null;
  short_description: string | null;
  long_description: string | null;
  category_id: string | null;
  pricing_type: PricingModel;
  avg_score: number;
  review_count: number;
  embedding: number[] | null; // vector(1536)
  metadata: Record<string, unknown> | null; // Knowledge Card JSONB
  is_featured: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

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
  primary_tool_id: string | null;
  tool_count: number;
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
  tool_id: string;
  context_id: string;
  score: number | null;
  summary_markdown: string | null;
  pros: string[];
  cons: string[];
  sentiment_tags: string[];
  upvotes: number;
  downvotes: number;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface AffiliateOffer {
  id: string;
  tool_id: string;
  url: string;
  cta_text: string;
  is_affiliate: boolean;
  network: string | null;
  commission_note: string | null;
  is_primary: boolean;
  display_order: number;
  expires_at: string | null;
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

export interface HuntLog {
  id: string;
  tool_name: string;
  context_title: string | null;
  status: HuntStatus;
  tool_id: string | null;
  context_id: string | null;
  review_id: string | null;
  error_message: string | null;
  raw_serper_response: Record<string, unknown> | null;
  raw_openai_response: Record<string, unknown> | null;
  duration_ms: number | null;
  tokens_used: number | null;
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

export interface ToolInsert {
  name: string;
  slug: string;
  website?: string | null;
  logo_path?: string | null;
  logo_url?: string | null;
  short_description?: string | null;
  long_description?: string | null;
  category_id?: string | null;
  pricing_type?: PricingModel;
  embedding?: number[] | null;
  metadata?: Record<string, unknown> | null;
  is_featured?: boolean;
  is_verified?: boolean;
}

export interface ContextInsert {
  title: string;
  slug: string;
  intro_text?: string | null;
  meta_description?: string | null;
  category_id?: string | null;
  primary_tool_id?: string | null;
  is_featured?: boolean;
}

export interface ReviewInsert {
  tool_id: string;
  context_id: string;
  score?: number | null;
  summary_markdown?: string | null;
  pros?: string[];
  cons?: string[];
  sentiment_tags?: string[];
  display_order?: number;
}

export interface AffiliateOfferInsert {
  tool_id: string;
  url: string;
  cta_text?: string;
  is_affiliate?: boolean;
  network?: string | null;
  commission_note?: string | null;
  is_primary?: boolean;
  display_order?: number;
  expires_at?: string | null;
}

export interface HuntLogInsert {
  tool_name: string;
  context_title?: string | null;
  status?: HuntStatus;
}

// ============================================================================
// UPDATE TYPES (For partial updates)
// ============================================================================

export type CategoryUpdate = Partial<Omit<Category, 'id' | 'created_at' | 'updated_at'>>;
export type ToolUpdate = Partial<Omit<Tool, 'id' | 'created_at' | 'updated_at'>>;
export type ContextUpdate = Partial<Omit<Context, 'id' | 'created_at' | 'updated_at'>>;
export type ReviewUpdate = Partial<Omit<Review, 'id' | 'created_at' | 'updated_at'>>;
export type AffiliateOfferUpdate = Partial<Omit<AffiliateOffer, 'id' | 'created_at' | 'updated_at'>>;
export type HuntLogUpdate = Partial<Omit<HuntLog, 'id' | 'created_at'>>;

// ============================================================================
// JOINED/ENRICHED TYPES (For queries with relations)
// ============================================================================

export interface ToolWithCategory extends Tool {
  category: Category | null;
}

export interface CategoryTag {
  id: string;
  name: string;
  type: CategoryType;
  slug: string;
}

export interface ToolWithTags extends Tool {
  function_tags: CategoryTag[];
  audience_tags: CategoryTag[];
  platform_tags: CategoryTag[];
}

export interface ToolWithDetails extends Tool {
  category: Category | null;
  affiliate_offers: AffiliateOffer[];
  reviews: ReviewWithContext[];
  function_tags?: CategoryTag[];
  audience_tags?: CategoryTag[];
  platform_tags?: CategoryTag[];
}

export interface ReviewWithTool extends Review {
  tool: Tool;
}

export interface ReviewWithContext extends Review {
  context: Context;
}

export interface ReviewFull extends Review {
  tool: Tool;
  context: Context;
}

export interface ContextWithReviews extends Context {
  category: Category | null;
  primary_tool: Tool | null;
  reviews: ReviewWithTool[];
  // Knowledge Graph relations
  function_category?: Category | null;
  audience_category?: Category | null;
  platform_category?: Category | null;
}

export interface ContextListItem extends Context {
  category: Category | null;
  top_tools: Pick<Tool, 'id' | 'name' | 'slug' | 'logo_url'>[];
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
  contextSlug?: string;  // Auto-generated if not provided
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

export interface Database {
  public: {
    Tables: {
      categories: {
        Row: Category;
        Insert: CategoryInsert;
        Update: CategoryUpdate;
      };
      tools: {
        Row: Tool;
        Insert: ToolInsert;
        Update: ToolUpdate;
      };
      contexts: {
        Row: Context;
        Insert: ContextInsert;
        Update: ContextUpdate;
      };
      reviews: {
        Row: Review;
        Insert: ReviewInsert;
        Update: ReviewUpdate;
      };
      affiliate_offers: {
        Row: AffiliateOffer;
        Insert: AffiliateOfferInsert;
        Update: AffiliateOfferUpdate;
      };
      votes: {
        Row: Vote;
        Insert: never; // Use RPC only
        Update: never;
      };
      hunt_logs: {
        Row: HuntLog;
        Insert: HuntLogInsert;
        Update: HuntLogUpdate;
      };
    };
    Functions: {
      cast_vote: {
        Args: {
          p_review_id: string;
          p_vote_type: number;
          p_ip_hash: string;
          p_fingerprint_hash?: string;
          p_turnstile_token?: string;
        };
        Returns: VoteResult;
      };
      match_tools: {
        Args: {
          query_embedding: number[];
          match_threshold?: number;
          match_count?: number;
        };
        Returns: SearchResult[];
      };
      update_tool_metrics: {
        Args: { p_tool_id: string };
        Returns: void;
      };
      update_context_metrics: {
        Args: { p_context_id: string };
        Returns: void;
      };
      check_rate_limit: {
        Args: {
          p_identifier: string;
          p_endpoint: string;
          p_max_requests?: number;
          p_window_seconds?: number;
        };
        Returns: {
          allowed: boolean;
          remaining: number;
          current: number;
          limit: number;
          reset_at: string;
        };
      };
      validate_admin_session: {
        Args: { p_token_hash: string };
        Returns: {
          valid: boolean;
          session_id?: string;
          created_at?: string;
          expires_at?: string;
        };
      };
      create_admin_session: {
        Args: {
          p_token_hash: string;
          p_ip_address?: string;
          p_user_agent?: string;
          p_expires_in_days?: number;
        };
        Returns: string;
      };
      revoke_admin_session: {
        Args: { p_token_hash: string };
        Returns: boolean;
      };
    };
    Enums: {
      pricing_model: PricingModel;
      hunt_status: HuntStatus;
    };
  };
}
