-- ==========================================================================
-- MIGRATION 046: Defunct Processing Tracking
--
-- Adds defunct_processed_at to prevent reprocessing defunct queue items.
-- ==========================================================================

ALTER TABLE hunt_queue
  ADD COLUMN IF NOT EXISTS defunct_processed_at TIMESTAMPTZ;

COMMENT ON COLUMN hunt_queue.defunct_processed_at IS 'Timestamp when defunct item was handled by downstream consumer';
