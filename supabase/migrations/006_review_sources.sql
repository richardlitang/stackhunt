-- ============================================================================
-- REVIEW SOURCES: Store search results used to generate reviews
-- ============================================================================

-- Add sources column to reviews table
-- Stores array of source objects: [{url, title, snippet, domain}]
ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS sources JSONB DEFAULT '[]'::jsonb;

-- Add index for querying by domain (if needed later)
CREATE INDEX IF NOT EXISTS idx_reviews_sources ON reviews USING GIN (sources);

-- Comment for documentation
COMMENT ON COLUMN reviews.sources IS 'Array of source objects used to generate this review. Each object contains: url, title, snippet, domain';

-- Update the admin review queue view to include sources
CREATE OR REPLACE VIEW admin_review_queue AS
SELECT
  r.id,
  r.status,
  r.score,
  r.summary_markdown,
  r.pros,
  r.cons,
  r.sentiment_tags,
  r.sources,
  r.created_at,
  t.name AS tool_name,
  t.slug AS tool_slug,
  t.logo_url AS tool_logo,
  ctx.title AS context_title,
  ctx.slug AS context_slug
FROM reviews r
JOIN tools t ON r.tool_id = t.id
LEFT JOIN contexts ctx ON r.context_id = ctx.id
WHERE r.status IN ('draft', 'review')
ORDER BY r.created_at DESC;
