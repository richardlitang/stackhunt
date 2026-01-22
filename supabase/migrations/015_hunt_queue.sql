-- =================================================================
-- MIGRATION 015: Hunt Queue Enhancements
-- Adds tool_url column and helper functions for queue management
-- Note: hunt_queue table already exists from previous migrations
-- =================================================================

-- =================================================================
-- ENHANCE EXISTING hunt_queue TABLE
-- =================================================================

-- Add tool_url column if it doesn't exist (for CSV uploads)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hunt_queue' AND column_name = 'tool_url'
  ) THEN
    ALTER TABLE hunt_queue ADD COLUMN tool_url TEXT;
    CREATE INDEX idx_hunt_queue_url ON hunt_queue(tool_url);
  END IF;
END $$;

-- =================================================================
-- FUNCTION: Claim next job with atomic locking
-- Returns null if no jobs available
-- Adapted to work with existing hunt_queue schema
-- =================================================================

CREATE OR REPLACE FUNCTION claim_next_hunt_job(p_worker_id TEXT)
RETURNS TABLE (
  id UUID,
  tool_name TEXT,
  tool_url TEXT,
  category_slug TEXT,
  context_title TEXT,
  attempts INT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  UPDATE hunt_queue
  SET
    status = 'processing'::hunt_queue_status,
    claimed_by = p_worker_id,
    claimed_at = NOW(),
    heartbeat_at = NOW(),
    started_at = NOW()
  WHERE hunt_queue.id = (
    SELECT hunt_queue.id
    FROM hunt_queue
    WHERE status = 'pending'::hunt_queue_status
    ORDER BY priority DESC, created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING
    hunt_queue.id,
    hunt_queue.tool_name,
    hunt_queue.tool_url,
    hunt_queue.category_slug,
    hunt_queue.context_title,
    hunt_queue.attempts;
END;
$$;

-- =================================================================
-- FUNCTION: Mark job as completed
-- Adapted to work with existing hunt_queue schema
-- =================================================================

CREATE OR REPLACE FUNCTION complete_hunt_job(
  p_job_id UUID,
  p_tool_id UUID,
  p_context_id UUID DEFAULT NULL,
  p_review_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE hunt_queue
  SET
    status = 'completed'::hunt_queue_status,
    completed_at = NOW(),
    tool_id = p_tool_id,
    context_id = p_context_id,
    review_id = p_review_id,
    error_message = NULL,
    duration_ms = EXTRACT(EPOCH FROM (NOW() - started_at))::INT * 1000
  WHERE id = p_job_id;
END;
$$;

-- =================================================================
-- FUNCTION: Mark job as failed (with retry logic)
-- Adapted to work with existing hunt_queue schema
-- =================================================================

CREATE OR REPLACE FUNCTION fail_hunt_job(
  p_job_id UUID,
  p_error_message TEXT,
  p_error_details JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_attempts INT;
  v_max_attempts INT;
BEGIN
  -- Get current retry info
  SELECT attempts, max_attempts
  INTO v_current_attempts, v_max_attempts
  FROM hunt_queue
  WHERE id = p_job_id;

  -- Increment attempt count
  v_current_attempts := v_current_attempts + 1;

  -- If we can still retry, reset to pending
  IF v_current_attempts < v_max_attempts THEN
    UPDATE hunt_queue
    SET
      status = 'pending'::hunt_queue_status,
      attempts = v_current_attempts,
      error_message = p_error_message,
      error_details = p_error_details,
      claimed_by = NULL,
      claimed_at = NULL,
      heartbeat_at = NULL
    WHERE id = p_job_id;
  ELSE
    -- Max attempts reached, mark as failed
    UPDATE hunt_queue
    SET
      status = 'failed'::hunt_queue_status,
      attempts = v_current_attempts,
      error_message = p_error_message,
      error_details = p_error_details,
      completed_at = NOW(),
      duration_ms = EXTRACT(EPOCH FROM (NOW() - started_at))::INT * 1000
    WHERE id = p_job_id;
  END IF;
END;
$$;

-- =================================================================
-- FUNCTION: Recover stale jobs (processing for >10 minutes)
-- Returns count of recovered jobs
-- Adapted to work with existing hunt_queue schema
-- =================================================================

CREATE OR REPLACE FUNCTION recover_stale_hunt_jobs()
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  v_recovered_count INT;
BEGIN
  WITH stale_jobs AS (
    UPDATE hunt_queue
    SET
      status = 'pending'::hunt_queue_status,
      claimed_by = NULL,
      claimed_at = NULL,
      heartbeat_at = NULL,
      error_message = 'Job timed out and was recovered'
    WHERE status IN ('processing'::hunt_queue_status, 'claimed'::hunt_queue_status)
      AND (
        (heartbeat_at IS NOT NULL AND heartbeat_at < NOW() - INTERVAL '10 minutes')
        OR (claimed_at IS NOT NULL AND heartbeat_at IS NULL AND claimed_at < NOW() - INTERVAL '10 minutes')
      )
    RETURNING id
  )
  SELECT COUNT(*) INTO v_recovered_count FROM stale_jobs;

  RETURN v_recovered_count;
END;
$$;

-- =================================================================
-- FUNCTION: Get queue statistics
-- Adapted to work with existing hunt_queue schema
-- =================================================================

CREATE OR REPLACE FUNCTION get_hunt_queue_stats()
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_pending INT;
  v_claimed INT;
  v_processing INT;
  v_completed INT;
  v_failed INT;
BEGIN
  SELECT
    COUNT(*) FILTER (WHERE status = 'pending'::hunt_queue_status),
    COUNT(*) FILTER (WHERE status = 'claimed'::hunt_queue_status),
    COUNT(*) FILTER (WHERE status = 'processing'::hunt_queue_status),
    COUNT(*) FILTER (WHERE status = 'completed'::hunt_queue_status),
    COUNT(*) FILTER (WHERE status = 'failed'::hunt_queue_status)
  INTO v_pending, v_claimed, v_processing, v_completed, v_failed
  FROM hunt_queue;

  RETURN jsonb_build_object(
    'pending', COALESCE(v_pending, 0),
    'claimed', COALESCE(v_claimed, 0),
    'processing', COALESCE(v_processing, 0),
    'completed', COALESCE(v_completed, 0),
    'failed', COALESCE(v_failed, 0),
    'total', COALESCE(v_pending, 0) + COALESCE(v_claimed, 0) + COALESCE(v_processing, 0) +
             COALESCE(v_completed, 0) + COALESCE(v_failed, 0)
  );
END;
$$;

-- =================================================================
-- GRANTS
-- =================================================================

-- Ensure service_role has proper permissions
GRANT SELECT, INSERT, UPDATE ON hunt_queue TO service_role;
GRANT EXECUTE ON FUNCTION claim_next_hunt_job(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION complete_hunt_job(UUID, UUID, UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION fail_hunt_job(UUID, TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION recover_stale_hunt_jobs() TO service_role;
GRANT EXECUTE ON FUNCTION get_hunt_queue_stats() TO service_role;
