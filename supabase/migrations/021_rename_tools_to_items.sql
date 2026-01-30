-- ============================================================================
-- MIGRATION 021: Rename tools → items (V2 Refactor)
--
-- This migration implements the polymorphic "items" architecture:
-- 1. Rename tools table to items
-- 2. Rename all tool_id foreign keys to item_id
-- 3. Rename tool_category_links to item_category_links
-- 4. Add specs JSONB for type-specific structured data
-- 5. Add base_score and base_score_breakdown for objective quality metrics
-- 6. Update all views, functions, triggers, and policies
-- 7. Create backward-compatible views for gradual code migration
--
-- NOTE: Run this in a transaction. Test thoroughly on staging first.
-- ============================================================================

-- ============================================================================
-- PART 1: RENAME CORE TABLE (tools → items)
-- ============================================================================

ALTER TABLE tools RENAME TO items;

-- Rename primary indexes
ALTER INDEX idx_tools_slug RENAME TO idx_items_slug;
ALTER INDEX idx_tools_category RENAME TO idx_items_category;
ALTER INDEX idx_tools_featured RENAME TO idx_items_featured;
ALTER INDEX idx_tools_name_trgm RENAME TO idx_items_name_trgm;
ALTER INDEX idx_tools_embedding RENAME TO idx_items_embedding;
ALTER INDEX idx_tools_type RENAME TO idx_items_type;

-- Rename trigger
ALTER TRIGGER trigger_tools_updated_at ON items RENAME TO trigger_items_updated_at;

-- ============================================================================
-- PART 2: ADD NEW COLUMNS TO items
-- ============================================================================

-- ============================================================================
-- NEW DATA DENSITY COLUMNS (V2)
--
-- Column vs JSONB decision:
--   COLUMNS: Queryable, indexed, frequently filtered/sorted
--   JSONB: Flexible, schema varies, rarely filtered directly
-- ============================================================================

-- ---------------------------------------------
-- COLUMNS (First-class, queryable)
-- ---------------------------------------------

-- Verdict: One-line bottom-line conclusion (frequently displayed, searchable)
ALTER TABLE items ADD COLUMN IF NOT EXISTS verdict TEXT;

-- Base score: Objective quality (0-100), independent of context
-- Used for sorting, filtering, comparison
ALTER TABLE items ADD COLUMN IF NOT EXISTS base_score INT CHECK (base_score >= 0 AND base_score <= 100);

-- Last major update: Freshness signal for "is this maintained?" queries
ALTER TABLE items ADD COLUMN IF NOT EXISTS last_major_update DATE;

-- ---------------------------------------------
-- JSONB FIELDS (Flexible, type-specific)
-- ---------------------------------------------

-- Specs: Type-specific structured data
-- TOOL schema: {
--   pricing_model: "freemium",
--   starting_price: "$12/mo",
--   free_tier_limits: "5 projects, 10 users",
--   trial_days: 14,
--   integrations: ["Slack", "Zapier", "Google Drive"],
--   platforms: ["Web", "iOS", "Mac", "Windows"],
--   support_options: ["Chat", "Email", "Phone", "Docs"],
--   security: ["SSO", "SOC2", "GDPR", "HIPAA"],
--   api_available: true,
--   open_source_repo: "https://github.com/...",
--   data_export_formats: ["CSV", "JSON", "PDF"],
--   sso_providers: ["Google", "Microsoft", "SAML", "Okta"]
-- }
-- GEAR schema: {
--   weight: "2.5 lbs",
--   dimensions: "12 x 8 x 4 inches",
--   battery_life: "8 hours",
--   warranty: "2 years",
--   connectivity: ["USB-C", "Bluetooth 5.0", "WiFi 6"],
--   materials: ["Aluminum", "Gorilla Glass"],
--   certifications: ["IP67", "MIL-STD-810G"],
--   in_box: ["Device", "Cable", "Manual"]
-- }
ALTER TABLE items ADD COLUMN IF NOT EXISTS specs JSONB DEFAULT '{}'::jsonb;

-- Base score breakdown: Detailed scoring components (not filtered, display only)
-- { reliability: 85, features: 90, value: 75, support: 80, ux: 88, documentation: 70, data_portability: 65 }
ALTER TABLE items ADD COLUMN IF NOT EXISTS base_score_breakdown JSONB DEFAULT '{}'::jsonb;

-- NOTE: company_info and competitors go into existing `metadata` JSONB column
-- metadata schema extension:
-- {
--   ...existing knowledge card fields...,
--   company: {
--     founded_year: 2015,
--     headquarters: "San Francisco, CA",
--     funding_stage: "Series C",  -- bootstrapped, seed, series_a, series_b, series_c, public, acquired
--     employee_range: "100-500",   -- 1-10, 10-50, 50-100, 100-500, 500-1000, 1000+
--     owned_by: "Salesforce",      -- parent company if acquired
--     publicly_traded: false
--   },
--   competitors: ["slack", "microsoft-teams", "discord"],  -- array of item slugs
--   related_items: ["zoom", "google-meet"]                  -- complementary tools
-- }

-- ---------------------------------------------
-- INDEXES
-- ---------------------------------------------

CREATE INDEX IF NOT EXISTS idx_items_base_score ON items(base_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_items_last_major_update ON items(last_major_update DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_items_specs ON items USING gin(specs);
CREATE INDEX IF NOT EXISTS idx_items_verdict ON items USING gin(to_tsvector('english', COALESCE(verdict, '')));

-- ---------------------------------------------
-- COMMENTS
-- ---------------------------------------------

COMMENT ON COLUMN items.verdict IS 'One-line bottom-line conclusion for quick scanning (max ~150 chars)';
COMMENT ON COLUMN items.base_score IS 'Objective quality score (0-100) independent of context. Used for sorting/comparison.';
COMMENT ON COLUMN items.last_major_update IS 'Date of last significant product update. Freshness signal.';
COMMENT ON COLUMN items.specs IS 'Type-specific structured data. Schema varies by item.type (tool vs gear).';
COMMENT ON COLUMN items.base_score_breakdown IS 'Detailed scoring: { reliability, features, value, support, ux, documentation, data_portability }';
COMMENT ON COLUMN items.metadata IS 'Extended to include: company{}, competitors[], related_items[] in addition to Knowledge Card';

-- ============================================================================
-- PART 3: RENAME FOREIGN KEY COLUMNS
-- ============================================================================

-- 3.1 contexts.primary_tool_id → primary_item_id
ALTER TABLE contexts RENAME COLUMN primary_tool_id TO primary_item_id;
ALTER INDEX idx_contexts_primary_tool RENAME TO idx_contexts_primary_item;

-- 3.2 reviews.tool_id → item_id
ALTER TABLE reviews RENAME COLUMN tool_id TO item_id;
ALTER INDEX idx_reviews_tool RENAME TO idx_reviews_item;
ALTER TABLE reviews RENAME CONSTRAINT unique_tool_context TO unique_item_context;

-- 3.3 affiliate_offers.tool_id → item_id
ALTER TABLE affiliate_offers RENAME COLUMN tool_id TO item_id;
ALTER INDEX idx_affiliate_tool RENAME TO idx_affiliate_item;
ALTER INDEX idx_affiliate_primary RENAME TO idx_affiliate_item_primary;

-- 3.4 hunt_logs.tool_id → item_id
ALTER TABLE hunt_logs RENAME COLUMN tool_id TO item_id;
ALTER INDEX idx_hunt_logs_tool RENAME TO idx_hunt_logs_item;

-- 3.5 market_state.tool_id → item_id
ALTER TABLE market_state RENAME COLUMN tool_id TO item_id;
ALTER INDEX idx_market_state_tool RENAME TO idx_market_state_item;
ALTER TABLE market_state RENAME CONSTRAINT unique_tool_market_state TO unique_item_market_state;

-- 3.6 price_history.tool_id → item_id
ALTER TABLE price_history RENAME COLUMN tool_id TO item_id;
ALTER INDEX idx_price_history_tool RENAME TO idx_price_history_item;
ALTER TABLE price_history RENAME CONSTRAINT idx_price_history_tool_time TO idx_price_history_item_time;

-- 3.7 click_events.tool_id → item_id
ALTER TABLE click_events RENAME COLUMN tool_id TO item_id;
ALTER INDEX idx_click_events_tool RENAME TO idx_click_events_item;

-- 3.8 hunt_queue.tool_id → item_id (result reference)
ALTER TABLE hunt_queue RENAME COLUMN tool_id TO item_id;
ALTER INDEX idx_hunt_queue_tool_name RENAME TO idx_hunt_queue_item_name;

-- ============================================================================
-- PART 4: RENAME tool_category_links → item_category_links
-- ============================================================================

ALTER TABLE tool_category_links RENAME TO item_category_links;
ALTER TABLE item_category_links RENAME COLUMN tool_id TO item_id;

-- Rename indexes
ALTER INDEX idx_tool_category_tool RENAME TO idx_item_category_item;
ALTER INDEX idx_tool_category_category RENAME TO idx_item_category_category;

-- Rename constraint
ALTER TABLE item_category_links RENAME CONSTRAINT unique_tool_category TO unique_item_category;

-- ============================================================================
-- PART 5: UPDATE RLS POLICIES
-- ============================================================================

-- Drop old policies
DROP POLICY IF EXISTS "Public read access" ON items;
DROP POLICY IF EXISTS "Public read access" ON item_category_links;

-- Recreate with correct table references
CREATE POLICY "Public read access" ON items FOR SELECT USING (true);
CREATE POLICY "Public read access" ON item_category_links FOR SELECT USING (true);

-- ============================================================================
-- PART 6: UPDATE FUNCTIONS
-- ============================================================================

-- 6.1 match_tools → match_items (semantic search)
DROP FUNCTION IF EXISTS match_tools(vector(1536), FLOAT, INT);

CREATE OR REPLACE FUNCTION match_items(
  query_embedding vector(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT,
  short_description TEXT,
  logo_url TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id,
    i.name,
    i.slug,
    i.short_description,
    i.logo_url,
    1 - (i.embedding <=> query_embedding) AS similarity
  FROM items i
  WHERE i.embedding IS NOT NULL
    AND 1 - (i.embedding <=> query_embedding) > match_threshold
  ORDER BY i.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 6.2 update_tool_metrics → update_item_metrics
DROP FUNCTION IF EXISTS update_tool_metrics(UUID);

CREATE OR REPLACE FUNCTION update_item_metrics(p_item_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE items
  SET
    avg_score = COALESCE((
      SELECT AVG(score)::NUMERIC(4,1)
      FROM reviews
      WHERE item_id = p_item_id AND score IS NOT NULL
    ), 0),
    review_count = (
      SELECT COUNT(*)
      FROM reviews
      WHERE item_id = p_item_id
    ),
    updated_at = NOW()
  WHERE id = p_item_id;
END;
$$;

-- 6.3 Update context metrics (tool_count still makes sense semantically)
CREATE OR REPLACE FUNCTION update_context_metrics(p_context_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE contexts
  SET
    tool_count = (
      SELECT COUNT(*)
      FROM reviews
      WHERE context_id = p_context_id
    ),
    updated_at = NOW()
  WHERE id = p_context_id;
END;
$$;

-- 6.4 Update review metrics trigger
CREATE OR REPLACE FUNCTION trigger_review_metrics()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM update_item_metrics(OLD.item_id);
    PERFORM update_context_metrics(OLD.context_id);
    RETURN OLD;
  ELSE
    PERFORM update_item_metrics(NEW.item_id);
    PERFORM update_context_metrics(NEW.context_id);
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 6.5 link_tool_to_category → link_item_to_category
DROP FUNCTION IF EXISTS link_tool_to_category(UUID, TEXT, category_type, NUMERIC);

CREATE OR REPLACE FUNCTION link_item_to_category(
  p_item_id UUID,
  p_category_name TEXT,
  p_category_type category_type,
  p_relevance NUMERIC DEFAULT 1.0
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_category_id UUID;
BEGIN
  -- Get or create the category
  v_category_id := get_or_create_category(p_category_name, p_category_type);

  -- Create the link
  INSERT INTO item_category_links (item_id, category_id, relevance_score)
  VALUES (p_item_id, v_category_id, p_relevance)
  ON CONFLICT (item_id, category_id) DO UPDATE SET relevance_score = EXCLUDED.relevance_score;

  RETURN v_category_id;
END;
$$;

-- 6.6 get_tool_tags → get_item_tags
DROP FUNCTION IF EXISTS get_tool_tags(UUID);

CREATE OR REPLACE FUNCTION get_item_tags(p_item_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'functions', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'slug', c.slug))
      FROM item_category_links icl
      JOIN categories c ON icl.category_id = c.id
      WHERE icl.item_id = p_item_id AND c.type = 'function'
    ), '[]'::jsonb),
    'audiences', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'slug', c.slug))
      FROM item_category_links icl
      JOIN categories c ON icl.category_id = c.id
      WHERE icl.item_id = p_item_id AND c.type = 'audience'
    ), '[]'::jsonb),
    'platforms', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'slug', c.slug))
      FROM item_category_links icl
      JOIN categories c ON icl.category_id = c.id
      WHERE icl.item_id = p_item_id AND c.type = 'platform'
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- 6.7 get_priority_affiliate (update parameter name)
CREATE OR REPLACE FUNCTION get_priority_affiliate(p_item_id UUID)
RETURNS TABLE (
  offer_id UUID,
  url TEXT,
  cta_text TEXT,
  network TEXT,
  is_affiliate BOOLEAN
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ao.id,
    ao.url,
    ao.cta_text,
    ao.network,
    ao.is_affiliate
  FROM affiliate_offers ao
  WHERE ao.item_id = p_item_id
    AND ao.is_active = true
    AND (ao.expires_at IS NULL OR ao.expires_at > NOW())
  ORDER BY ao.priority DESC, ao.created_at ASC
  LIMIT 1;
END;
$$;

-- 6.8 log_click (update parameter name)
CREATE OR REPLACE FUNCTION log_click(
  p_offer_id UUID,
  p_item_id UUID,
  p_referrer TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_ip_hash TEXT DEFAULT NULL,
  p_country_code CHAR(2) DEFAULT NULL,
  p_source_page TEXT DEFAULT NULL,
  p_source_context_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_click_id UUID;
BEGIN
  -- Insert click event
  INSERT INTO click_events (
    offer_id, item_id, referrer, user_agent, ip_hash,
    country_code, source_page, source_context_id
  )
  VALUES (
    p_offer_id, p_item_id, p_referrer, p_user_agent, p_ip_hash,
    p_country_code, p_source_page, p_source_context_id
  )
  RETURNING id INTO v_click_id;

  -- Increment denormalized counter
  UPDATE affiliate_offers
  SET click_count = click_count + 1,
      last_click_at = NOW()
  WHERE id = p_offer_id;

  RETURN v_click_id;
END;
$$;

-- 6.9 log_price_change (update column references)
CREATE OR REPLACE FUNCTION log_price_change()
RETURNS TRIGGER AS $$
DECLARE
  last_price_cents INT;
  last_price_currency TEXT;
BEGIN
  -- Skip if price_cents is NULL (no price to track)
  IF NEW.price_cents IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get the most recent price for this item
  SELECT price_cents, price_currency
  INTO last_price_cents, last_price_currency
  FROM price_history
  WHERE item_id = NEW.item_id
  ORDER BY recorded_at DESC
  LIMIT 1;

  -- Only insert if price changed
  IF last_price_cents IS NULL
     OR last_price_cents != NEW.price_cents
     OR last_price_currency != NEW.price_currency THEN

    INSERT INTO price_history (
      item_id,
      price_cents,
      price_currency,
      price_display,
      source_type,
      source_provider
    )
    VALUES (
      NEW.item_id,
      NEW.price_cents,
      NEW.price_currency,
      NEW.price_display,
      NEW.source_type,
      NEW.source_provider
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6.10 complete_hunt (update parameter name)
CREATE OR REPLACE FUNCTION complete_hunt(
  p_queue_id UUID,
  p_item_id UUID,
  p_context_id UUID DEFAULT NULL,
  p_review_id UUID DEFAULT NULL,
  p_tokens_used INT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE hunt_queue
  SET
    status = 'completed',
    item_id = p_item_id,
    context_id = p_context_id,
    review_id = p_review_id,
    tokens_used = p_tokens_used,
    completed_at = NOW(),
    duration_ms = EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000,
    updated_at = NOW()
  WHERE id = p_queue_id;
END;
$$;

-- ============================================================================
-- PART 7: UPDATE VIEWS
-- ============================================================================

-- 7.1 tools_with_tags → items_with_tags
DROP VIEW IF EXISTS tools_with_tags;

CREATE OR REPLACE VIEW items_with_tags AS
SELECT
  i.*,
  COALESCE(
    (SELECT json_agg(json_build_object('id', c.id, 'name', c.name, 'type', c.type, 'slug', c.slug))
     FROM item_category_links icl
     JOIN categories c ON icl.category_id = c.id
     WHERE icl.item_id = i.id AND c.type = 'function'), '[]'::json
  ) as function_tags,
  COALESCE(
    (SELECT json_agg(json_build_object('id', c.id, 'name', c.name, 'type', c.type, 'slug', c.slug))
     FROM item_category_links icl
     JOIN categories c ON icl.category_id = c.id
     WHERE icl.item_id = i.id AND c.type = 'audience'), '[]'::json
  ) as audience_tags,
  COALESCE(
    (SELECT json_agg(json_build_object('id', c.id, 'name', c.name, 'type', c.type, 'slug', c.slug))
     FROM item_category_links icl
     JOIN categories c ON icl.category_id = c.id
     WHERE icl.item_id = i.id AND c.type = 'platform'), '[]'::json
  ) as platform_tags
FROM items i;

-- 7.2 affiliate_performance (update column refs)
CREATE OR REPLACE VIEW affiliate_performance AS
SELECT
  ao.id,
  ao.item_id,
  i.name AS item_name,
  i.slug AS item_slug,
  ao.network,
  ao.priority,
  ao.is_affiliate,
  ao.is_active,
  ao.click_count,
  ao.last_click_at,
  ao.expires_at,
  (SELECT COUNT(*) FROM click_events ce
   WHERE ce.offer_id = ao.id
   AND ce.clicked_at > NOW() - INTERVAL '7 days') AS clicks_7d,
  (SELECT COUNT(*) FROM click_events ce
   WHERE ce.offer_id = ao.id
   AND ce.clicked_at > NOW() - INTERVAL '30 days') AS clicks_30d
FROM affiliate_offers ao
JOIN items i ON ao.item_id = i.id
ORDER BY ao.click_count DESC;

-- 7.3 hunt_queue_dashboard (update column refs)
CREATE OR REPLACE VIEW hunt_queue_dashboard AS
SELECT
  hq.*,
  i.name AS resolved_item_name,
  i.slug AS resolved_item_slug,
  CASE
    WHEN hq.status = 'processing' AND hq.heartbeat_at < NOW() - INTERVAL '5 minutes'
    THEN true
    ELSE false
  END AS is_stale,
  CASE
    WHEN hq.deadline_at IS NOT NULL AND hq.deadline_at < NOW() AND hq.status NOT IN ('completed', 'failed')
    THEN true
    ELSE false
  END AS is_overdue
FROM hunt_queue hq
LEFT JOIN items i ON hq.item_id = i.id
ORDER BY
  CASE hq.status
    WHEN 'processing' THEN 1
    WHEN 'claimed' THEN 2
    WHEN 'pending' THEN 3
    WHEN 'failed' THEN 4
    ELSE 5
  END,
  hq.priority DESC,
  hq.created_at ASC;

-- 7.4 market_state_freshness (update column refs)
CREATE OR REPLACE VIEW market_state_freshness AS
SELECT
  ms.*,
  i.name AS item_name,
  i.slug AS item_slug,
  EXTRACT(EPOCH FROM (NOW() - ms.last_verified_at)) / 3600 AS hours_since_verified,
  CASE
    WHEN ms.last_verified_at > NOW() - INTERVAL '24 hours' THEN 'fresh'
    WHEN ms.last_verified_at > NOW() - INTERVAL '7 days' THEN 'recent'
    WHEN ms.last_verified_at > NOW() - INTERVAL '30 days' THEN 'stale'
    ELSE 'very_stale'
  END AS freshness,
  CASE
    WHEN ms.source_type = 'api' THEN 1
    WHEN ms.source_type = 'scrape' THEN 2
    ELSE 3
  END AS source_reliability_rank
FROM market_state ms
JOIN items i ON ms.item_id = i.id
ORDER BY ms.last_verified_at ASC;

-- ============================================================================
-- PART 8: BACKWARD COMPATIBILITY VIEWS
-- These allow existing code to continue working during migration
-- TODO: Remove these after all code is updated
-- ============================================================================

-- View: tools (alias for items)
CREATE OR REPLACE VIEW tools AS SELECT * FROM items;

-- View: tool_category_links (alias for item_category_links)
CREATE OR REPLACE VIEW tool_category_links AS SELECT * FROM item_category_links;

-- Alias function: match_tools
CREATE OR REPLACE FUNCTION match_tools(
  query_embedding vector(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT,
  short_description TEXT,
  logo_url TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY SELECT * FROM match_items(query_embedding, match_threshold, match_count);
END;
$$;

-- Alias function: update_tool_metrics
CREATE OR REPLACE FUNCTION update_tool_metrics(p_tool_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM update_item_metrics(p_tool_id);
END;
$$;

-- Alias function: link_tool_to_category
CREATE OR REPLACE FUNCTION link_tool_to_category(
  p_tool_id UUID,
  p_category_name TEXT,
  p_category_type category_type,
  p_relevance NUMERIC DEFAULT 1.0
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN link_item_to_category(p_tool_id, p_category_name, p_category_type, p_relevance);
END;
$$;

-- ============================================================================
-- PART 9: GRANTS
-- ============================================================================

GRANT EXECUTE ON FUNCTION match_items TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION update_item_metrics TO service_role;
GRANT EXECUTE ON FUNCTION link_item_to_category TO service_role;
GRANT EXECUTE ON FUNCTION get_item_tags TO anon, authenticated, service_role;

-- Keep backward compat function grants
GRANT EXECUTE ON FUNCTION match_tools TO anon;
GRANT EXECUTE ON FUNCTION update_tool_metrics TO service_role;
GRANT EXECUTE ON FUNCTION link_tool_to_category TO service_role;

-- ============================================================================
-- PART 10: DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE items IS 'Core entity table (formerly "tools"). Supports polymorphic types: tool (software), gear (hardware)';
COMMENT ON TABLE item_category_links IS 'Knowledge graph edges linking items to categories (function/audience/platform)';

COMMENT ON VIEW tools IS 'DEPRECATED: Backward compatibility view for items table. Use items table directly.';
COMMENT ON VIEW tool_category_links IS 'DEPRECATED: Backward compatibility view for item_category_links. Use item_category_links directly.';

-- ============================================================================
-- MIGRATION COMPLETE
--
-- Next steps for code migration:
-- 1. Update TypeScript types: Tool → Item, tool_id → item_id
-- 2. Update Supabase queries: .from('tools') → .from('items')
-- 3. Update Hunter pipeline: tool references → item references
-- 4. Update API routes: /tool/[slug] already done
-- 5. After all code updated, drop backward compat views (PART 8)
-- ============================================================================
