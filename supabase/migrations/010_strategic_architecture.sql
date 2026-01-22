-- ============================================================================
-- STACKHUNT STRATEGIC ARCHITECTURE v2.0
-- Implements the finalized architecture decisions:
-- 1. Market State (Dynamic Data) with Source Tracking
-- 2. Price History with Deduplication Trigger
-- 3. Affiliate Priority Router & Click Events
-- 4. Hunt Queue for CLI Worker Model
-- ============================================================================

-- ============================================================================
-- PART 1: MARKET STATE (Dynamic Pricing Data)
-- Separates volatile market data from static tool facts
-- ============================================================================

CREATE TABLE market_state (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tool_id UUID NOT NULL REFERENCES tools(id) ON DELETE CASCADE,

  -- Pricing (stored in cents for precision)
  price_cents INT,                          -- e.g., 1999 = $19.99
  price_currency TEXT DEFAULT 'USD',
  price_display TEXT,                       -- Human-readable: "$19/mo", "Free", "$299 one-time"
  price_interval TEXT,                      -- 'monthly', 'yearly', 'one_time', 'per_user'

  -- Free tier info
  has_free_tier BOOLEAN DEFAULT false,
  has_free_trial BOOLEAN DEFAULT false,
  trial_days INT,

  -- Availability (for physical products later)
  in_stock BOOLEAN DEFAULT true,
  stock_quantity INT,                       -- NULL = unlimited/digital
  is_available BOOLEAN DEFAULT true,        -- Product exists and can be purchased
  is_deprecated BOOLEAN DEFAULT false,      -- Sunset/discontinued

  -- ==========================================
  -- SOURCE TRACKING (Critical for data quality)
  -- ==========================================
  source_type TEXT NOT NULL CHECK (source_type IN ('api', 'scrape', 'manual')),
  source_provider TEXT,                     -- 'amazon_paapi', 'official_website', 'stripe_pricing_api', etc.
  source_url TEXT,                          -- Where we got this data
  source_raw JSONB,                         -- Raw API/scrape response for debugging

  -- Data quality signals
  confidence_score NUMERIC(3,2) DEFAULT 1.0 CHECK (confidence_score >= 0 AND confidence_score <= 1),
  last_verified_at TIMESTAMPTZ DEFAULT NOW(),
  verification_note TEXT,                   -- "Verified on pricing page 2024-01-15"

  -- Scheduling
  next_check_at TIMESTAMPTZ,                -- When to re-verify this data
  check_frequency_hours INT DEFAULT 168,    -- Default: weekly (168 hours)

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One market state per tool
  CONSTRAINT unique_tool_market_state UNIQUE (tool_id)
);

CREATE INDEX idx_market_state_tool ON market_state(tool_id);
CREATE INDEX idx_market_state_source ON market_state(source_type, source_provider);
CREATE INDEX idx_market_state_stale ON market_state(next_check_at) WHERE next_check_at < NOW();
CREATE INDEX idx_market_state_needs_check ON market_state(last_verified_at);

-- ============================================================================
-- PART 2: PRICE HISTORY (Deduplication Trigger)
-- Only logs when price actually changes
-- ============================================================================

CREATE TABLE price_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tool_id UUID NOT NULL REFERENCES tools(id) ON DELETE CASCADE,

  -- Price snapshot
  price_cents INT,
  price_currency TEXT DEFAULT 'USD',
  price_display TEXT,

  -- Source at time of recording
  source_type TEXT,
  source_provider TEXT,

  -- When this price was active
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  -- We don't track "ended_at" - the next record implies the end

  -- Index for efficient lookups
  CONSTRAINT idx_price_history_tool_time UNIQUE (tool_id, recorded_at)
);

CREATE INDEX idx_price_history_tool ON price_history(tool_id);
CREATE INDEX idx_price_history_recorded ON price_history(recorded_at DESC);

-- Trigger function: Only insert if price actually changed
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

  -- Get the most recent price for this tool
  SELECT price_cents, price_currency
  INTO last_price_cents, last_price_currency
  FROM price_history
  WHERE tool_id = NEW.tool_id
  ORDER BY recorded_at DESC
  LIMIT 1;

  -- Only insert if:
  -- 1. No previous record exists (first price), OR
  -- 2. Price changed, OR
  -- 3. Currency changed
  IF last_price_cents IS NULL
     OR last_price_cents != NEW.price_cents
     OR last_price_currency != NEW.price_currency THEN

    INSERT INTO price_history (
      tool_id,
      price_cents,
      price_currency,
      price_display,
      source_type,
      source_provider
    )
    VALUES (
      NEW.tool_id,
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

-- Trigger on INSERT or UPDATE of price fields
CREATE TRIGGER trigger_log_price_change
  AFTER INSERT OR UPDATE OF price_cents, price_currency ON market_state
  FOR EACH ROW
  EXECUTE FUNCTION log_price_change();

-- ============================================================================
-- PART 3: AFFILIATE PRIORITY ROUTER
-- Modify existing affiliate_offers + create click_events
-- ============================================================================

-- Add priority and status fields to existing affiliate_offers
ALTER TABLE affiliate_offers
  ADD COLUMN IF NOT EXISTS priority INT DEFAULT 50,           -- Higher = preferred (1-100)
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,    -- Can be disabled without deletion
  ADD COLUMN IF NOT EXISTS tracking_params JSONB,             -- UTM params, sub-IDs, etc.
  ADD COLUMN IF NOT EXISTS click_count INT DEFAULT 0,         -- Denormalized for quick display
  ADD COLUMN IF NOT EXISTS last_click_at TIMESTAMPTZ;

-- Index for the Priority Router query
CREATE INDEX IF NOT EXISTS idx_affiliate_priority
  ON affiliate_offers(tool_id, priority DESC)
  WHERE is_active = true AND (expires_at IS NULL OR expires_at > NOW());

-- Click events table for analytics
CREATE TABLE click_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- What was clicked
  offer_id UUID NOT NULL REFERENCES affiliate_offers(id) ON DELETE CASCADE,
  tool_id UUID NOT NULL REFERENCES tools(id) ON DELETE CASCADE,

  -- Request context
  referrer TEXT,                            -- Where the user came from
  user_agent TEXT,
  ip_hash TEXT,                             -- SHA256 hash for privacy

  -- Geo (derived from IP, optional)
  country_code CHAR(2),
  region TEXT,

  -- Page context
  source_page TEXT,                         -- '/tools/notion', '/best/crm-small-teams'
  source_context_id UUID REFERENCES contexts(id) ON DELETE SET NULL,

  -- Timestamps
  clicked_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_click_events_offer ON click_events(offer_id);
CREATE INDEX idx_click_events_tool ON click_events(tool_id);
CREATE INDEX idx_click_events_time ON click_events(clicked_at DESC);
CREATE INDEX idx_click_events_daily ON click_events(DATE(clicked_at), tool_id);

-- Function to get the best affiliate link for a tool (Priority Router)
CREATE OR REPLACE FUNCTION get_priority_affiliate(p_tool_id UUID)
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
  WHERE ao.tool_id = p_tool_id
    AND ao.is_active = true
    AND (ao.expires_at IS NULL OR ao.expires_at > NOW())
  ORDER BY ao.priority DESC, ao.created_at ASC
  LIMIT 1;
END;
$$;

-- Function to log a click and increment counter (atomic)
CREATE OR REPLACE FUNCTION log_click(
  p_offer_id UUID,
  p_tool_id UUID,
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
    offer_id, tool_id, referrer, user_agent, ip_hash,
    country_code, source_page, source_context_id
  )
  VALUES (
    p_offer_id, p_tool_id, p_referrer, p_user_agent, p_ip_hash,
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

-- ============================================================================
-- PART 4: HUNT QUEUE (CLI Worker Model)
-- Admin UI inserts rows, CLI worker polls and processes
-- ============================================================================

-- Hunt queue status enum
CREATE TYPE hunt_queue_status AS ENUM (
  'pending',      -- Waiting for worker
  'claimed',      -- Worker picked it up
  'processing',   -- Actively being processed
  'completed',    -- Successfully finished
  'failed'        -- Failed after max retries
);

CREATE TABLE hunt_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- What to hunt
  tool_name TEXT NOT NULL,
  context_title TEXT,                       -- Optional: creates contextual review
  category_slug TEXT,                       -- Optional: assigns to category

  -- Hunt configuration
  hunt_type TEXT DEFAULT 'full' CHECK (hunt_type IN ('full', 'refresh', 'price_only')),
  force_regenerate BOOLEAN DEFAULT false,   -- Ignore existing data, regenerate all

  -- Priority & scheduling
  priority INT DEFAULT 50 CHECK (priority >= 0 AND priority <= 100),
  scheduled_for TIMESTAMPTZ,                -- Don't process before this time
  deadline_at TIMESTAMPTZ,                  -- Alert if not done by this time

  -- Source tracking (how did this get queued?)
  source TEXT DEFAULT 'admin' CHECK (source IN (
    'admin',           -- Manual from admin UI
    'api',             -- External API request
    'suggestion',      -- Auto-suggested by system
    'competitor_scan', -- Found via competitor analysis
    'user_request',    -- User submitted tool
    'scheduled'        -- Scheduled refresh
  )),
  requested_by TEXT,                        -- Email or identifier

  -- Processing state
  status hunt_queue_status DEFAULT 'pending',
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 3,

  -- Worker tracking
  claimed_by TEXT,                          -- Worker identifier (hostname, process ID)
  claimed_at TIMESTAMPTZ,
  heartbeat_at TIMESTAMPTZ,                 -- Worker updates this periodically

  -- Results
  tool_id UUID REFERENCES tools(id) ON DELETE SET NULL,
  context_id UUID REFERENCES contexts(id) ON DELETE SET NULL,
  review_id UUID REFERENCES reviews(id) ON DELETE SET NULL,

  -- Error tracking
  error_message TEXT,
  error_details JSONB,                      -- Stack trace, API errors, etc.

  -- Performance metrics
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INT,
  tokens_used INT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queue operations
CREATE INDEX idx_hunt_queue_pending ON hunt_queue(priority DESC, created_at ASC)
  WHERE status = 'pending';
CREATE INDEX idx_hunt_queue_claimed ON hunt_queue(claimed_at)
  WHERE status IN ('claimed', 'processing');
CREATE INDEX idx_hunt_queue_scheduled ON hunt_queue(scheduled_for)
  WHERE status = 'pending' AND scheduled_for IS NOT NULL;
CREATE INDEX idx_hunt_queue_status ON hunt_queue(status);
CREATE INDEX idx_hunt_queue_tool_name ON hunt_queue(tool_name);

-- Partial unique index: prevent duplicate pending/processing hunts for same tool+context
CREATE UNIQUE INDEX idx_hunt_queue_no_duplicates
  ON hunt_queue(tool_name, COALESCE(context_title, ''))
  WHERE status IN ('pending', 'claimed', 'processing');

-- Function: Atomically claim next item from queue
CREATE OR REPLACE FUNCTION claim_hunt_queue_item(p_worker_id TEXT)
RETURNS hunt_queue
LANGUAGE plpgsql
AS $$
DECLARE
  claimed_item hunt_queue;
BEGIN
  -- Atomically claim the highest priority pending item
  UPDATE hunt_queue
  SET
    status = 'claimed',
    claimed_by = p_worker_id,
    claimed_at = NOW(),
    heartbeat_at = NOW(),
    attempts = attempts + 1,
    updated_at = NOW()
  WHERE id = (
    SELECT id FROM hunt_queue
    WHERE status = 'pending'
      AND (scheduled_for IS NULL OR scheduled_for <= NOW())
      AND attempts < max_attempts
    ORDER BY priority DESC, created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING * INTO claimed_item;

  RETURN claimed_item;
END;
$$;

-- Function: Mark hunt as started (processing)
CREATE OR REPLACE FUNCTION start_hunt(p_queue_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE hunt_queue
  SET
    status = 'processing',
    started_at = NOW(),
    heartbeat_at = NOW(),
    updated_at = NOW()
  WHERE id = p_queue_id;
END;
$$;

-- Function: Update heartbeat (worker is still alive)
CREATE OR REPLACE FUNCTION heartbeat_hunt(p_queue_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE hunt_queue
  SET heartbeat_at = NOW()
  WHERE id = p_queue_id;
END;
$$;

-- Function: Complete hunt successfully
CREATE OR REPLACE FUNCTION complete_hunt(
  p_queue_id UUID,
  p_tool_id UUID,
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
    tool_id = p_tool_id,
    context_id = p_context_id,
    review_id = p_review_id,
    tokens_used = p_tokens_used,
    completed_at = NOW(),
    duration_ms = EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000,
    updated_at = NOW()
  WHERE id = p_queue_id;
END;
$$;

-- Function: Fail hunt
CREATE OR REPLACE FUNCTION fail_hunt(
  p_queue_id UUID,
  p_error TEXT,
  p_error_details JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_attempts INT;
  v_max_attempts INT;
BEGIN
  -- Get current attempts
  SELECT attempts, max_attempts INTO v_attempts, v_max_attempts
  FROM hunt_queue WHERE id = p_queue_id;

  -- If max attempts reached, mark as failed; otherwise back to pending for retry
  UPDATE hunt_queue
  SET
    status = CASE WHEN v_attempts >= v_max_attempts THEN 'failed'::hunt_queue_status ELSE 'pending'::hunt_queue_status END,
    error_message = p_error,
    error_details = p_error_details,
    claimed_by = NULL,
    claimed_at = NULL,
    completed_at = CASE WHEN v_attempts >= v_max_attempts THEN NOW() ELSE NULL END,
    updated_at = NOW()
  WHERE id = p_queue_id;
END;
$$;

-- Function: Release stale claims (worker died)
CREATE OR REPLACE FUNCTION release_stale_hunt_claims(p_stale_minutes INT DEFAULT 10)
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  released_count INT;
BEGIN
  UPDATE hunt_queue
  SET
    status = 'pending',
    claimed_by = NULL,
    claimed_at = NULL,
    error_message = 'Released: worker heartbeat timeout',
    updated_at = NOW()
  WHERE status IN ('claimed', 'processing')
    AND heartbeat_at < NOW() - (p_stale_minutes || ' minutes')::INTERVAL;

  GET DIAGNOSTICS released_count = ROW_COUNT;
  RETURN released_count;
END;
$$;

-- ============================================================================
-- PART 5: VIEWS FOR ADMIN DASHBOARD
-- ============================================================================

-- Affiliate performance view
CREATE OR REPLACE VIEW affiliate_performance AS
SELECT
  ao.id,
  ao.tool_id,
  t.name AS tool_name,
  t.slug AS tool_slug,
  ao.network,
  ao.priority,
  ao.is_affiliate,
  ao.is_active,
  ao.click_count,
  ao.last_click_at,
  ao.expires_at,
  -- Daily clicks (last 7 days)
  (SELECT COUNT(*) FROM click_events ce
   WHERE ce.offer_id = ao.id
   AND ce.clicked_at > NOW() - INTERVAL '7 days') AS clicks_7d,
  -- Daily clicks (last 30 days)
  (SELECT COUNT(*) FROM click_events ce
   WHERE ce.offer_id = ao.id
   AND ce.clicked_at > NOW() - INTERVAL '30 days') AS clicks_30d
FROM affiliate_offers ao
JOIN tools t ON ao.tool_id = t.id
ORDER BY ao.click_count DESC;

-- Hunt queue dashboard view
CREATE OR REPLACE VIEW hunt_queue_dashboard AS
SELECT
  hq.*,
  t.name AS resolved_tool_name,
  t.slug AS resolved_tool_slug,
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
LEFT JOIN tools t ON hq.tool_id = t.id
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

-- Queue statistics
CREATE OR REPLACE VIEW hunt_queue_stats AS
SELECT
  COUNT(*) FILTER (WHERE status = 'pending') AS pending_count,
  COUNT(*) FILTER (WHERE status = 'claimed') AS claimed_count,
  COUNT(*) FILTER (WHERE status = 'processing') AS processing_count,
  COUNT(*) FILTER (WHERE status = 'completed') AS completed_count,
  COUNT(*) FILTER (WHERE status = 'failed') AS failed_count,
  COUNT(*) FILTER (WHERE status = 'completed' AND completed_at > NOW() - INTERVAL '24 hours') AS completed_24h,
  COUNT(*) FILTER (WHERE status = 'failed' AND completed_at > NOW() - INTERVAL '24 hours') AS failed_24h,
  AVG(duration_ms) FILTER (WHERE status = 'completed') AS avg_duration_ms,
  AVG(tokens_used) FILTER (WHERE status = 'completed') AS avg_tokens
FROM hunt_queue;

-- Market state freshness view
CREATE OR REPLACE VIEW market_state_freshness AS
SELECT
  ms.*,
  t.name AS tool_name,
  t.slug AS tool_slug,
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
JOIN tools t ON ms.tool_id = t.id
ORDER BY ms.last_verified_at ASC;

-- ============================================================================
-- PART 6: ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE market_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE click_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE hunt_queue ENABLE ROW LEVEL SECURITY;

-- Public read access for market data
CREATE POLICY "Public read market_state" ON market_state FOR SELECT USING (true);
CREATE POLICY "Public read price_history" ON price_history FOR SELECT USING (true);

-- No public access to click events or hunt queue
CREATE POLICY "No public click_events" ON click_events FOR ALL USING (false);
CREATE POLICY "No public hunt_queue" ON hunt_queue FOR ALL USING (false);

-- ============================================================================
-- PART 7: GRANTS
-- ============================================================================

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION get_priority_affiliate TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION log_click TO anon, service_role;
GRANT EXECUTE ON FUNCTION claim_hunt_queue_item TO service_role;
GRANT EXECUTE ON FUNCTION start_hunt TO service_role;
GRANT EXECUTE ON FUNCTION heartbeat_hunt TO service_role;
GRANT EXECUTE ON FUNCTION complete_hunt TO service_role;
GRANT EXECUTE ON FUNCTION fail_hunt TO service_role;
GRANT EXECUTE ON FUNCTION release_stale_hunt_claims TO service_role;

-- ============================================================================
-- PART 8: UPDATED_AT TRIGGERS
-- ============================================================================

CREATE TRIGGER trigger_market_state_updated_at
  BEFORE UPDATE ON market_state
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_hunt_queue_updated_at
  BEFORE UPDATE ON hunt_queue
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
