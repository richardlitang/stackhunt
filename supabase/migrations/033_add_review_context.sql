-- Migration 033: Add review_context column for V3.1 Tribal Knowledge
-- Date: 2026-01-31
-- Description: Adds review_context JSONB column to items table for storing
--              humanVerdict, budgetAnalyst, and userAdvocate data

-- Add review_context column to items table
ALTER TABLE items
ADD COLUMN IF NOT EXISTS review_context JSONB DEFAULT NULL;

-- Add comment explaining the structure
COMMENT ON COLUMN items.review_context IS 'V3.1 Tribal Knowledge: Contains humanVerdict (coffee shop speak), budgetAnalyst (cost drivers, TCO), and userAdvocate (vibe, ideal-for, avoid-if) extracted from Reddit, forums, and honest user reviews';

-- Create index for querying items with tribal knowledge
CREATE INDEX IF NOT EXISTS idx_items_has_review_context
ON items ((review_context IS NOT NULL))
WHERE review_context IS NOT NULL;

-- Example structure (for documentation):
-- {
--   "humanVerdict": "2-sentence coffee shop summary",
--   "budgetAnalyst": {
--     "costDrivers": ["SSO requires Enterprise", "Guests are billable"],
--     "oneTimeFees": ["Implementation fee"],
--     "commitmentTerms": "Annual only",
--     "roiThreshold": "Team of 20+"
--   },
--   "userAdvocate": {
--     "vibe": "Hacker Chic",
--     "originStory": "Started as game chat",
--     "idealFor": ["Solo founders", "Async-first teams"],
--     "avoidIf": ["Need offline access", "Hate keyboard shortcuts"],
--     "powerTip": "Use Cmd+K for quick actions",
--     "delighters": ["Smooth UX", "Fast search"],
--     "frustrations": ["Mobile app clunky", "No dark mode"]
--   }
-- }
