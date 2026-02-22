# Data Model Fields (from src/types/database.ts)

## categories
Fields (10):
- `id`: string
- `name`: string
- `slug`: string
- `description`: string | null
- `icon`: string | null
- `type`: CategoryType
- `display_order`: number
- `is_featured`: boolean
- `created_at`: string
- `updated_at`: string

## items
Fields (38):
- `id`: string
- `name`: string
- `slug`: string
- `website`: string | null
- `logo_path`: string | null
- `logo_url`: string | null
- `short_description`: string | null
- `long_description`: string | null
- `category_id`: string | null
- `pricing_type`: PricingModel
- `avg_score`: number
- `review_count`: number
- `embedding`: number[] | null
- `metadata`: ItemMetadata | null
- `is_featured`: boolean
- `is_verified`: boolean
- `type`: ItemType
- `video_id`: string | null
- `video_title`: string | null
- `verdict`: string | null
- `base_score`: number | null
- `last_major_update`: string | null
- `specs`: ItemSpecs
- `base_score_breakdown`: BaseScoreBreakdown
- `data_confidence`: number | null
- `learning_curve`: LearningCurve | null
- `pricing_verified_at`: string | null
- `pricing_confidence`: PricingConfidence | null
- `review_context`: ReviewContext | null
- `parent_id`: string | null
- `effective_starting_price_monthly`: number | null
- `effective_starting_price_annual`: number | null
- `pricing_comparison_tier`: 'individual' | 'team' | 'business' | 'enterprise' | null
- `pricing_comparison_plan_id`: string | null
- `normalized_price_per_seat_monthly`: number | null
- `normalized_price_per_seat_annual`: number | null
- `created_at`: string
- `updated_at`: string

## tools
Fields (38):
- `id`: string
- `name`: string
- `slug`: string
- `website`: string | null
- `logo_path`: string | null
- `logo_url`: string | null
- `short_description`: string | null
- `long_description`: string | null
- `category_id`: string | null
- `pricing_type`: PricingModel
- `avg_score`: number
- `review_count`: number
- `embedding`: number[] | null
- `metadata`: ItemMetadata | null
- `is_featured`: boolean
- `is_verified`: boolean
- `type`: ItemType
- `video_id`: string | null
- `video_title`: string | null
- `verdict`: string | null
- `base_score`: number | null
- `last_major_update`: string | null
- `specs`: ItemSpecs
- `base_score_breakdown`: BaseScoreBreakdown
- `data_confidence`: number | null
- `learning_curve`: LearningCurve | null
- `pricing_verified_at`: string | null
- `pricing_confidence`: PricingConfidence | null
- `review_context`: ReviewContext | null
- `parent_id`: string | null
- `effective_starting_price_monthly`: number | null
- `effective_starting_price_annual`: number | null
- `pricing_comparison_tier`: 'individual' | 'team' | 'business' | 'enterprise' | null
- `pricing_comparison_plan_id`: string | null
- `normalized_price_per_seat_monthly`: number | null
- `normalized_price_per_seat_annual`: number | null
- `created_at`: string
- `updated_at`: string

## item_category_links
Fields (5):
- `id`: string
- `item_id`: string
- `category_id`: string
- `relevance_score`: number
- `created_at`: string

## contexts
Fields (17):
- `id`: string
- `title`: string
- `slug`: string
- `intro_text`: string | null
- `meta_description`: string | null
- `category_id`: string | null
- `primary_item_id`: string | null
- `tool_count`: number
- `is_featured`: boolean
- `title_template`: TitleTemplate
- `title_noun`: string | null
- `title_modifier`: string | null
- `function_category_id`: string | null
- `audience_category_id`: string | null
- `platform_category_id`: string | null
- `created_at`: string
- `updated_at`: string

## reviews
Fields (18):
- `id`: string
- `item_id`: string
- `context_id`: string
- `score`: number | null
- `summary_markdown`: string | null
- `pros`: string[]
- `cons`: string[]
- `sentiment_tags`: string[]
- `upvotes`: number (legacy compatibility field; thumbs feedback now uses structured signals)
- `downvotes`: number (legacy compatibility field; thumbs feedback now uses structured signals)
- `display_order`: number
- `fit_score`: number | null
- `value_rating`: number | null
- `standout_features`: string[]
- `dealbreakers`: string[]
- `switching_from`: string[]
- `created_at`: string
- `updated_at`: string

## articles
Fields (14):
- `id`: string
- `title`: string
- `slug`: string
- `status`: ArticleStatus
- `summary_markdown`: string | null
- `content_markdown`: string | null
- `outline`: Record<string, unknown> | null
- `tags`: string[]
- `source_tool_ids`: string[]
- `source_context_ids`: string[]
- `source_data`: Record<string, unknown> | null
- `published_at`: string | null
- `created_at`: string
- `updated_at`: string

## article_insights
Fields (11):
- `id`: string
- `item_id`: string | null
- `context_id`: string | null
- `insight_type`: string
- `insight`: string
- `source_url`: string | null
- `source_type`: 'official' | 'editorial' | 'community' | null
- `claim_type`: 'fact' | 'opinion' | null
- `tags`: string[]
- `confidence`: number | null
- `created_at`: string

## source_policy_registry
Fields (17):
- `domain`: string
- `acquisition_mode`: 'LINK_ONLY' | 'API_ONLY' | 'SCRAPE_ALLOWED' | 'BLOCKED'
- `storage_mode`: 'URL_ONLY' | 'METADATA_ONLY' | 'SHORT_EXCERPT' | 'NO_STORE'
- `display_mode`: 'LINK_ONLY' | 'ATTRIBUTED_EXCERPT' | 'NO_DISPLAY'
- `llm_ingestion_allowed`: 'NO' | 'YES_LIMITED' | 'YES'
- `review_status`: 'VERIFIED' | 'DEFAULT'
- `tos_url`: string | null
- `last_reviewed_at`: string | null
- `policy_version`: string | null
- `notes`: string | null
- `path_prefix`: string
- `acquisition_mode`: 'LINK_ONLY' | 'API_ONLY' | 'SCRAPE_ALLOWED' | 'BLOCKED'
- `llm_ingestion_allowed`: 'NO' | 'YES_LIMITED' | 'YES'
- `notes`: string
- `max_chars_ingested`: number | null
- `created_at`: string
- `updated_at`: string

## source_policy_review_queue
Fields (9):
- `domain`: string
- `first_seen_at`: string
- `last_seen_at`: string
- `count_seen`: number
- `sample_urls`: string[] | null
- `sample_titles`: string[] | null
- `suggested_tos_url`: string | null
- `status`: 'OPEN' | 'TRIAGED' | 'APPROVED' | 'BLOCKED'
- `updated_at`: string

## claims
Fields (11):
- `id`: string
- `item_id`: string
- `context_id`: string | null
- `claim_type`: string
- `value_json`: Record<string, unknown> | null
- `source_url`: string | null
- `source_domain`: string | null
- `policy_snapshot`: Record<string, unknown> | null
- `confidence`: number | null
- `intent`: string | null
- `extracted_at`: string

## affiliate_offers
Fields (21):
- `id`: string
- `item_id`: string
- `url`: string
- `cta_text`: string
- `is_affiliate`: boolean
- `network`: string | null
- `commission_note`: string | null
- `is_primary`: boolean
- `display_order`: number
- `priority`: number
- `is_active`: boolean
- `tracking_params`: Record<string, unknown> | null
- `click_count`: number
- `last_click_at`: string | null
- `expires_at`: string | null
- `network_tier`: 1 | 2 | 3
- `network_program_id`: string | null
- `last_verified_at`: string | null
- `verification_status`: 'healthy' | 'broken' | 'expired' | 'pending' | 'unknown'
- `created_at`: string
- `updated_at`: string

## votes
Fields (7):
- `id`: string
- `review_id`: string
- `vote_type`: -1 | 1
- `ip_hash`: string
- `fingerprint_hash`: string | null
- `turnstile_token`: string | null
- `created_at`: string

## market_state
Fields (24):
- `id`: string
- `item_id`: string
- `price_cents`: number | null
- `price_currency`: string
- `price_display`: string | null
- `price_interval`: string | null
- `has_free_tier`: boolean
- `has_free_trial`: boolean
- `trial_days`: number | null
- `in_stock`: boolean
- `stock_quantity`: number | null
- `is_available`: boolean
- `is_deprecated`: boolean
- `source_type`: MarketSourceType
- `source_provider`: string | null
- `source_url`: string | null
- `source_raw`: Record<string, unknown> | null
- `confidence_score`: number
- `last_verified_at`: string
- `verification_note`: string | null
- `next_check_at`: string | null
- `check_frequency_hours`: number
- `created_at`: string
- `updated_at`: string

## price_history
Fields (8):
- `id`: string
- `item_id`: string
- `price_cents`: number | null
- `price_currency`: string
- `price_display`: string | null
- `source_type`: MarketSourceType | null
- `source_provider`: string | null
- `recorded_at`: string

## click_events
Fields (11):
- `id`: string
- `offer_id`: string
- `item_id`: string
- `referrer`: string | null
- `user_agent`: string | null
- `ip_hash`: string | null
- `country_code`: string | null
- `region`: string | null
- `source_page`: string | null
- `source_context_id`: string | null
- `clicked_at`: string

## hunt_queue
Fields (28):
- `id`: string
- `tool_name`: string
- `context_title`: string | null
- `category_slug`: string | null
- `hunt_type`: HuntType
- `force_regenerate`: boolean
- `priority`: number
- `scheduled_for`: string | null
- `deadline_at`: string | null
- `source`: HuntSource
- `requested_by`: string | null
- `status`: HuntQueueStatus
- `attempts`: number
- `max_attempts`: number
- `claimed_by`: string | null
- `claimed_at`: string | null
- `heartbeat_at`: string | null
- `item_id`: string | null
- `context_id`: string | null
- `review_id`: string | null
- `error_message`: string | null
- `error_details`: Record<string, unknown> | null
- `started_at`: string | null
- `completed_at`: string | null
- `duration_ms`: number | null
- `tokens_used`: number | null
- `created_at`: string
- `updated_at`: string

## item_audience_fit
Fields (6):
- `id`: string
- `item_id`: string
- `category_id`: string
- `fit_type`: AudienceFitType
- `reason`: string | null
- `created_at`: string

## comparison_insights
Fields (22):
- `id`: string
- `item_a_slug`: string
- `item_b_slug`: string
- `item_a_id`: string | null
- `item_b_id`: string | null
- `verdict`: string | null
- `choose_a_if`: string[]
- `choose_b_if`: string[]
- `migration_notes_a_to_b`: string | null
- `migration_notes_b_to_a`: string | null
- `why_switch_a_to_b`: string[]
- `why_switch_b_to_a`: string[]
- `winner`: 'a' | 'b' | 'tie'
- `confidence`: number
- `reason`: string
- `is_curated`: boolean
- `curator_notes`: string | null
- `data_sources`: string[]
- `generated_at`: string | null
- `curated_at`: string | null
- `created_at`: string
- `updated_at`: string
