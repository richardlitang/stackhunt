-- ============================================================================
-- DATA QUALITY & OBSERVABILITY
-- Implements validation tracking, metrics, and fast duplicate detection
-- ============================================================================

-- ============================================================================
-- PART 1: FAST DUPLICATE DETECTION (pg_trgm)
-- Replace O(n) in-memory check with indexed fuzzy search
-- ============================================================================

-- Enable trigram similarity extension for fuzzy matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create trigram index on items.name for fast fuzzy search
CREATE INDEX IF NOT EXISTS items_name_trgm_idx
  ON items USING gin (name gin_trgm_ops);

-- Create trigram index on items.website hostname for duplicate detection
CREATE INDEX IF NOT EXISTS items_website_hostname_idx
  ON items (lower(substring(website from '(?:https?://)?(?:www\.)?([^/]+)')));

-- Function: Fast duplicate check using trigram similarity
CREATE OR REPLACE FUNCTION find_duplicate_item(
  p_tool_name TEXT,
  p_website_url TEXT DEFAULT NULL,
  p_similarity_threshold REAL DEFAULT 0.9
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  website TEXT,
  similarity_score REAL
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  WITH name_matches AS (
    -- Find by name similarity
    SELECT
      i.id,
      i.name,
      i.website,
      similarity(lower(i.name), lower(p_tool_name)) AS sim_score
    FROM items i
    WHERE similarity(lower(i.name), lower(p_tool_name)) > p_similarity_threshold
    ORDER BY sim_score DESC
    LIMIT 5
  ),
  website_matches AS (
    -- Find by website hostname match (if provided)
    SELECT
      i.id,
      i.name,
      i.website,
      1.0::REAL AS sim_score  -- Exact match = 1.0
    FROM items i
    WHERE p_website_url IS NOT NULL
      AND lower(substring(i.website from '(?:https?://)?(?:www\.)?([^/]+)')) =
          lower(substring(p_website_url from '(?:https?://)?(?:www\.)?([^/]+)'))
    LIMIT 1
  )
  -- Return website matches first (higher confidence), then name matches
  SELECT * FROM website_matches
  UNION ALL
  SELECT * FROM name_matches
  WHERE NOT EXISTS (SELECT 1 FROM website_matches)
  ORDER BY similarity_score DESC
  LIMIT 1;
END;
$$;

-- ============================================================================
-- PART 2: METRICS TABLE (Quality tracking, no external service needed)
-- ============================================================================

CREATE TABLE pipeline_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Metric identification
  metric_type TEXT NOT NULL,  -- 'hunt_duration', 'api_latency', 'qa_score', 'phase_success'
  metric_value NUMERIC NOT NULL,

  -- Context (flexible JSONB for different metric types)
  tags JSONB DEFAULT '{}'::JSONB,
  -- Examples:
  -- {phase: 'research', service: 'serper', status: 'success'}
  -- {phase: 'analysis', tool_category: 'crm', qa_score: 75}

  -- Timestamps
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast aggregation
CREATE INDEX idx_pipeline_metrics_type_time
  ON pipeline_metrics(metric_type, recorded_at DESC);

CREATE INDEX idx_pipeline_metrics_tags
  ON pipeline_metrics USING gin(tags);

-- Useful queries (add as comments for reference):
COMMENT ON TABLE pipeline_metrics IS
'Pipeline observability without external services.

Common queries:

-- Success rate by phase (last 24h)
SELECT
  tags->>''phase'' AS phase,
  COUNT(*) FILTER (WHERE tags->>''status'' = ''success'')::float / COUNT(*) AS success_rate
FROM pipeline_metrics
WHERE metric_type = ''phase_completion''
  AND recorded_at > NOW() - INTERVAL ''24 hours''
GROUP BY phase;

-- P95 API latency (last 7 days)
SELECT
  tags->>''service'' AS service,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY metric_value) AS p95_ms,
  PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY metric_value) AS p50_ms
FROM pipeline_metrics
WHERE metric_type = ''api_latency''
  AND recorded_at > NOW() - INTERVAL ''7 days''
GROUP BY service;

-- Average QA score by category
SELECT
  tags->>''category'' AS category,
  AVG(metric_value) AS avg_qa_score,
  COUNT(*) AS sample_size
FROM pipeline_metrics
WHERE metric_type = ''qa_score''
  AND recorded_at > NOW() - INTERVAL ''30 days''
GROUP BY category
ORDER BY avg_qa_score DESC;

-- Data quality trend (daily)
SELECT
  DATE(recorded_at) AS date,
  AVG(metric_value) AS avg_qa_score,
  COUNT(*) AS hunts
FROM pipeline_metrics
WHERE metric_type = ''qa_score''
  AND recorded_at > NOW() - INTERVAL ''90 days''
GROUP BY DATE(recorded_at)
ORDER BY date DESC;
';

-- ============================================================================
-- PART 3: VALIDATION TRACKING (Enforce quality gates)
-- ============================================================================

-- Store validation results for each hunt
CREATE TABLE hunt_validations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- What was validated
  queue_item_id UUID REFERENCES hunt_queue(id) ON DELETE CASCADE,
  tool_id UUID REFERENCES items(id) ON DELETE CASCADE,
  validation_type TEXT NOT NULL,  -- 'knowledge_card', 'analysis', 'review'

  -- Validation results
  is_valid BOOLEAN NOT NULL,
  quality_score INT NOT NULL CHECK (quality_score >= 0 AND quality_score <= 100),
  should_publish BOOLEAN NOT NULL,
  human_review_required BOOLEAN NOT NULL,

  -- Issues found
  validations JSONB DEFAULT '[]'::JSONB,
  -- Format: [
  --   {field: 'company.founded_year', severity: 'error', message: 'Year out of range'},
  --   {field: 'pros', severity: 'warning', message: 'No pros extracted'}
  -- ]

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_hunt_validations_queue ON hunt_validations(queue_item_id);
CREATE INDEX idx_hunt_validations_tool ON hunt_validations(tool_id);
CREATE INDEX idx_hunt_validations_quality ON hunt_validations(quality_score);
CREATE INDEX idx_hunt_validations_review_required
  ON hunt_validations(human_review_required, created_at DESC)
  WHERE human_review_required = true;

-- ============================================================================
-- PART 4: EMBEDDING VERSIONING (Track model/strategy changes)
-- ============================================================================

-- Add embedding_version to items table
ALTER TABLE items
  ADD COLUMN IF NOT EXISTS embedding_version TEXT DEFAULT 'v1',
  ADD COLUMN IF NOT EXISTS embedding_model TEXT DEFAULT 'gemini-embedding-001';

-- Create index for finding items needing re-embedding
CREATE INDEX idx_items_embedding_version
  ON items(embedding_version, updated_at);

COMMENT ON COLUMN items.embedding_version IS
'Tracks embedding strategy version (e.g., "v1", "v2-functional-anchor").
Allows safe migration when changing embedding approach.';

COMMENT ON COLUMN items.embedding_model IS
'Tracks which embedding model was used (e.g., "gemini-embedding-001", "text-embedding-3-small").
Allows identifying items needing re-embedding after model upgrades.';

-- ============================================================================
-- PART 5: CIRCUIT BREAKER STATE (Optional, for admin dashboard)
-- ============================================================================

-- Track circuit breaker state history for debugging
CREATE TABLE circuit_breaker_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  service TEXT NOT NULL,  -- 'gemini', 'serper'
  event_type TEXT NOT NULL,  -- 'opened', 'closed', 'half_open', 'rejected'

  -- State at time of event
  failure_count INT,
  success_count INT,
  state TEXT,  -- 'open', 'closed', 'half_open'

  -- Context
  error_message TEXT,

  occurred_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_circuit_breaker_events_service
  ON circuit_breaker_events(service, occurred_at DESC);

-- ============================================================================
-- PART 6: MATERIALIZED VIEWS FOR DASHBOARDS (Postgres-based, no external service)
-- ============================================================================

-- Quality dashboard: Current state of all tools
CREATE MATERIALIZED VIEW quality_dashboard AS
SELECT
  i.id,
  i.name,
  i.slug,
  i.is_published,
  i.updated_at,
  i.embedding_version,

  -- Latest validation results
  (
    SELECT quality_score
    FROM hunt_validations hv
    WHERE hv.tool_id = i.id
    ORDER BY hv.created_at DESC
    LIMIT 1
  ) AS latest_qa_score,

  (
    SELECT human_review_required
    FROM hunt_validations hv
    WHERE hv.tool_id = i.id
    ORDER BY hv.created_at DESC
    LIMIT 1
  ) AS needs_review,

  -- Review count
  (SELECT COUNT(*) FROM reviews r WHERE r.item_id = i.id) AS review_count,

  -- Data completeness signals
  CASE
    WHEN specs->>'company' IS NULL THEN false
    WHEN specs->'company'->>'name' IS NULL THEN false
    ELSE true
  END AS has_company_info,

  CASE
    WHEN specs->>'features' IS NULL THEN false
    WHEN jsonb_array_length(specs->'features'->'core') = 0 THEN false
    ELSE true
  END AS has_features

FROM items i
WHERE i.type = 'tool';

CREATE INDEX idx_quality_dashboard_qa_score
  ON quality_dashboard(latest_qa_score NULLS LAST);

CREATE INDEX idx_quality_dashboard_needs_review
  ON quality_dashboard(needs_review)
  WHERE needs_review = true;

COMMENT ON MATERIALIZED VIEW quality_dashboard IS
'Refresh periodically: REFRESH MATERIALIZED VIEW quality_dashboard;
Provides quick overview of data quality across all tools.';

-- ============================================================================
-- PART 7: HELPER FUNCTIONS
-- ============================================================================

-- Function: Log a metric (helper for TypeScript)
CREATE OR REPLACE FUNCTION log_metric(
  p_metric_type TEXT,
  p_metric_value NUMERIC,
  p_tags JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_metric_id UUID;
BEGIN
  INSERT INTO pipeline_metrics (metric_type, metric_value, tags)
  VALUES (p_metric_type, p_metric_value, p_tags)
  RETURNING id INTO v_metric_id;

  RETURN v_metric_id;
END;
$$;

-- Function: Get quality metrics for admin dashboard
CREATE OR REPLACE FUNCTION get_quality_metrics(
  p_days INT DEFAULT 7
)
RETURNS TABLE (
  total_hunts BIGINT,
  avg_qa_score NUMERIC,
  publish_rate NUMERIC,
  human_review_rate NUMERIC,
  validations_by_severity JSONB
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_hunts,
    AVG(quality_score)::NUMERIC(5,2) AS avg_qa_score,
    (COUNT(*) FILTER (WHERE should_publish)::NUMERIC / COUNT(*))::NUMERIC(4,3) AS publish_rate,
    (COUNT(*) FILTER (WHERE human_review_required)::NUMERIC / COUNT(*))::NUMERIC(4,3) AS human_review_rate,
    jsonb_build_object(
      'errors', COUNT(*) FILTER (WHERE NOT is_valid),
      'warnings', (
        SELECT COUNT(*)
        FROM hunt_validations hv2, jsonb_array_elements(hv2.validations) v
        WHERE hv2.created_at > NOW() - (p_days || ' days')::INTERVAL
          AND v->>'severity' = 'warning'
      )
    ) AS validations_by_severity
  FROM hunt_validations
  WHERE created_at > NOW() - (p_days || ' days')::INTERVAL;
END;
$$;

-- ============================================================================
-- PART 8: RLS POLICIES
-- ============================================================================

ALTER TABLE pipeline_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE hunt_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE circuit_breaker_events ENABLE ROW LEVEL SECURITY;

-- No public access (admin/service role only)
CREATE POLICY "No public pipeline_metrics" ON pipeline_metrics FOR ALL USING (false);
CREATE POLICY "No public hunt_validations" ON hunt_validations FOR ALL USING (false);
CREATE POLICY "No public circuit_breaker_events" ON circuit_breaker_events FOR ALL USING (false);

-- ============================================================================
-- PART 9: GRANTS
-- ============================================================================

GRANT EXECUTE ON FUNCTION find_duplicate_item TO service_role;
GRANT EXECUTE ON FUNCTION log_metric TO service_role;
GRANT EXECUTE ON FUNCTION get_quality_metrics TO service_role;
