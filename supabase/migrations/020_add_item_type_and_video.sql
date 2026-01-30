-- ============================================================================
-- MIGRATION 020: Add Item Type and Video Support
-- Enables tool vs gear discrimination and YouTube embeds
-- ============================================================================

-- Create enum for item types
CREATE TYPE item_type AS ENUM ('tool', 'gear');

-- Add type column with default 'tool' for existing records
ALTER TABLE tools ADD COLUMN IF NOT EXISTS type item_type NOT NULL DEFAULT 'tool';

-- Add video_id for YouTube embeds
ALTER TABLE tools ADD COLUMN IF NOT EXISTS video_id TEXT;
ALTER TABLE tools ADD COLUMN IF NOT EXISTS video_title TEXT;

-- Index for filtering by type
CREATE INDEX IF NOT EXISTS idx_tools_type ON tools (type);

-- Comments
COMMENT ON COLUMN tools.type IS 'Discriminator: tool (software) or gear (hardware)';
COMMENT ON COLUMN tools.video_id IS 'YouTube video ID for embedded walkthrough/review';
