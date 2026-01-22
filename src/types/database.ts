/**
 * StackHunt Database Types
 * Auto-generated from Supabase schema - keep in sync with migrations
 */

// ============================================================================
// ENUMS
// ============================================================================

export type PricingModel = 'free' | 'freemium' | 'paid' | 'enterprise' | 'open_source';

export type HuntStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type HuntQueueStatus = 'pending' | 'claimed' | 'processing' | 'completed' | 'failed';

export type HuntType = 'full' | 'refresh' | 'price_only';

export type HuntSource = 'admin' | 'api' | 'suggestion' | 'competitor_scan' | 'user_request' | 'scheduled';

export type MarketSourceType = 'api' | 'scrape' | 'manual';

export type CategoryType = 'function' | 'audience' | 'platform';

export type TitleTemplate = 'best' | 'top_10' | 'alternatives' | 'vs' | 'free' | 'open_source';

export type ContentIdeaStatus = 'pending' | 'analyzed' | 'approved' | 'rejected' | 'queued';

export type ImportBatchStatus = 'processing' | 'completed' | 'completed_with_errors' | 'failed';

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
  tool_id: string;
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
  tool_id: string;
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
  tool_id: string;
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
  tool_id: string | null;
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
  priority?: number;
  is_active?: boolean;
  tracking_params?: Record<string, unknown> | null;
  expires_at?: string | null;
  network_tier?: 1 | 2 | 3;
  network_program_id?: string | null;
  verification_status?: 'healthy' | 'broken' | 'expired' | 'pending' | 'unknown';
}

export interface MarketStateInsert {
  tool_id: string;
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
  tool_id: string;
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

// ============================================================================
// UPDATE TYPES (For partial updates)
// ============================================================================

export type CategoryUpdate = Partial<Omit<Category, 'id' | 'created_at' | 'updated_at'>>;
export type ToolUpdate = Partial<Omit<Tool, 'id' | 'created_at' | 'updated_at'>>;
export type ContextUpdate = Partial<Omit<Context, 'id' | 'created_at' | 'updated_at'>>;
export type ReviewUpdate = Partial<Omit<Review, 'id' | 'created_at' | 'updated_at'>>;
export type AffiliateOfferUpdate = Partial<Omit<AffiliateOffer, 'id' | 'created_at' | 'updated_at'>>;
export type MarketStateUpdate = Partial<Omit<MarketState, 'id' | 'tool_id' | 'created_at' | 'updated_at'>>;
export type HuntQueueUpdate = Partial<Omit<HuntQueue, 'id' | 'created_at' | 'updated_at'>>;
export type ContentIdeaUpdate = Partial<Omit<ContentIdea, 'id' | 'created_at' | 'updated_at'>>;
export type ImportBatchUpdate = Partial<Omit<ImportBatch, 'id' | 'created_at'>>;

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
      // Strategic architecture tables
      market_state: {
        Row: MarketState;
        Insert: MarketStateInsert;
        Update: MarketStateUpdate;
      };
      price_history: {
        Row: PriceHistory;
        Insert: never; // Auto-populated by trigger
        Update: never;
      };
      click_events: {
        Row: ClickEvent;
        Insert: ClickEventInsert;
        Update: never;
      };
      hunt_queue: {
        Row: HuntQueue;
        Insert: HuntQueueInsert;
        Update: HuntQueueUpdate;
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
      // New strategic architecture functions
      get_priority_affiliate: {
        Args: { p_tool_id: string };
        Returns: {
          offer_id: string;
          url: string;
          cta_text: string;
          network: string | null;
          is_affiliate: boolean;
        } | null;
      };
      log_click: {
        Args: {
          p_offer_id: string;
          p_tool_id: string;
          p_referrer?: string | null;
          p_user_agent?: string | null;
          p_ip_hash?: string | null;
          p_country_code?: string | null;
          p_source_page?: string | null;
          p_source_context_id?: string | null;
        };
        Returns: string; // click_id
      };
      claim_hunt_queue_item: {
        Args: { p_worker_id: string };
        Returns: HuntQueue | null;
      };
      start_hunt: {
        Args: { p_queue_id: string };
        Returns: void;
      };
      heartbeat_hunt: {
        Args: { p_queue_id: string };
        Returns: void;
      };
      complete_hunt: {
        Args: {
          p_queue_id: string;
          p_tool_id: string;
          p_context_id?: string | null;
          p_review_id?: string | null;
          p_tokens_used?: number | null;
        };
        Returns: void;
      };
      fail_hunt: {
        Args: {
          p_queue_id: string;
          p_error: string;
          p_error_details?: Record<string, unknown> | null;
        };
        Returns: void;
      };
      release_stale_hunt_claims: {
        Args: { p_stale_minutes?: number };
        Returns: number; // count of released items
      };
    };
    Enums: {
      pricing_model: PricingModel;
      hunt_status: HuntStatus;
      hunt_queue_status: HuntQueueStatus;
      market_source_type: MarketSourceType;
    };
  };
}
