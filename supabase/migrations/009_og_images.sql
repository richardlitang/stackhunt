-- =================================================================
-- MIGRATION 009: OG Image Support
-- Add og_image_url column to tools table for AI-generated images
-- =================================================================

-- Add og_image_url column to tools
ALTER TABLE tools
ADD COLUMN IF NOT EXISTS og_image_url TEXT;

-- Add comment
COMMENT ON COLUMN tools.og_image_url IS 'URL to AI-generated OG image (via Replicate Flux)';

-- Create index for tools missing OG images (useful for batch generation)
CREATE INDEX IF NOT EXISTS idx_tools_missing_og_image
ON tools (created_at DESC)
WHERE og_image_url IS NULL;
