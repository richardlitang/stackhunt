# Data Model Field Usage (code + migrations)

Last verified: 2026-03-05

## items
Fields: 38
Field -> occurrences
- pricing_comparison_plan_id: 4
- logo_path: 5
- pricing_comparison_tier: 5
- base_score_breakdown: 6
- effective_starting_price_annual: 7
- normalized_price_per_seat_annual: 7
- is_verified: 8
- video_title: 8
- long_description: 9
- video_id: 14
- last_major_update: 14
- pricing_confidence: 15
- normalized_price_per_seat_monthly: 16
- data_confidence: 18
- effective_starting_price_monthly: 18
- parent_id: 19
- pricing_verified_at: 22
- review_count: 29
- is_featured: 39
- review_context: 45
- base_score: 51
- verdict: 53
- learning_curve: 54
- avg_score: 66
- pricing_type: 68
- short_description: 84
- category_id: 85
- embedding: 89
- logo_url: 128
- website: 132
- updated_at: 138
- metadata: 148
- created_at: 195
- specs: 321
- slug: 687
- type: 1095
- name: 1150
- id: 1201

## contexts
Fields: 17
Field -> occurrences
- primary_item_id: 4
- title_noun: 4
- title_modifier: 4
- platform_category_id: 4
- intro_text: 5
- meta_description: 5
- function_category_id: 5
- audience_category_id: 5
- title_template: 8
- tool_count: 39
- is_featured: 39
- category_id: 85
- updated_at: 138
- created_at: 195
- title: 370
- slug: 687
- id: 1201

## reviews
Fields: 18
Field -> occurrences
- standout_features: 10
- fit_score: 12
- value_rating: 12
- switching_from: 14
- upvotes: 27 (legacy compatibility field; active thumbs feedback now stored in `user_signals`)
- dealbreakers: 28
- downvotes: 29 (legacy compatibility field; active thumbs feedback now stored in `user_signals`)
- sentiment_tags: 33
- display_order: 39
- summary_markdown: 52
- context_id: 109
- item_id: 124
- updated_at: 138
- created_at: 195
- pros: 205
- cons: 217
- score: 317
- id: 1201

## categories
Fields: 10
Field -> occurrences
- display_order: 39
- is_featured: 39
- updated_at: 138
- icon: 181
- created_at: 195
- description: 283
- slug: 687
- type: 1095
- name: 1150
- id: 1201

## articles
Fields: 14
Field -> occurrences
- source_tool_ids: 8
- source_context_ids: 8
- source_data: 9
- content_markdown: 10
- published_at: 39
- summary_markdown: 52
- tags: 73
- outline: 79
- updated_at: 138
- created_at: 195
- title: 370
- slug: 687
- status: 871
- id: 1201

## article_insights
Fields: 11
Field -> occurrences
- insight_type: 10
- insight: 32
- claim_type: 54
- tags: 73
- source_type: 97
- source_url: 105
- context_id: 109
- item_id: 124
- created_at: 195
- confidence: 210
- id: 1201

## affiliate_offers
Fields: 21
Field -> occurrences
- commission_note: 3
- tracking_params: 3
- network_program_id: 4
- last_click_at: 6
- click_count: 10
- is_primary: 13
- cta_text: 16
- network_tier: 16
- verification_status: 20
- is_affiliate: 26
- network: 27
- expires_at: 29
- last_verified_at: 30
- is_active: 31
- display_order: 39
- item_id: 124
- updated_at: 138
- created_at: 195
- priority: 237
- url: 419
- id: 1201

## market_state
Fields: 24
Field -> occurrences
- price_interval: 3
- in_stock: 3
- stock_quantity: 3
- is_available: 3
- source_raw: 3
- verification_note: 3
- check_frequency_hours: 3
- is_deprecated: 5
- confidence_score: 5
- next_check_at: 5
- price_display: 10
- source_provider: 10
- price_currency: 14
- price_cents: 18
- has_free_trial: 19
- trial_days: 24
- has_free_tier: 25
- last_verified_at: 30
- source_type: 97
- source_url: 105
- item_id: 124
- updated_at: 138
- created_at: 195
- id: 1201

## price_history
Fields: 8
Field -> occurrences
- price_display: 10
- source_provider: 10
- price_currency: 14
- recorded_at: 17
- price_cents: 18
- source_type: 97
- item_id: 124
- id: 1201

## click_events
Fields: 11
Field -> occurrences
- country_code: 5
- region: 5
- source_context_id: 5
- source_page: 7
- clicked_at: 8
- referrer: 11
- user_agent: 11
- offer_id: 13
- ip_hash: 36
- item_id: 124
- id: 1201

## hunt_queue
Fields: 28
Field -> occurrences
- requested_by: 4
- deadline_at: 7
- error_details: 7
- max_attempts: 9
- tokens_used: 12
- force_regenerate: 13
- started_at: 13
- duration_ms: 13
- claimed_by: 15
- category_slug: 17
- scheduled_for: 18
- claimed_at: 18
- hunt_type: 19
- error_message: 22
- review_id: 25
- heartbeat_at: 26
- attempts: 27
- completed_at: 38
- context_title: 64
- context_id: 109
- item_id: 124
- updated_at: 138
- tool_name: 182
- created_at: 195
- priority: 237
- source: 358
- status: 871
- id: 1201

## item_audience_fit
Fields: 6
Field -> occurrences
- fit_type: 5
- category_id: 85
- reason: 85
- item_id: 124
- created_at: 195
- id: 1201

## comparison_insights
Fields: 22
Field -> occurrences
- generated_at: 2
- curated_at: 2
- item_a_id: 3
- item_b_id: 3
- migration_notes_a_to_b: 3
- migration_notes_b_to_a: 3
- curator_notes: 3
- data_sources: 3
- choose_a_if: 4
- choose_b_if: 4
- why_switch_a_to_b: 4
- why_switch_b_to_a: 4
- is_curated: 6
- item_a_slug: 17
- item_b_slug: 17
- winner: 33
- verdict: 53
- reason: 85
- updated_at: 138
- created_at: 195
- confidence: 210
- id: 1201

## claims
Fields: 11
Field -> occurrences
- value_json: 3
- source_domain: 3
- policy_snapshot: 3
- extracted_at: 5
- claim_type: 54
- intent: 55
- source_url: 105
- context_id: 109
- item_id: 124
- confidence: 210
- id: 1201

## source_policy_registry
Fields: 17
Field -> occurrences
- storage_mode: 1
- review_status: 1
- tos_url: 1
- last_reviewed_at: 1
- path_prefix: 2
- max_chars_ingested: 7
- display_mode: 10
- policy_version: 10
- acquisition_mode: 20
- llm_ingestion_allowed: 20
- acquisition_mode: 20
- llm_ingestion_allowed: 20
- notes: 104
- notes: 104
- updated_at: 138
- created_at: 195
- domain: 263

## source_policy_review_queue
Fields: 9
Field -> occurrences
- first_seen_at: 1
- suggested_tos_url: 1
- last_seen_at: 2
- count_seen: 4
- sample_urls: 4
- sample_titles: 4
- updated_at: 138
- domain: 263
- status: 871
