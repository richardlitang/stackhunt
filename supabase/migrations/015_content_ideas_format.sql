-- ============================================================================
-- MIGRATION 015: Content Ideas Format Enhancement
-- Adds pillar, target_audience, content_type, and priority columns
-- for LLM brainstorm imports
-- ============================================================================

-- ============================================================================
-- STEP 1: ADD PILLAR COLUMN
-- ============================================================================

ALTER TABLE content_ideas
  ADD COLUMN IF NOT EXISTS pillar TEXT;

-- Add check constraint for valid pillars
ALTER TABLE content_ideas
  DROP CONSTRAINT IF EXISTS valid_pillar;

ALTER TABLE content_ideas
  ADD CONSTRAINT valid_pillar CHECK (
    pillar IS NULL OR pillar IN ('builder', 'creative', 'growth', 'operations')
  );

-- ============================================================================
-- STEP 1B: ADD TARGET AUDIENCE COLUMN
-- ============================================================================

-- Maps to existing audience categories in Knowledge Graph
ALTER TABLE content_ideas
  ADD COLUMN IF NOT EXISTS target_audience TEXT;

-- Valid audiences (matches categories where type='audience')
ALTER TABLE content_ideas
  DROP CONSTRAINT IF EXISTS valid_target_audience;

ALTER TABLE content_ideas
  ADD CONSTRAINT valid_target_audience CHECK (
    target_audience IS NULL OR target_audience IN (
      'freelancers', 'solopreneurs', 'small-teams', 'agencies',
      'startups', 'enterprise', 'developers', 'designers',
      'marketers', 'content-creators', 'consultants', 'coaches',
      'remote-teams', 'sales-teams', 'finance-teams', 'students',
      'non-profits', 'virtual-assistants', 'creatives', 'founders'
    )
  );

-- ============================================================================
-- STEP 1C: ADD CONTENT TYPE COLUMN
-- ============================================================================

-- Tells the Hunter what type of page to create
ALTER TABLE content_ideas
  ADD COLUMN IF NOT EXISTS content_type TEXT DEFAULT 'listicle';

ALTER TABLE content_ideas
  DROP CONSTRAINT IF EXISTS valid_content_type;

ALTER TABLE content_ideas
  ADD CONSTRAINT valid_content_type CHECK (
    content_type IS NULL OR content_type IN (
      'listicle',      -- "Best X for Y" ranked list
      'comparison',    -- "X vs Y" head-to-head
      'alternatives',  -- "X Alternatives"
      'single_tool',   -- Deep dive on one tool
      'roundup'        -- Broader category overview
    )
  );

-- ============================================================================
-- STEP 2: ADD PRIORITY COLUMN (Numeric: higher = more important)
-- ============================================================================

-- Priority scale: 0-100 (default 50)
-- 90-100: Critical/urgent
-- 70-89: High priority
-- 50-69: Medium priority (default)
-- 30-49: Low priority
-- 0-29: Backlog

ALTER TABLE content_ideas
  ADD COLUMN IF NOT EXISTS priority INT DEFAULT 50;

-- Add check constraint for valid priority range
ALTER TABLE content_ideas
  DROP CONSTRAINT IF EXISTS valid_priority;

ALTER TABLE content_ideas
  ADD CONSTRAINT valid_priority CHECK (
    priority IS NULL OR (priority >= 0 AND priority <= 100)
  );

-- ============================================================================
-- STEP 3: ADD SOURCE_FORMAT COLUMN (Track import format type)
-- ============================================================================

-- Tracks which CSV format was used for import
ALTER TABLE content_ideas
  ADD COLUMN IF NOT EXISTS source_format TEXT DEFAULT 'simple';

-- Valid formats: 'llm_brainstorm', 'ahrefs', 'competitor', 'simple'
ALTER TABLE content_ideas
  DROP CONSTRAINT IF EXISTS valid_source_format;

ALTER TABLE content_ideas
  ADD CONSTRAINT valid_source_format CHECK (
    source_format IS NULL OR source_format IN ('llm_brainstorm', 'ahrefs', 'competitor', 'simple')
  );

-- ============================================================================
-- STEP 4: INDEX FOR PRIORITY SORTING
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_content_ideas_priority
  ON content_ideas (priority DESC, roi_score DESC NULLS LAST)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_content_ideas_pillar
  ON content_ideas (pillar)
  WHERE pillar IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_content_ideas_audience
  ON content_ideas (target_audience)
  WHERE target_audience IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_content_ideas_content_type
  ON content_ideas (content_type)
  WHERE content_type IS NOT NULL;

-- ============================================================================
-- STEP 5: UPDATE WAR ROOM VIEW
-- ============================================================================

CREATE OR REPLACE VIEW strategy_war_room AS
SELECT
  ci.id,
  ci.keyword,
  ci.tool_name,
  ci.context_query,
  ci.content_type,
  ci.pillar,
  ci.target_audience,
  ci.priority,
  ci.search_volume,
  ci.keyword_difficulty,
  ci.cpc,
  ci.roi_score,
  ci.is_duplicate,
  ci.duplicate_reason,
  ci.status,
  ci.source,
  ci.source_format,
  ci.source_file,
  ci.notes,
  ci.created_at,
  -- Priority tier display
  CASE
    WHEN ci.priority >= 90 THEN 'critical'
    WHEN ci.priority >= 70 THEN 'high'
    WHEN ci.priority >= 50 THEN 'medium'
    WHEN ci.priority >= 30 THEN 'low'
    ELSE 'backlog'
  END as priority_tier,
  -- Status emoji
  CASE
    WHEN ci.is_duplicate THEN 'duplicate'
    WHEN ci.roi_score IS NULL AND ci.priority >= 70 THEN 'high_priority_pending'
    WHEN ci.roi_score IS NULL THEN 'analyzing'
    WHEN ci.roi_score >= 10 THEN 'high_roi'
    WHEN ci.roi_score >= 5 THEN 'approved'
    WHEN ci.roi_score >= 2 THEN 'review_needed'
    ELSE 'low_roi'
  END as status_tier,
  -- Link to duplicate if exists
  t.name as duplicate_tool_name,
  t.slug as duplicate_tool_slug
FROM content_ideas ci
LEFT JOIN tools t ON ci.duplicate_tool_id = t.id
WHERE ci.status = 'pending'
ORDER BY ci.priority DESC, ci.roi_score DESC NULLS LAST;

-- ============================================================================
-- STEP 6: HELPER FUNCTION - Convert text priority to number
-- ============================================================================

CREATE OR REPLACE FUNCTION text_to_priority(p_text TEXT)
RETURNS INT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN CASE LOWER(TRIM(p_text))
    WHEN 'critical' THEN 95
    WHEN 'urgent' THEN 90
    WHEN 'high' THEN 80
    WHEN 'medium' THEN 50
    WHEN 'low' THEN 30
    WHEN 'backlog' THEN 10
    ELSE
      -- Try to parse as number
      CASE
        WHEN p_text ~ '^\d+$' THEN LEAST(GREATEST(p_text::INT, 0), 100)
        ELSE 50  -- Default
      END
  END;
END;
$$;

-- ============================================================================
-- STEP 7: COMMENTS
-- ============================================================================

COMMENT ON COLUMN content_ideas.pillar IS 'Category pillar: builder, creative, growth, operations';
COMMENT ON COLUMN content_ideas.target_audience IS 'Target audience slug (maps to Knowledge Graph audience categories): freelancers, agencies, startups, etc.';
COMMENT ON COLUMN content_ideas.content_type IS 'Content type: listicle (Best X), comparison (X vs Y), alternatives (X Alternatives), single_tool, roundup';
COMMENT ON COLUMN content_ideas.priority IS 'Priority 0-100 (higher = more important). 90+=critical, 70+=high, 50+=medium, 30+=low, <30=backlog';
COMMENT ON COLUMN content_ideas.source_format IS 'Import format: llm_brainstorm, ahrefs, competitor, simple';
COMMENT ON FUNCTION text_to_priority IS 'Converts text priority (high/medium/low) to numeric (0-100)';
