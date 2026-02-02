-- Dead Letter Queue Support for Hunt Queue
-- Adds classification of failure reasons for better debugging and monitoring

-- Add DLQ columns to hunt_queue table
ALTER TABLE hunt_queue
  ADD COLUMN IF NOT EXISTS dlq_reason TEXT CHECK (dlq_reason IN (
    'rate_limit_exhausted',
    'auth_error',
    'quota_exceeded',
    'validation_failed',
    'timeout',
    'network_error',
    'content_blocked',
    'insufficient_data',
    'circuit_open',
    'unknown'
  )),
  ADD COLUMN IF NOT EXISTS dlq_at TIMESTAMPTZ;

-- Index for querying failed items by reason
CREATE INDEX IF NOT EXISTS idx_hunt_queue_dlq
  ON hunt_queue(dlq_reason, dlq_at DESC)
  WHERE status = 'failed';

-- Update fail_hunt RPC to accept dlq_reason parameter
CREATE OR REPLACE FUNCTION fail_hunt(
  p_queue_id UUID,
  p_error TEXT,
  p_error_details JSONB DEFAULT NULL,
  p_dlq_reason TEXT DEFAULT 'unknown'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE hunt_queue
  SET
    status = 'failed',
    error = p_error,
    error_details = p_error_details,
    dlq_reason = p_dlq_reason,
    dlq_at = NOW(),
    updated_at = NOW()
  WHERE id = p_queue_id;
END;
$$;

COMMENT ON FUNCTION fail_hunt IS 'Mark hunt queue item as failed with DLQ classification';
COMMENT ON COLUMN hunt_queue.dlq_reason IS 'Classified reason for failure (for Dead Letter Queue monitoring)';
COMMENT ON COLUMN hunt_queue.dlq_at IS 'Timestamp when item was moved to DLQ';
