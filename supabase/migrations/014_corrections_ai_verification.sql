-- =================================================================
-- MIGRATION 014: AI Verification for User Corrections
-- Adds fields to track AI verification status and batch processing
-- =================================================================

-- Add AI verification fields to corrections table
ALTER TABLE corrections
  ADD COLUMN IF NOT EXISTS ai_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ai_verification_result TEXT CHECK (
    ai_verification_result IS NULL OR
    ai_verification_result IN ('confirmed', 'rejected', 'inconclusive')
  ),
  ADD COLUMN IF NOT EXISTS ai_verification_notes TEXT,
  ADD COLUMN IF NOT EXISTS ai_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verification_batch_id UUID;

-- Index for efficient queries on pending corrections
CREATE INDEX IF NOT EXISTS idx_corrections_pending
  ON corrections(created_at)
  WHERE status = 'pending' AND ai_verified = FALSE;

-- Index for verification batch queries
CREATE INDEX IF NOT EXISTS idx_corrections_batch
  ON corrections(verification_batch_id)
  WHERE verification_batch_id IS NOT NULL;

-- =================================================================
-- VERIFICATION BATCHES TABLE
-- Tracks weekly verification runs
-- =================================================================

CREATE TABLE IF NOT EXISTS verification_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Batch info
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  -- Trigger conditions
  trigger_reason TEXT NOT NULL CHECK (
    trigger_reason IN ('threshold_reached', 'age_exceeded', 'manual')
  ),
  pending_count_at_start INT NOT NULL,
  oldest_correction_days INT,

  -- Results
  tools_checked INT DEFAULT 0,
  corrections_confirmed INT DEFAULT 0,
  corrections_rejected INT DEFAULT 0,
  corrections_inconclusive INT DEFAULT 0,

  -- Cost tracking
  tokens_used INT DEFAULT 0,

  -- Status
  status TEXT DEFAULT 'running' CHECK (
    status IN ('running', 'completed', 'failed', 'partial')
  ),
  error_message TEXT,

  -- Notification sent
  admin_notified BOOLEAN DEFAULT FALSE,
  notification_sent_at TIMESTAMPTZ
);

-- =================================================================
-- HELPER VIEWS
-- =================================================================

-- View for pending corrections grouped by tool
CREATE OR REPLACE VIEW corrections_by_tool AS
SELECT
  c.tool_id,
  t.name AS tool_name,
  t.slug AS tool_slug,
  t.website AS tool_website,
  COUNT(*) AS correction_count,
  MIN(c.created_at) AS oldest_correction,
  MAX(c.created_at) AS newest_correction,
  ARRAY_AGG(DISTINCT c.field_name) AS field_names,
  ARRAY_AGG(c.id) AS correction_ids
FROM corrections c
JOIN tools t ON c.tool_id = t.id
WHERE c.status = 'pending'
  AND c.ai_verified = FALSE
GROUP BY c.tool_id, t.name, t.slug, t.website
ORDER BY correction_count DESC, oldest_correction ASC;

-- =================================================================
-- FUNCTION: Get verification stats
-- =================================================================

CREATE OR REPLACE FUNCTION get_verification_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pending_count INT;
  v_oldest_days INT;
  v_unique_tools INT;
BEGIN
  -- Count pending corrections
  SELECT COUNT(*) INTO v_pending_count
  FROM corrections
  WHERE status = 'pending' AND ai_verified = FALSE;

  -- Get age of oldest correction in days
  SELECT EXTRACT(DAY FROM NOW() - MIN(created_at))::INT INTO v_oldest_days
  FROM corrections
  WHERE status = 'pending' AND ai_verified = FALSE;

  -- Count unique tools with pending corrections
  SELECT COUNT(DISTINCT tool_id) INTO v_unique_tools
  FROM corrections
  WHERE status = 'pending' AND ai_verified = FALSE;

  RETURN jsonb_build_object(
    'pending_count', COALESCE(v_pending_count, 0),
    'oldest_days', COALESCE(v_oldest_days, 0),
    'unique_tools', COALESCE(v_unique_tools, 0),
    'should_verify', (
      COALESCE(v_pending_count, 0) >= 50 OR
      COALESCE(v_oldest_days, 0) > 30
    )
  );
END;
$$;

-- =================================================================
-- GRANTS
-- =================================================================

GRANT EXECUTE ON FUNCTION get_verification_stats TO service_role;
