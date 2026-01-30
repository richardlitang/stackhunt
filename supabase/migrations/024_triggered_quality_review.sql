-- ============================================================================
-- MIGRATION 024: Triggered Quality Review System
--
-- Implements smart, cost-efficient quality reviews:
-- 1. Adds quality_review_needed flag to tools
-- 2. Auto-flags tools when correction/feedback thresholds are reached
-- 3. Tracks review history and reasons
--
-- Design: Only spend AI tokens on content with problem signals
-- ============================================================================

-- ============================================================================
-- PART 1: ADD QUALITY REVIEW FIELDS TO TOOLS
-- ============================================================================

ALTER TABLE tools
  ADD COLUMN IF NOT EXISTS quality_review_needed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS quality_review_reason TEXT,
  ADD COLUMN IF NOT EXISTS quality_review_flagged_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS quality_review_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS quality_review_result TEXT CHECK (
    quality_review_result IS NULL OR
    quality_review_result IN ('improved', 'verified_ok', 'needs_manual', 'skipped')
  ),
  ADD COLUMN IF NOT EXISTS correction_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS confirmed_correction_count INT DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_tools_quality_review_needed
  ON tools(quality_review_flagged_at)
  WHERE quality_review_needed = TRUE;

COMMENT ON COLUMN tools.quality_review_needed IS 'Flag for tools needing AI quality evaluation';
COMMENT ON COLUMN tools.quality_review_reason IS 'Why this tool was flagged: corrections_threshold, confirmed_correction, low_votes, manual';
COMMENT ON COLUMN tools.correction_count IS 'Total corrections submitted for this tool (denormalized for performance)';
COMMENT ON COLUMN tools.confirmed_correction_count IS 'Corrections confirmed by AI verification';

-- ============================================================================
-- PART 2: FUNCTION TO UPDATE TOOL CORRECTION COUNTS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_tool_correction_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_count INT;
  v_confirmed_count INT;
  v_threshold INT := 2; -- Flag after 2+ corrections
BEGIN
  -- Get current counts for this tool
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE ai_verification_result = 'confirmed')
  INTO v_total_count, v_confirmed_count
  FROM corrections
  WHERE tool_id = COALESCE(NEW.tool_id, OLD.tool_id);

  -- Update the tool's denormalized counts
  UPDATE tools
  SET
    correction_count = v_total_count,
    confirmed_correction_count = v_confirmed_count
  WHERE id = COALESCE(NEW.tool_id, OLD.tool_id);

  -- Check if we should flag for quality review
  -- Trigger 1: 2+ total corrections on same tool
  IF v_total_count >= v_threshold THEN
    UPDATE tools
    SET
      quality_review_needed = TRUE,
      quality_review_reason = COALESCE(quality_review_reason, 'corrections_threshold'),
      quality_review_flagged_at = COALESCE(quality_review_flagged_at, NOW())
    WHERE id = COALESCE(NEW.tool_id, OLD.tool_id)
      AND quality_review_needed = FALSE;
  END IF;

  -- Trigger 2: Any confirmed correction = immediate flag
  IF TG_OP = 'UPDATE' AND NEW.ai_verification_result = 'confirmed' THEN
    UPDATE tools
    SET
      quality_review_needed = TRUE,
      quality_review_reason = 'confirmed_correction',
      quality_review_flagged_at = COALESCE(quality_review_flagged_at, NOW())
    WHERE id = NEW.tool_id
      AND quality_review_needed = FALSE;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ============================================================================
-- PART 3: TRIGGER ON CORRECTIONS TABLE
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_update_tool_correction_counts ON corrections;
CREATE TRIGGER trigger_update_tool_correction_counts
  AFTER INSERT OR UPDATE OR DELETE ON corrections
  FOR EACH ROW
  EXECUTE FUNCTION update_tool_correction_counts();

-- ============================================================================
-- PART 4: FUNCTION TO FLAG TOOLS WITH LOW VOTE RATIOS
-- Called periodically (not on every vote for performance)
-- ============================================================================

CREATE OR REPLACE FUNCTION flag_low_vote_tools()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_flagged INT := 0;
BEGIN
  -- Flag tools where reviews have 3+ downvotes and downvotes > upvotes
  UPDATE tools t
  SET
    quality_review_needed = TRUE,
    quality_review_reason = 'low_votes',
    quality_review_flagged_at = NOW()
  FROM reviews r
  WHERE r.tool_id = t.id
    AND r.status = 'published'
    AND r.downvotes >= 3
    AND r.downvotes > r.upvotes
    AND t.quality_review_needed = FALSE;

  GET DIAGNOSTICS v_flagged = ROW_COUNT;
  RETURN v_flagged;
END;
$$;

-- ============================================================================
-- PART 5: FUNCTION TO GET TOOLS NEEDING QUALITY REVIEW
-- ============================================================================

CREATE OR REPLACE FUNCTION get_tools_needing_quality_review(
  p_limit INT DEFAULT 10
)
RETURNS TABLE (
  tool_id UUID,
  tool_name TEXT,
  tool_slug TEXT,
  review_reason TEXT,
  correction_count INT,
  confirmed_corrections INT,
  flagged_at TIMESTAMPTZ,
  days_since_flagged INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id AS tool_id,
    t.name AS tool_name,
    t.slug AS tool_slug,
    t.quality_review_reason AS review_reason,
    t.correction_count,
    t.confirmed_correction_count AS confirmed_corrections,
    t.quality_review_flagged_at AS flagged_at,
    EXTRACT(DAY FROM NOW() - t.quality_review_flagged_at)::INT AS days_since_flagged
  FROM tools t
  WHERE t.quality_review_needed = TRUE
    AND t.quality_review_completed_at IS NULL
  ORDER BY
    -- Priority: confirmed corrections first, then by flag date
    CASE WHEN t.quality_review_reason = 'confirmed_correction' THEN 0 ELSE 1 END,
    t.quality_review_flagged_at ASC
  LIMIT p_limit;
END;
$$;

-- ============================================================================
-- PART 6: FUNCTION TO MARK QUALITY REVIEW COMPLETE
-- ============================================================================

CREATE OR REPLACE FUNCTION complete_quality_review(
  p_tool_id UUID,
  p_result TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE tools
  SET
    quality_review_needed = FALSE,
    quality_review_completed_at = NOW(),
    quality_review_result = p_result
  WHERE id = p_tool_id;

  -- If result is 'improved', also reset correction counts
  IF p_result = 'improved' THEN
    UPDATE tools
    SET
      correction_count = 0,
      confirmed_correction_count = 0,
      quality_review_reason = NULL
    WHERE id = p_tool_id;
  END IF;
END;
$$;

-- ============================================================================
-- PART 7: VIEW FOR QUALITY REVIEW DASHBOARD
-- ============================================================================

CREATE OR REPLACE VIEW quality_review_queue AS
SELECT
  t.id,
  t.name,
  t.slug,
  t.quality_review_reason AS reason,
  t.correction_count,
  t.confirmed_correction_count AS confirmed_corrections,
  t.quality_review_flagged_at AS flagged_at,
  EXTRACT(DAY FROM NOW() - t.quality_review_flagged_at)::INT AS days_pending,
  -- Include recent corrections for context
  (
    SELECT jsonb_agg(jsonb_build_object(
      'id', c.id,
      'field', c.field_name,
      'text', LEFT(c.correction_text, 100),
      'ai_result', c.ai_verification_result,
      'created_at', c.created_at
    ) ORDER BY c.created_at DESC)
    FROM corrections c
    WHERE c.tool_id = t.id
    LIMIT 5
  ) AS recent_corrections
FROM tools t
WHERE t.quality_review_needed = TRUE
  AND t.quality_review_completed_at IS NULL
ORDER BY
  CASE WHEN t.quality_review_reason = 'confirmed_correction' THEN 0 ELSE 1 END,
  t.quality_review_flagged_at ASC;

-- Make view use invoker's permissions (security best practice)
ALTER VIEW quality_review_queue SET (security_invoker = on);

-- ============================================================================
-- PART 8: INITIALIZE CORRECTION COUNTS FOR EXISTING DATA
-- ============================================================================

-- Backfill correction counts from existing data
UPDATE tools t
SET
  correction_count = COALESCE(counts.total, 0),
  confirmed_correction_count = COALESCE(counts.confirmed, 0)
FROM (
  SELECT
    tool_id,
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE ai_verification_result = 'confirmed') AS confirmed
  FROM corrections
  GROUP BY tool_id
) counts
WHERE t.id = counts.tool_id;

-- Flag tools that already meet the threshold
UPDATE tools
SET
  quality_review_needed = TRUE,
  quality_review_reason = 'corrections_threshold',
  quality_review_flagged_at = NOW()
WHERE correction_count >= 2
  AND quality_review_needed = FALSE;

-- ============================================================================
-- PART 9: GRANTS
-- ============================================================================

GRANT EXECUTE ON FUNCTION update_tool_correction_counts TO service_role;
GRANT EXECUTE ON FUNCTION flag_low_vote_tools TO service_role;
GRANT EXECUTE ON FUNCTION get_tools_needing_quality_review TO service_role;
GRANT EXECUTE ON FUNCTION complete_quality_review TO service_role;
