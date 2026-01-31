-- Migration: Add parent/child relationship for bundled tools
-- Description: Allows items to reference other items (e.g., Google Meet → Google Workspace)
-- This enables single source of truth for suite pricing and ecosystem navigation

-- Add parent_id column with foreign key to self
ALTER TABLE items
ADD COLUMN parent_id UUID REFERENCES items(id) ON DELETE SET NULL;

-- Add index for performance when querying siblings
CREATE INDEX idx_items_parent_id ON items(parent_id);

-- Add comment for documentation
COMMENT ON COLUMN items.parent_id IS 'References parent suite for bundled tools (e.g., Google Meet → Google Workspace). NULL for standalone tools.';
