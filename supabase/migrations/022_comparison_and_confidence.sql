-- ============================================================================
-- MIGRATION 022: Comparison Infrastructure & Data Confidence
--
-- Implements:
-- 1. Data confidence scoring (hedge uncertain claims)
-- 2. Strict taxonomy for ideal_for/not_ideal_for (use categories, not freeform)
-- 3. Learning curve and migration difficulty on tools
-- 4. Comparison insights table (sparse, curated)
-- 5. Review enhancements for contextual fit
-- ============================================================================

-- ============================================================================
-- PART 1: DATA CONFIDENCE (Hedge uncertain claims)
-- ============================================================================

-- Add confidence score to tools
-- 0.0-1.0 where 1.0 = verified from official sources, 0.5 = AI-inferred
ALTER TABLE tools ADD COLUMN IF NOT EXISTS data_confidence NUMERIC(3,2)
  DEFAULT 0.5
  CHECK (data_confidence >= 0 AND data_confidence <= 1);

COMMENT ON COLUMN tools.data_confidence IS
  'Confidence in tool data accuracy. 1.0=verified official, 0.8=multiple sources, 0.5=AI-inferred. UI should hedge claims below 0.8';

-- ============================================================================
-- PART 2: STRICT TAXONOMY FOR AUDIENCES
-- Instead of freeform ideal_for[], use category references
-- This prevents "students" vs "academia" inconsistency
-- ============================================================================

-- Create junction table for tool-audience relationships
-- Uses existing categories table with type='audience'
CREATE TABLE IF NOT EXISTS item_audience_fit (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,

  -- Fit type: is this audience ideal or should avoid?
  fit_type TEXT NOT NULL CHECK (fit_type IN ('ideal', 'good', 'neutral', 'poor', 'avoid')),

  -- Optional: why this fit rating
  reason TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(item_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_item_audience_fit_item ON item_audience_fit(item_id);
CREATE INDEX IF NOT EXISTS idx_item_audience_fit_category ON item_audience_fit(category_id);
CREATE INDEX IF NOT EXISTS idx_item_audience_fit_type ON item_audience_fit(fit_type);

-- RLS
ALTER TABLE item_audience_fit ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read access" ON item_audience_fit;
CREATE POLICY "Public read access" ON item_audience_fit FOR SELECT USING (true);

COMMENT ON TABLE item_audience_fit IS
  'Links tools to audience categories with fit rating. Enforces taxonomy consistency.';

-- ============================================================================
-- PART 3: LEARNING CURVE & MIGRATION ENUMS
-- ============================================================================

-- Learning curve enum (create only if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'learning_curve') THEN
    CREATE TYPE learning_curve AS ENUM ('minutes', 'hours', 'days', 'weeks', 'months');
  END IF;
END$$;

-- Add to tools
ALTER TABLE tools ADD COLUMN IF NOT EXISTS learning_curve learning_curve;

COMMENT ON COLUMN tools.learning_curve IS 'Time to basic proficiency';

-- Migration difficulty is stored in specs JSONB as migration_out_difficulty (1-5)
-- No separate column needed

-- ============================================================================
-- PART 4: COMPARISON INSIGHTS (Sparse, Curated)
-- Only for high-traffic comparisons that need human insight
-- ============================================================================

CREATE TABLE IF NOT EXISTS comparison_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- The pair (MUST be alphabetically ordered to prevent duplicates)
  item_a_slug TEXT NOT NULL,
  item_b_slug TEXT NOT NULL,

  -- References (for FK integrity, but slugs for easy lookup)
  item_a_id UUID REFERENCES tools(id) ON DELETE CASCADE,
  item_b_id UUID REFERENCES tools(id) ON DELETE CASCADE,

  -- =====================
  -- CURATED INSIGHTS (Can't be computed)
  -- =====================

  -- One-line verdict
  verdict TEXT,  -- "Notion for teams, Obsidian for power users"

  -- Decision criteria (human-written)
  choose_a_if TEXT[] DEFAULT '{}',  -- ["You need real-time collaboration", "You want all-in-one"]
  choose_b_if TEXT[] DEFAULT '{}',  -- ["You want local-first", "You're a developer"]

  -- Migration nuances (tool-specific quirks that can't be computed)
  migration_notes_a_to_b TEXT,  -- "Notion databases become flat markdown files in Obsidian"
  migration_notes_b_to_a TEXT,

  -- Switching intelligence (from Reddit/forum research)
  why_switch_a_to_b TEXT[] DEFAULT '{}',  -- ["Wanted local-first", "Privacy concerns", "Faster"]
  why_switch_b_to_a TEXT[] DEFAULT '{}',  -- ["Needed team features", "Better mobile app"]

  -- Context-specific winners (can be partially computed but curated is better)
  -- { "students": { "winner": "a", "confidence": 0.9, "reason": "Free .edu plan" } }
  winner_by_context JSONB DEFAULT '{}'::jsonb,

  -- =====================
  -- METADATA
  -- =====================
  is_curated BOOLEAN DEFAULT false,       -- Human-reviewed
  curator_notes TEXT,                      -- Internal notes
  data_sources TEXT[] DEFAULT '{}',        -- ["reddit.com/r/...", "forum post"]

  generated_at TIMESTAMPTZ DEFAULT NOW(),
  curated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- =====================
  -- CONSTRAINTS
  -- =====================

  -- CRITICAL: Enforce alphabetical ordering to prevent duplicates
  -- "notion" vs "obsidian" and "obsidian" vs "notion" are the SAME comparison
  CONSTRAINT alphabetical_order CHECK (item_a_slug < item_b_slug),

  -- Unique pair
  CONSTRAINT unique_comparison_pair UNIQUE (item_a_slug, item_b_slug)
);

CREATE INDEX IF NOT EXISTS idx_comparison_insights_a ON comparison_insights(item_a_slug);
CREATE INDEX IF NOT EXISTS idx_comparison_insights_b ON comparison_insights(item_b_slug);
CREATE INDEX IF NOT EXISTS idx_comparison_insights_curated ON comparison_insights(is_curated) WHERE is_curated = true;

-- RLS
ALTER TABLE comparison_insights ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read access" ON comparison_insights;
CREATE POLICY "Public read access" ON comparison_insights FOR SELECT USING (true);

COMMENT ON TABLE comparison_insights IS
  'Sparse table for curated comparison insights. Most comparisons are computed from tool data.';
COMMENT ON CONSTRAINT alphabetical_order ON comparison_insights IS
  'Enforces item_a_slug < item_b_slug to prevent duplicate comparisons (notion-vs-obsidian = obsidian-vs-notion)';

-- ============================================================================
-- PART 5: HELPER FUNCTION - Get or Create Comparison
-- ============================================================================

CREATE OR REPLACE FUNCTION get_or_create_comparison(
  p_slug_1 TEXT,
  p_slug_2 TEXT
)
RETURNS comparison_insights
LANGUAGE plpgsql
AS $$
DECLARE
  v_slug_a TEXT;
  v_slug_b TEXT;
  v_result comparison_insights;
BEGIN
  -- Ensure alphabetical order
  IF p_slug_1 < p_slug_2 THEN
    v_slug_a := p_slug_1;
    v_slug_b := p_slug_2;
  ELSE
    v_slug_a := p_slug_2;
    v_slug_b := p_slug_1;
  END IF;

  -- Try to find existing
  SELECT * INTO v_result
  FROM comparison_insights
  WHERE item_a_slug = v_slug_a AND item_b_slug = v_slug_b;

  -- If not found, create empty shell
  IF NOT FOUND THEN
    INSERT INTO comparison_insights (item_a_slug, item_b_slug)
    VALUES (v_slug_a, v_slug_b)
    RETURNING * INTO v_result;
  END IF;

  RETURN v_result;
END;
$$;

-- ============================================================================
-- PART 6: REVIEW ENHANCEMENTS FOR CONTEXTUAL FIT
-- ============================================================================

-- Fit score: How well tool fits THIS context (separate from quality score)
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS fit_score INT
  CHECK (fit_score >= 0 AND fit_score <= 100);

-- Value rating for this audience's budget (1-5 stars)
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS value_rating INT
  CHECK (value_rating >= 1 AND value_rating <= 5);

-- Features especially relevant to this context
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS standout_features TEXT[] DEFAULT '{}';

-- Concerns that might be dealbreakers for this audience
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS dealbreakers TEXT[] DEFAULT '{}';

-- Common tools this audience switches FROM to this tool
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS switching_from TEXT[] DEFAULT '{}';

COMMENT ON COLUMN reviews.fit_score IS 'How well tool fits THIS context (0-100). Different from quality score.';
COMMENT ON COLUMN reviews.value_rating IS 'Value for money rating (1-5) for this audience budget level';
COMMENT ON COLUMN reviews.standout_features IS 'Features especially relevant to this context/audience';
COMMENT ON COLUMN reviews.dealbreakers IS 'Concerns that might be dealbreakers for this specific audience';
COMMENT ON COLUMN reviews.switching_from IS 'Common tools this audience switches FROM when adopting this tool';

-- ============================================================================
-- PART 7: GRANTS
-- ============================================================================

GRANT EXECUTE ON FUNCTION get_or_create_comparison TO service_role;

-- ============================================================================
-- PART 8: SEED ADDITIONAL AUDIENCE CATEGORIES
-- Ensures we have a good taxonomy for ideal_for matching
-- ============================================================================

INSERT INTO categories (name, slug, type, description, display_order) VALUES
  ('Writers', 'writers', 'audience', 'Content creators, bloggers, authors', 110),
  ('Researchers', 'researchers', 'audience', 'Academic researchers and analysts', 111),
  ('Product Managers', 'product-managers', 'audience', 'PMs and product teams', 112),
  ('Solopreneurs', 'solopreneurs', 'audience', 'Solo business owners', 113),
  ('Content Creators', 'content-creators', 'audience', 'YouTubers, podcasters, influencers', 114),
  ('Sales Teams', 'sales-teams', 'audience', 'Sales professionals and teams', 115),
  ('Consultants', 'consultants', 'audience', 'Independent consultants and advisors', 116),
  ('Educators', 'educators', 'audience', 'Teachers and course creators', 117),
  ('Healthcare', 'healthcare', 'audience', 'Medical professionals and clinics', 118),
  ('Legal', 'legal', 'audience', 'Law firms and legal professionals', 119)
ON CONFLICT (slug) DO NOTHING;
