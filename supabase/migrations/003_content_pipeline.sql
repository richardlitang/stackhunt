-- ============================================================================
-- CONTENT PIPELINE: Automated Generation + Review Queue
-- ============================================================================

-- Content lifecycle states
CREATE TYPE content_status AS ENUM (
  'draft',      -- AI generated, awaiting review
  'review',     -- Flagged for closer inspection
  'published',  -- Live on site
  'rejected'    -- Rejected by reviewer (kept for audit)
);

-- Queue item states
CREATE TYPE queue_status AS ENUM (
  'pending',     -- Waiting to be processed
  'processing',  -- Currently being hunted
  'completed',   -- Successfully generated draft
  'failed',      -- Hunt failed
  'skipped'      -- Manually skipped
);

-- ============================================================================
-- CONTENT QUEUE TABLE
-- The "To-Do List" for the automated hunter
-- ============================================================================

CREATE TABLE content_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Target specification
  tool_name TEXT NOT NULL,
  context_title TEXT,              -- Optional: creates a contextual review
  category_slug TEXT,              -- Optional: assigns to category

  -- Scheduling
  priority INT DEFAULT 0,          -- Higher = process first
  scheduled_for TIMESTAMPTZ,       -- Optional: don't process before this time

  -- Source tracking (how did this get in the queue?)
  source TEXT DEFAULT 'manual',    -- 'manual', 'suggestion', 'user_request', 'competitor_scan'
  source_url TEXT,                 -- If scraped from somewhere
  requested_by TEXT,               -- Email or user ID

  -- Processing state
  status queue_status DEFAULT 'pending',
  attempts INT DEFAULT 0,
  last_error TEXT,

  -- Results (links to created content)
  tool_id UUID REFERENCES tools(id) ON DELETE SET NULL,
  context_id UUID REFERENCES contexts(id) ON DELETE SET NULL,
  review_id UUID REFERENCES reviews(id) ON DELETE SET NULL,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,

  -- Prevent duplicate queuing
  CONSTRAINT unique_queue_item UNIQUE (tool_name, context_title)
);

CREATE INDEX idx_queue_status ON content_queue(status);
CREATE INDEX idx_queue_priority ON content_queue(priority DESC, created_at ASC);
CREATE INDEX idx_queue_scheduled ON content_queue(scheduled_for) WHERE scheduled_for IS NOT NULL;

-- ============================================================================
-- ADD LIFECYCLE FIELDS TO REVIEWS
-- ============================================================================

ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS status content_status DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS reviewer_id UUID,
  ADD COLUMN IF NOT EXISTS reviewer_notes TEXT,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Backfill: Mark all existing reviews as published
UPDATE reviews SET status = 'published', published_at = created_at WHERE status IS NULL;

-- Index for review queue queries
CREATE INDEX idx_reviews_status ON reviews(status);
CREATE INDEX idx_reviews_draft ON reviews(created_at DESC) WHERE status = 'draft';

-- ============================================================================
-- ADMIN USERS TABLE (Simple role-based access)
-- ============================================================================

CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  role TEXT DEFAULT 'reviewer',  -- 'admin', 'reviewer', 'viewer'
  api_key TEXT UNIQUE,           -- For programmatic access
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ
);

-- Seed yourself as admin (replace with your email)
-- INSERT INTO admin_users (email, name, role) VALUES ('you@example.com', 'Admin', 'admin');

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get next item from queue (atomic claim)
CREATE OR REPLACE FUNCTION claim_next_queue_item()
RETURNS content_queue
LANGUAGE plpgsql
AS $$
DECLARE
  claimed_item content_queue;
BEGIN
  -- Atomically claim the highest priority pending item
  UPDATE content_queue
  SET status = 'processing',
      attempts = attempts + 1,
      processed_at = NOW()
  WHERE id = (
    SELECT id FROM content_queue
    WHERE status = 'pending'
      AND (scheduled_for IS NULL OR scheduled_for <= NOW())
    ORDER BY priority DESC, created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING * INTO claimed_item;

  RETURN claimed_item;
END;
$$;

-- Complete a queue item (success)
CREATE OR REPLACE FUNCTION complete_queue_item(
  p_queue_id UUID,
  p_tool_id UUID,
  p_context_id UUID DEFAULT NULL,
  p_review_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE content_queue
  SET status = 'completed',
      tool_id = p_tool_id,
      context_id = p_context_id,
      review_id = p_review_id,
      processed_at = NOW()
  WHERE id = p_queue_id;
END;
$$;

-- Fail a queue item
CREATE OR REPLACE FUNCTION fail_queue_item(
  p_queue_id UUID,
  p_error TEXT
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE content_queue
  SET status = CASE WHEN attempts >= 3 THEN 'failed' ELSE 'pending' END,
      last_error = p_error,
      processed_at = NOW()
  WHERE id = p_queue_id;
END;
$$;

-- Publish a draft review
CREATE OR REPLACE FUNCTION publish_review(
  p_review_id UUID,
  p_reviewer_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE reviews
  SET status = 'published',
      reviewer_id = p_reviewer_id,
      reviewer_notes = p_notes,
      published_at = NOW(),
      updated_at = NOW()
  WHERE id = p_review_id;
END;
$$;

-- Reject a draft review
CREATE OR REPLACE FUNCTION reject_review(
  p_review_id UUID,
  p_reviewer_id UUID DEFAULT NULL,
  p_reason TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE reviews
  SET status = 'rejected',
      reviewer_id = p_reviewer_id,
      rejection_reason = p_reason,
      rejected_at = NOW(),
      updated_at = NOW()
  WHERE id = p_review_id;
END;
$$;

-- ============================================================================
-- VIEWS FOR ADMIN DASHBOARD
-- ============================================================================

-- Pending review queue
CREATE OR REPLACE VIEW admin_review_queue AS
SELECT
  r.id,
  r.status,
  r.score,
  r.summary_markdown,
  r.pros,
  r.cons,
  r.sentiment_tags,
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

-- Content queue status
CREATE OR REPLACE VIEW admin_queue_status AS
SELECT
  cq.*,
  t.name AS resolved_tool_name,
  ctx.title AS resolved_context_title
FROM content_queue cq
LEFT JOIN tools t ON cq.tool_id = t.id
LEFT JOIN contexts ctx ON cq.context_id = ctx.id
ORDER BY
  CASE cq.status
    WHEN 'processing' THEN 1
    WHEN 'pending' THEN 2
    WHEN 'failed' THEN 3
    ELSE 4
  END,
  cq.priority DESC,
  cq.created_at ASC;

-- Daily generation stats
CREATE OR REPLACE VIEW admin_daily_stats AS
SELECT
  DATE(created_at) AS date,
  COUNT(*) FILTER (WHERE status = 'completed') AS completed,
  COUNT(*) FILTER (WHERE status = 'failed') AS failed,
  COUNT(*) FILTER (WHERE status = 'pending') AS pending
FROM content_queue
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE content_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Queue: No public access
CREATE POLICY "No public queue access" ON content_queue FOR ALL USING (false);

-- Admin users: No public access
CREATE POLICY "No public admin access" ON admin_users FOR ALL USING (false);

-- Update reviews policy: Only show published on frontend
DROP POLICY IF EXISTS "Public read access" ON reviews;
CREATE POLICY "Public read published only" ON reviews
  FOR SELECT USING (status = 'published');

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT EXECUTE ON FUNCTION claim_next_queue_item TO service_role;
GRANT EXECUTE ON FUNCTION complete_queue_item TO service_role;
GRANT EXECUTE ON FUNCTION fail_queue_item TO service_role;
GRANT EXECUTE ON FUNCTION publish_review TO service_role;
GRANT EXECUTE ON FUNCTION reject_review TO service_role;
