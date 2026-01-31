-- Migration: Community Verification System
-- Purpose: Track user price verifications and enable automatic re-queuing for outdated tools
-- Date: 2026-01-31

-- Add verification tracking columns to items table
ALTER TABLE items
  ADD COLUMN IF NOT EXISTS user_verifications_this_week INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_user_verified_at TIMESTAMPTZ;

-- Create price_verifications table
CREATE TABLE IF NOT EXISTS price_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  is_accurate BOOLEAN NOT NULL,
  ip_hash TEXT, -- Privacy-preserving hash of IP for deduplication
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Index for querying verifications by item
  CONSTRAINT fk_item FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_price_verifications_item_id
  ON price_verifications(item_id);

CREATE INDEX IF NOT EXISTS idx_price_verifications_created_at
  ON price_verifications(created_at DESC);

-- RPC function to increment weekly verifications (atomic operation)
CREATE OR REPLACE FUNCTION increment_weekly_verifications(p_item_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE items
  SET user_verifications_this_week = user_verifications_this_week + 1
  WHERE id = p_item_id;
END;
$$;

-- RPC function to reset weekly verification counters (call via cron job)
CREATE OR REPLACE FUNCTION reset_weekly_verifications()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE items
  SET user_verifications_this_week = 0;
END;
$$;

-- Comment on table
COMMENT ON TABLE price_verifications IS 'Community price verification votes to track data freshness and trigger re-hunts';
COMMENT ON COLUMN items.user_verifications_this_week IS 'Number of positive verification votes received this week';
COMMENT ON COLUMN items.last_user_verified_at IS 'Timestamp of most recent user verification (accurate vote)';
