-- ============================================================================
-- MIGRATION 032: Structured Signals + Bundle Components + Pricing Refresh
--
-- Adds:
-- 1) Structured user signals (data points, not freeform reviews)
-- 2) Bundle composition table (suite entitlements)
-- 3) Pricing refresh queue helpers
-- ============================================================================

-- ==========================================================================
-- PART 1: Structured Signals (User Input as Data)
-- ==========================================================================

CREATE TABLE IF NOT EXISTS signal_definitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL UNIQUE,                      -- e.g., 'gotcha_hidden_fee', 'vibe_fast_ui'
  label TEXT NOT NULL,                           -- Human-readable label
  category TEXT NOT NULL CHECK (category IN (
    'pros', 'cons', 'budget', 'vibe', 'switch', 'pricing', 'gotcha', 'experience'
  )),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS signal_options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  signal_id UUID NOT NULL REFERENCES signal_definitions(id) ON DELETE CASCADE,
  key TEXT NOT NULL,                             -- e.g., 'yes', 'no', 'jira', 'trello'
  label TEXT NOT NULL,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(signal_id, key)
);

-- User signal events (anonymous or authenticated later)
CREATE TABLE IF NOT EXISTS user_signals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  signal_id UUID NOT NULL REFERENCES signal_definitions(id) ON DELETE CASCADE,
  option_id UUID REFERENCES signal_options(id) ON DELETE SET NULL,

  -- Value payloads (one of these typically used)
  value_bool BOOLEAN,
  value_text TEXT,
  value_num NUMERIC,

  -- Anti‑spam & context
  ip_hash TEXT NOT NULL,
  fingerprint_hash TEXT,
  user_agent TEXT,
  source_page TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Aggregate counts for fast UI display
CREATE TABLE IF NOT EXISTS signal_aggregates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  signal_id UUID NOT NULL REFERENCES signal_definitions(id) ON DELETE CASCADE,
  option_id UUID REFERENCES signal_options(id) ON DELETE SET NULL,

  count_total INT DEFAULT 0,
  count_positive INT DEFAULT 0,
  count_negative INT DEFAULT 0,

  last_updated TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(item_id, signal_id, COALESCE(option_id, '00000000-0000-0000-0000-000000000000'))
);

CREATE INDEX IF NOT EXISTS idx_user_signals_item ON user_signals(item_id);
CREATE INDEX IF NOT EXISTS idx_user_signals_signal ON user_signals(signal_id);
CREATE INDEX IF NOT EXISTS idx_signal_aggregates_item ON signal_aggregates(item_id);

-- RLS
ALTER TABLE signal_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE signal_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE signal_aggregates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read signals" ON signal_definitions FOR SELECT USING (true);
CREATE POLICY "Public read signal options" ON signal_options FOR SELECT USING (true);
CREATE POLICY "Public read signal aggregates" ON signal_aggregates FOR SELECT USING (true);
CREATE POLICY "No direct access user_signals" ON user_signals FOR ALL USING (false);

-- Aggregate maintenance function
CREATE OR REPLACE FUNCTION update_signal_aggregate()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO signal_aggregates (
    item_id,
    signal_id,
    option_id,
    count_total,
    count_positive,
    count_negative,
    last_updated
  )
  VALUES (
    NEW.item_id,
    NEW.signal_id,
    NEW.option_id,
    1,
    CASE WHEN NEW.value_bool = true THEN 1 ELSE 0 END,
    CASE WHEN NEW.value_bool = false THEN 1 ELSE 0 END,
    NOW()
  )
  ON CONFLICT (item_id, signal_id, COALESCE(option_id, '00000000-0000-0000-0000-000000000000'))
  DO UPDATE SET
    count_total = signal_aggregates.count_total + 1,
    count_positive = signal_aggregates.count_positive + CASE WHEN NEW.value_bool = true THEN 1 ELSE 0 END,
    count_negative = signal_aggregates.count_negative + CASE WHEN NEW.value_bool = false THEN 1 ELSE 0 END,
    last_updated = NOW();

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_user_signals_aggregate
  AFTER INSERT ON user_signals
  FOR EACH ROW EXECUTE FUNCTION update_signal_aggregate();

-- RPC: Record signal (secure insert)
CREATE OR REPLACE FUNCTION record_signal(
  p_item_id UUID,
  p_signal_key TEXT,
  p_option_key TEXT DEFAULT NULL,
  p_value_bool BOOLEAN DEFAULT NULL,
  p_value_text TEXT DEFAULT NULL,
  p_value_num NUMERIC DEFAULT NULL,
  p_ip_hash TEXT DEFAULT NULL,
  p_fingerprint_hash TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_source_page TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_signal_id UUID;
  v_option_id UUID;
BEGIN
  SELECT id INTO v_signal_id FROM signal_definitions WHERE key = p_signal_key AND is_active = true;
  IF v_signal_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unknown signal');
  END IF;

  IF p_option_key IS NOT NULL THEN
    SELECT id INTO v_option_id FROM signal_options WHERE signal_id = v_signal_id AND key = p_option_key;
  END IF;

  IF p_ip_hash IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Missing ip_hash');
  END IF;

  INSERT INTO user_signals (
    item_id, signal_id, option_id, value_bool, value_text, value_num,
    ip_hash, fingerprint_hash, user_agent, source_page
  )
  VALUES (
    p_item_id, v_signal_id, v_option_id, p_value_bool, p_value_text, p_value_num,
    p_ip_hash, p_fingerprint_hash, p_user_agent, p_source_page
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION record_signal TO anon, authenticated, service_role;

-- ==========================================================================
-- PART 2: Bundle Composition (Suite Entitlements)
-- ==========================================================================

CREATE TABLE IF NOT EXISTS bundle_components (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bundle_item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  component_item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  plan_id TEXT,                 -- SMP plan id; NULL = all plans
  included BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(bundle_item_id, component_item_id, COALESCE(plan_id, 'all'))
);

CREATE INDEX IF NOT EXISTS idx_bundle_components_bundle ON bundle_components(bundle_item_id);
CREATE INDEX IF NOT EXISTS idx_bundle_components_component ON bundle_components(component_item_id);

ALTER TABLE bundle_components ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read bundle components" ON bundle_components FOR SELECT USING (true);

-- ==========================================================================
-- PART 3: Pricing Refresh Helpers
-- ==========================================================================

-- View: pricing refresh candidates (stale pricing)
CREATE OR REPLACE VIEW pricing_refresh_candidates AS
SELECT
  i.id,
  i.name,
  i.slug,
  i.pricing_confidence,
  i.pricing_verified_at,
  EXTRACT(DAY FROM NOW() - COALESCE(i.pricing_verified_at, i.created_at))::INT AS days_since_verification
FROM items i
WHERE i.type = 'tool'
ORDER BY days_since_verification DESC NULLS LAST;

ALTER VIEW pricing_refresh_candidates SET (security_invoker = on);

-- RPC: enqueue stale items into hunt_queue with price_only mode
CREATE OR REPLACE FUNCTION enqueue_pricing_refresh(
  p_days_stale INT DEFAULT 90,
  p_priority INT DEFAULT 50,
  p_limit INT DEFAULT 50
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INT := 0;
  v_item RECORD;
BEGIN
  FOR v_item IN
    SELECT id, name
    FROM items
    WHERE type = 'tool'
      AND (pricing_verified_at IS NULL OR pricing_verified_at < NOW() - (p_days_stale || ' days')::INTERVAL)
    ORDER BY pricing_verified_at ASC NULLS FIRST
    LIMIT p_limit
  LOOP
    INSERT INTO hunt_queue (
      tool_name,
      priority,
      source,
      hunt_type
    )
    VALUES (
      v_item.name,
      p_priority,
      'scheduled',
      'price_only'
    )
    ON CONFLICT (tool_name, status) WHERE status IN ('pending', 'claimed', 'processing')
    DO NOTHING;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION enqueue_pricing_refresh TO service_role;

-- ==========================================================================
-- PART 4: Seed Core Signal Definitions
-- ==========================================================================

INSERT INTO signal_definitions (key, label, category, description)
VALUES
  ('agree_pros', 'Agree with Pros', 'pros', 'User agrees with AI-generated pros'),
  ('agree_cons', 'Agree with Cons', 'cons', 'User agrees with AI-generated cons'),
  ('gotcha_hidden_fee', 'Hidden Fee', 'gotcha', 'User reports unexpected or hidden fees'),
  ('gotcha_setup_cost', 'Setup Cost', 'gotcha', 'User reports setup/implementation cost'),
  ('vibe_fast_ui', 'Fast UI', 'vibe', 'UI feels fast after sustained use'),
  ('vibe_slow_search', 'Slow Search', 'vibe', 'Search becomes slow at scale'),
  ('switch_from', 'Switched From', 'switch', 'Previous tool used before switching')
ON CONFLICT (key) DO UPDATE SET
  label = EXCLUDED.label,
  category = EXCLUDED.category,
  description = EXCLUDED.description;

-- Option seeds (examples)
INSERT INTO signal_options (signal_id, key, label, display_order)
SELECT sd.id, 'yes', 'Yes', 1 FROM signal_definitions sd WHERE sd.key IN ('agree_pros', 'agree_cons')
ON CONFLICT DO NOTHING;

INSERT INTO signal_options (signal_id, key, label, display_order)
SELECT sd.id, 'no', 'No', 2 FROM signal_definitions sd WHERE sd.key IN ('agree_pros', 'agree_cons')
ON CONFLICT DO NOTHING;

INSERT INTO signal_options (signal_id, key, label, display_order)
SELECT sd.id, 'jira', 'Jira', 1 FROM signal_definitions sd WHERE sd.key = 'switch_from'
ON CONFLICT DO NOTHING;

INSERT INTO signal_options (signal_id, key, label, display_order)
SELECT sd.id, 'trello', 'Trello', 2 FROM signal_definitions sd WHERE sd.key = 'switch_from'
ON CONFLICT DO NOTHING;
