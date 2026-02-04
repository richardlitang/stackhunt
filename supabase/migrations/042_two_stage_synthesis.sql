-- ============================================================================
-- MIGRATION 042: Two-Stage Synthesis Pipeline
--
-- Decouples research from synthesis for batch cost optimization:
-- 1. research_complete status for items awaiting synthesis
-- 2. detected_category for batch grouping
-- 3. batch_id for tracking synthesis batches
-- 4. RPCs for batch readiness and stale item detection
--
-- Cost reduction: ~$0.44/tool → ~$0.044/tool (10x savings)
--
-- NOTE: Applied as two migrations due to Postgres enum limitation:
-- - 042a: two_stage_synthesis_enum (enum + columns)
-- - 042b: two_stage_synthesis_rpcs (indexes, functions, views)
-- ============================================================================

-- ============================================================================
-- Part 1: Enum and Column Updates
-- ============================================================================

-- Add research_complete status to hunt_queue_status enum
ALTER TYPE hunt_queue_status ADD VALUE IF NOT EXISTS 'research_complete' AFTER 'processing';

-- Add columns for batch tracking
ALTER TABLE hunt_queue
  ADD COLUMN IF NOT EXISTS detected_category TEXT,
  ADD COLUMN IF NOT EXISTS batch_id UUID,
  ADD COLUMN IF NOT EXISTS research_completed_at TIMESTAMPTZ;

-- ============================================================================
-- Part 2: Indexes (applied in separate transaction after enum commit)
-- ============================================================================

-- Index for efficient batch grouping queries
CREATE INDEX IF NOT EXISTS idx_hunt_queue_synthesis_ready
  ON hunt_queue(detected_category, status)
  WHERE status = 'research_complete';

-- Index for tracking batch processing
CREATE INDEX IF NOT EXISTS idx_hunt_queue_batch_id
  ON hunt_queue(batch_id)
  WHERE batch_id IS NOT NULL;

-- ============================================================================
-- Part 3: RPCs for Batch Synthesis
-- ============================================================================

-- Get categories ready for batch synthesis (≥threshold tools)
CREATE OR REPLACE FUNCTION get_synthesis_ready_groups(threshold INT DEFAULT 5)
RETURNS TABLE (
  category TEXT,
  tool_count BIGINT,
  tool_ids UUID[],
  tool_names TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    hq.detected_category AS category,
    COUNT(*) AS tool_count,
    ARRAY_AGG(hq.id ORDER BY hq.priority DESC, hq.created_at) AS tool_ids,
    ARRAY_AGG(hq.tool_name ORDER BY hq.priority DESC, hq.created_at) AS tool_names
  FROM hunt_queue hq
  WHERE hq.status = 'research_complete'
    AND hq.detected_category IS NOT NULL
  GROUP BY hq.detected_category
  HAVING COUNT(*) >= threshold
  ORDER BY COUNT(*) DESC;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_synthesis_ready_groups(INT) IS
'Returns categories that have reached the batch threshold for synthesis.
Default threshold is 5 tools per category. Returns tool IDs ordered by priority.';

-- Get stale items (>threshold days in research_complete)
CREATE OR REPLACE FUNCTION get_stale_research_items(days_threshold INT DEFAULT 7)
RETURNS TABLE (
  id UUID,
  tool_name TEXT,
  detected_category TEXT,
  research_completed_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    hq.id,
    hq.tool_name,
    hq.detected_category,
    hq.research_completed_at
  FROM hunt_queue hq
  WHERE hq.status = 'research_complete'
    AND hq.research_completed_at < NOW() - (days_threshold || ' days')::INTERVAL
  ORDER BY hq.research_completed_at ASC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_stale_research_items(INT) IS
'Returns items stuck in research_complete status for more than the threshold days.
These items should be processed individually via Gemini Flash fallback.';

-- ============================================================================
-- Part 4: Dashboard View
-- ============================================================================

CREATE OR REPLACE VIEW batch_synthesis_status AS
SELECT
  detected_category AS category,
  COUNT(*) FILTER (WHERE status = 'research_complete') AS pending_synthesis,
  COUNT(*) FILTER (WHERE status = 'completed' AND batch_id IS NOT NULL) AS batch_completed,
  COUNT(*) FILTER (WHERE status = 'completed' AND batch_id IS NULL) AS individual_completed,
  MIN(research_completed_at) FILTER (WHERE status = 'research_complete') AS oldest_pending,
  COUNT(*) FILTER (
    WHERE status = 'research_complete'
    AND research_completed_at < NOW() - INTERVAL '7 days'
  ) AS stale_count
FROM hunt_queue
WHERE detected_category IS NOT NULL
GROUP BY detected_category
ORDER BY pending_synthesis DESC;

COMMENT ON VIEW batch_synthesis_status IS
'Dashboard view showing batch synthesis readiness by category.';

-- ============================================================================
-- Column Comments
-- ============================================================================

COMMENT ON COLUMN hunt_queue.detected_category IS
'Category slug detected during research phase. Used for grouping similar tools for batch synthesis.';

COMMENT ON COLUMN hunt_queue.batch_id IS
'UUID linking items processed together in a synthesis batch.
NULL for items processed individually. Set when batch synthesis begins.';

COMMENT ON COLUMN hunt_queue.research_completed_at IS
'Timestamp when research phase completed and item entered research_complete status.
Used for fallthrough logic: items >7 days old trigger individual synthesis.';
