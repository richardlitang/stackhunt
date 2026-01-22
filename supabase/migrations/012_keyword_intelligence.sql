-- ============================================================================
-- KEYWORD INTELLIGENCE SYSTEM
-- Extends Strategy Gatekeeper for Ahrefs-style data import and performance tracking
-- ============================================================================

-- ============================================================================
-- PART 1: EXTEND CONTENT_IDEAS FOR FULL AHREFS SUPPORT
-- ============================================================================

-- Keyword classification type
CREATE TYPE keyword_type AS ENUM (
  'best_list',      -- "best crm software" → context discovery
  'comparison',     -- "notion vs obsidian" → two-tool comparison
  'alternatives',   -- "figma alternatives" → tool + competitors
  'single_tool',    -- "figma pricing" → single tool hunt
  'informational',  -- "how to use figma" → skip (no commercial intent)
  'skip'            -- Low quality, filtered out
);

-- Add Ahrefs-specific columns to content_ideas
ALTER TABLE content_ideas
  ADD COLUMN IF NOT EXISTS parent_keyword TEXT,
  ADD COLUMN IF NOT EXISTS keyword_type keyword_type,
  ADD COLUMN IF NOT EXISTS extracted_tools JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS clicks INT,
  ADD COLUMN IF NOT EXISTS clicks_per_search NUMERIC(4,2),
  ADD COLUMN IF NOT EXISTS return_rate NUMERIC(4,2),
  ADD COLUMN IF NOT EXISTS filtered_reason TEXT,
  ADD COLUMN IF NOT EXISTS ai_classification JSONB;

-- Index for grouping by parent keyword
CREATE INDEX IF NOT EXISTS idx_content_ideas_parent ON content_ideas(parent_keyword)
  WHERE parent_keyword IS NOT NULL;

-- Index for filtering by type
CREATE INDEX IF NOT EXISTS idx_content_ideas_type ON content_ideas(keyword_type)
  WHERE keyword_type IS NOT NULL;

-- Index for finding unclassified keywords
CREATE INDEX IF NOT EXISTS idx_content_ideas_unclassified ON content_ideas(created_at)
  WHERE keyword_type IS NULL AND status = 'pending';

COMMENT ON COLUMN content_ideas.parent_keyword IS 'Ahrefs parent keyword - groups related searches';
COMMENT ON COLUMN content_ideas.keyword_type IS 'AI-classified type: best_list, comparison, alternatives, etc.';
COMMENT ON COLUMN content_ideas.extracted_tools IS 'Tool names extracted from keyword by AI, e.g. ["Notion", "Obsidian"]';
COMMENT ON COLUMN content_ideas.clicks IS 'Actual monthly clicks (from Ahrefs)';
COMMENT ON COLUMN content_ideas.clicks_per_search IS 'Clicks per search ratio (from Ahrefs)';
COMMENT ON COLUMN content_ideas.return_rate IS 'Search return rate (from Ahrefs)';
COMMENT ON COLUMN content_ideas.filtered_reason IS 'Why this keyword was filtered out (too difficult, low volume, etc.)';
COMMENT ON COLUMN content_ideas.ai_classification IS 'Full AI classification response for debugging';

-- ============================================================================
-- PART 2: KEYWORD PERFORMANCE TRACKING
-- Time-series data for validating our predictions
-- ============================================================================

CREATE TABLE keyword_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What we're tracking
  keyword TEXT NOT NULL,
  context_id UUID REFERENCES contexts(id) ON DELETE SET NULL,
  target_url TEXT,  -- The URL we're tracking (e.g., /best/crm-for-startups)

  -- Performance metrics
  rank INT,                    -- Search ranking position (1-100+)
  impressions INT,             -- GSC impressions
  clicks INT,                  -- GSC clicks
  ctr NUMERIC(5,4),            -- Click-through rate

  -- Comparison to prediction
  predicted_priority NUMERIC,  -- What we predicted (snapshot from content_ideas.roi_score)

  -- Source and timing
  source TEXT DEFAULT 'gsc' CHECK (source IN ('gsc', 'ahrefs', 'semrush', 'manual')),
  period_start DATE,           -- Start of measurement period
  period_end DATE,             -- End of measurement period
  recorded_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure no duplicate records for same keyword+period+source
  CONSTRAINT unique_performance_record UNIQUE (keyword, period_start, period_end, source)
);

CREATE INDEX idx_keyword_performance_keyword ON keyword_performance(keyword);
CREATE INDEX idx_keyword_performance_context ON keyword_performance(context_id);
CREATE INDEX idx_keyword_performance_recorded ON keyword_performance(recorded_at DESC);
CREATE INDEX idx_keyword_performance_period ON keyword_performance(period_start, period_end);

COMMENT ON TABLE keyword_performance IS 'Tracks search rankings and traffic over time to validate ROI predictions';

-- ============================================================================
-- PART 3: IMPORT THRESHOLDS (Settings)
-- ============================================================================

CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default import thresholds
INSERT INTO system_settings (key, value, description) VALUES
  ('keyword_import_thresholds', '{
    "min_volume": 50,
    "max_difficulty": 70,
    "min_cpc": 0.10,
    "skip_informational": true
  }', 'Thresholds for filtering Ahrefs keyword imports'),
  ('priority_weights', '{
    "volume_weight": 1.0,
    "cpc_weight": 10.0,
    "difficulty_penalty": 1.0,
    "type_multipliers": {
      "best_list": 1.5,
      "comparison": 1.3,
      "alternatives": 1.2,
      "single_tool": 1.0
    }
  }', 'Weights for calculating keyword priority scores')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- PART 4: IMPROVED PRIORITY CALCULATION
-- ============================================================================

-- Calculate priority score for a keyword
CREATE OR REPLACE FUNCTION calculate_keyword_priority(
  p_volume INT,
  p_difficulty INT,
  p_cpc NUMERIC,
  p_keyword_type keyword_type DEFAULT 'single_tool'
)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_weights JSONB;
  v_volume_weight NUMERIC;
  v_cpc_weight NUMERIC;
  v_difficulty_penalty NUMERIC;
  v_type_multiplier NUMERIC;
  v_base_score NUMERIC;
BEGIN
  -- Get weights from settings
  SELECT value INTO v_weights
  FROM system_settings
  WHERE key = 'priority_weights';

  -- Use defaults if settings not found
  IF v_weights IS NULL THEN
    v_weights := '{
      "volume_weight": 1.0,
      "cpc_weight": 10.0,
      "difficulty_penalty": 1.0,
      "type_multipliers": {"best_list": 1.5, "comparison": 1.3, "alternatives": 1.2, "single_tool": 1.0}
    }'::jsonb;
  END IF;

  v_volume_weight := (v_weights->>'volume_weight')::numeric;
  v_cpc_weight := (v_weights->>'cpc_weight')::numeric;
  v_difficulty_penalty := (v_weights->>'difficulty_penalty')::numeric;
  v_type_multiplier := COALESCE(
    (v_weights->'type_multipliers'->>p_keyword_type::text)::numeric,
    1.0
  );

  -- Formula: (Volume * CPC_normalized) / (Difficulty + 10) * Type_multiplier
  -- +10 to difficulty to avoid division by zero and reduce impact of very low difficulty
  v_base_score := (
    (COALESCE(p_volume, 0) * v_volume_weight) *
    (COALESCE(p_cpc, 0.1) * v_cpc_weight)
  ) / (COALESCE(p_difficulty, 0) * v_difficulty_penalty + 10);

  RETURN ROUND(v_base_score * v_type_multiplier, 2);
END;
$$;

-- ============================================================================
-- PART 5: FILTER FUNCTION FOR IMPORT
-- ============================================================================

-- Check if a keyword passes import thresholds
CREATE OR REPLACE FUNCTION should_import_keyword(
  p_volume INT,
  p_difficulty INT,
  p_cpc NUMERIC,
  p_keyword_type keyword_type DEFAULT NULL
)
RETURNS TABLE (
  should_import BOOLEAN,
  filter_reason TEXT
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_thresholds JSONB;
  v_min_volume INT;
  v_max_difficulty INT;
  v_min_cpc NUMERIC;
  v_skip_informational BOOLEAN;
BEGIN
  -- Get thresholds from settings
  SELECT value INTO v_thresholds
  FROM system_settings
  WHERE key = 'keyword_import_thresholds';

  -- Use defaults if settings not found
  IF v_thresholds IS NULL THEN
    v_thresholds := '{"min_volume": 50, "max_difficulty": 70, "min_cpc": 0.10, "skip_informational": true}'::jsonb;
  END IF;

  v_min_volume := (v_thresholds->>'min_volume')::int;
  v_max_difficulty := (v_thresholds->>'max_difficulty')::int;
  v_min_cpc := (v_thresholds->>'min_cpc')::numeric;
  v_skip_informational := (v_thresholds->>'skip_informational')::boolean;

  -- Check each threshold
  IF COALESCE(p_volume, 0) < v_min_volume THEN
    RETURN QUERY SELECT false, format('Volume too low: %s < %s', COALESCE(p_volume, 0), v_min_volume);
    RETURN;
  END IF;

  IF COALESCE(p_difficulty, 0) > v_max_difficulty THEN
    RETURN QUERY SELECT false, format('Difficulty too high: %s > %s', COALESCE(p_difficulty, 0), v_max_difficulty);
    RETURN;
  END IF;

  IF COALESCE(p_cpc, 0) < v_min_cpc THEN
    RETURN QUERY SELECT false, format('CPC too low: %s < %s (no commercial intent)', COALESCE(p_cpc, 0), v_min_cpc);
    RETURN;
  END IF;

  IF v_skip_informational AND p_keyword_type = 'informational' THEN
    RETURN QUERY SELECT false, 'Informational keyword (no commercial intent)';
    RETURN;
  END IF;

  IF p_keyword_type = 'skip' THEN
    RETURN QUERY SELECT false, 'Marked as skip by classifier';
    RETURN;
  END IF;

  -- Passed all checks
  RETURN QUERY SELECT true, NULL::text;
END;
$$;

-- ============================================================================
-- PART 6: BULK IMPORT FUNCTION
-- ============================================================================

-- Import a batch of keywords from Ahrefs CSV
CREATE OR REPLACE FUNCTION import_ahrefs_keywords(
  p_keywords JSONB,  -- Array of {keyword, difficulty, volume, cpc, clicks, cps, return_rate, parent_keyword}
  p_batch_id UUID,
  p_apply_filters BOOLEAN DEFAULT true
)
RETURNS TABLE (
  imported INT,
  filtered INT,
  duplicates INT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_imported INT := 0;
  v_filtered INT := 0;
  v_duplicates INT := 0;
  v_keyword JSONB;
  v_should_import BOOLEAN;
  v_filter_reason TEXT;
  v_existing_id UUID;
BEGIN
  FOR v_keyword IN SELECT * FROM jsonb_array_elements(p_keywords)
  LOOP
    -- Check for existing keyword
    SELECT id INTO v_existing_id
    FROM content_ideas
    WHERE keyword = v_keyword->>'keyword'
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
      v_duplicates := v_duplicates + 1;
      CONTINUE;
    END IF;

    -- Check filters if enabled
    IF p_apply_filters THEN
      SELECT si.should_import, si.filter_reason
      INTO v_should_import, v_filter_reason
      FROM should_import_keyword(
        (v_keyword->>'volume')::int,
        (v_keyword->>'difficulty')::int,
        (v_keyword->>'cpc')::numeric,
        NULL  -- Type not yet classified
      ) si;

      IF NOT v_should_import THEN
        -- Insert but mark as filtered
        INSERT INTO content_ideas (
          keyword, search_volume, keyword_difficulty, cpc,
          clicks, clicks_per_search, return_rate, parent_keyword,
          status, filtered_reason, import_batch_id, source
        ) VALUES (
          v_keyword->>'keyword',
          (v_keyword->>'volume')::int,
          (v_keyword->>'difficulty')::int,
          (v_keyword->>'cpc')::numeric,
          (v_keyword->>'clicks')::int,
          (v_keyword->>'cps')::numeric,
          (v_keyword->>'return_rate')::numeric,
          v_keyword->>'parent_keyword',
          'rejected',
          v_filter_reason,
          p_batch_id,
          'ahrefs'
        );
        v_filtered := v_filtered + 1;
        CONTINUE;
      END IF;
    END IF;

    -- Import the keyword
    INSERT INTO content_ideas (
      keyword, search_volume, keyword_difficulty, cpc,
      clicks, clicks_per_search, return_rate, parent_keyword,
      status, import_batch_id, source
    ) VALUES (
      v_keyword->>'keyword',
      (v_keyword->>'volume')::int,
      (v_keyword->>'difficulty')::int,
      (v_keyword->>'cpc')::numeric,
      (v_keyword->>'clicks')::int,
      (v_keyword->>'cps')::numeric,
      (v_keyword->>'return_rate')::numeric,
      v_keyword->>'parent_keyword',
      'pending',
      p_batch_id,
      'ahrefs'
    );
    v_imported := v_imported + 1;
  END LOOP;

  RETURN QUERY SELECT v_imported, v_filtered, v_duplicates;
END;
$$;

-- ============================================================================
-- PART 7: CLASSIFICATION UPDATE FUNCTION
-- ============================================================================

-- Update keyword classification after AI processing
CREATE OR REPLACE FUNCTION update_keyword_classification(
  p_idea_id UUID,
  p_keyword_type keyword_type,
  p_extracted_tools JSONB,
  p_tool_name TEXT DEFAULT NULL,
  p_context_query TEXT DEFAULT NULL,
  p_ai_response JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_volume INT;
  v_difficulty INT;
  v_cpc NUMERIC;
  v_priority NUMERIC;
BEGIN
  -- Get current metrics for priority calculation
  SELECT search_volume, keyword_difficulty, cpc
  INTO v_volume, v_difficulty, v_cpc
  FROM content_ideas WHERE id = p_idea_id;

  -- Calculate new priority with type multiplier
  v_priority := calculate_keyword_priority(v_volume, v_difficulty, v_cpc, p_keyword_type);

  -- Update the record
  UPDATE content_ideas SET
    keyword_type = p_keyword_type,
    extracted_tools = p_extracted_tools,
    tool_name = COALESCE(p_tool_name, tool_name),
    context_query = COALESCE(p_context_query, context_query),
    roi_score = v_priority,
    ai_classification = p_ai_response,
    updated_at = NOW()
  WHERE id = p_idea_id;
END;
$$;

-- ============================================================================
-- PART 8: PERFORMANCE ANALYSIS VIEW
-- ============================================================================

-- Compare predicted priority vs actual performance
CREATE OR REPLACE VIEW keyword_roi_analysis AS
SELECT
  ci.id,
  ci.keyword,
  ci.keyword_type,
  ci.roi_score AS predicted_priority,
  ci.search_volume,
  ci.keyword_difficulty,
  ci.cpc,
  c.slug AS context_slug,
  -- Latest performance data
  kp.rank AS current_rank,
  kp.impressions,
  kp.clicks AS actual_clicks,
  kp.ctr,
  -- ROI validation
  CASE
    WHEN kp.rank IS NOT NULL AND kp.rank <= 10 THEN 'top_10'
    WHEN kp.rank IS NOT NULL AND kp.rank <= 20 THEN 'top_20'
    WHEN kp.rank IS NOT NULL AND kp.rank <= 50 THEN 'top_50'
    WHEN kp.rank IS NOT NULL THEN 'ranked'
    ELSE 'not_ranked'
  END AS rank_bucket,
  -- Did our prediction work?
  CASE
    WHEN ci.roi_score >= 100 AND kp.rank <= 10 THEN 'accurate_high'
    WHEN ci.roi_score >= 50 AND kp.rank <= 20 THEN 'accurate_medium'
    WHEN ci.roi_score < 50 AND (kp.rank IS NULL OR kp.rank > 50) THEN 'accurate_low'
    WHEN ci.roi_score >= 100 AND (kp.rank IS NULL OR kp.rank > 20) THEN 'overestimated'
    WHEN ci.roi_score < 50 AND kp.rank <= 20 THEN 'underestimated'
    ELSE 'inconclusive'
  END AS prediction_accuracy
FROM content_ideas ci
LEFT JOIN contexts c ON ci.context_query = c.title
LEFT JOIN LATERAL (
  SELECT * FROM keyword_performance kp2
  WHERE kp2.keyword = ci.keyword
  ORDER BY kp2.recorded_at DESC
  LIMIT 1
) kp ON true
WHERE ci.status = 'queued' OR ci.status = 'approved';

-- ============================================================================
-- PART 9: GRANTS
-- ============================================================================

GRANT SELECT ON system_settings TO anon, authenticated;
GRANT ALL ON system_settings TO service_role;

GRANT SELECT ON keyword_performance TO anon, authenticated;
GRANT ALL ON keyword_performance TO service_role;

GRANT EXECUTE ON FUNCTION calculate_keyword_priority TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION should_import_keyword TO service_role;
GRANT EXECUTE ON FUNCTION import_ahrefs_keywords TO service_role;
GRANT EXECUTE ON FUNCTION update_keyword_classification TO service_role;

-- ============================================================================
-- PART 10: RLS
-- ============================================================================

ALTER TABLE keyword_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read keyword_performance" ON keyword_performance FOR SELECT USING (true);
CREATE POLICY "Public read system_settings" ON system_settings FOR SELECT USING (true);
