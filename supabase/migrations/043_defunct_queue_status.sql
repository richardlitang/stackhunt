-- ==========================================================================
-- MIGRATION 043: Defunct Queue Status
--
-- Adds a dedicated "defunct" status for tools that are confirmed inactive.
-- This lets workers clear the main queue and allow a separate consumer to
-- handle defunct tools without marking hunts as failed.
-- ==========================================================================

-- Add defunct status to hunt_queue_status enum
ALTER TYPE hunt_queue_status ADD VALUE IF NOT EXISTS 'defunct' AFTER 'research_complete';

-- Add defunct metadata columns
ALTER TABLE hunt_queue
  ADD COLUMN IF NOT EXISTS defunct_status JSONB,
  ADD COLUMN IF NOT EXISTS defunct_checked_at TIMESTAMPTZ;

-- RPC: Mark hunt as defunct
CREATE OR REPLACE FUNCTION mark_hunt_defunct(
  p_queue_id UUID,
  p_defunct_status JSONB,
  p_tokens_used INT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE hunt_queue
  SET
    status = 'defunct'::hunt_queue_status,
    defunct_status = p_defunct_status,
    defunct_checked_at = NOW(),
    tokens_used = p_tokens_used,
    completed_at = NOW(),
    duration_ms = EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000,
    updated_at = NOW()
  WHERE id = p_queue_id;
END;
$$;

COMMENT ON FUNCTION mark_hunt_defunct IS 'Marks a hunt queue item as defunct with captured status details';
COMMENT ON COLUMN hunt_queue.defunct_status IS 'Defunct detection payload (reason, evidence, shutdown date)';
COMMENT ON COLUMN hunt_queue.defunct_checked_at IS 'Timestamp when defunct status was confirmed';

-- Update queue stats to include defunct
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
  v_defunct INT;
BEGIN
  SELECT
    COUNT(*) FILTER (WHERE status = 'pending'::hunt_queue_status),
    COUNT(*) FILTER (WHERE status = 'claimed'::hunt_queue_status),
    COUNT(*) FILTER (WHERE status = 'processing'::hunt_queue_status),
    COUNT(*) FILTER (WHERE status = 'completed'::hunt_queue_status),
    COUNT(*) FILTER (WHERE status = 'failed'::hunt_queue_status),
    COUNT(*) FILTER (WHERE status = 'defunct'::hunt_queue_status)
  INTO v_pending, v_claimed, v_processing, v_completed, v_failed, v_defunct
  FROM hunt_queue;

  RETURN jsonb_build_object(
    'pending', COALESCE(v_pending, 0),
    'claimed', COALESCE(v_claimed, 0),
    'processing', COALESCE(v_processing, 0),
    'completed', COALESCE(v_completed, 0),
    'failed', COALESCE(v_failed, 0),
    'defunct', COALESCE(v_defunct, 0),
    'total', COALESCE(v_pending, 0) + COALESCE(v_claimed, 0) + COALESCE(v_processing, 0) +
             COALESCE(v_completed, 0) + COALESCE(v_failed, 0) + COALESCE(v_defunct, 0)
  );
END;
$$;
