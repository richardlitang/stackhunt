-- ============================================================================
-- MIGRATION 011: Software Intelligence Engine (Strategy Gatekeeper)
-- Implements the "Restaurant Model" with CSV import strategy workflow
-- ============================================================================

-- ============================================================================
-- CONTENT IDEAS TABLE (The Strategy Gatekeeper)
-- Staging area for CSV imports before they cost money
-- ============================================================================

CREATE TABLE IF NOT EXISTS content_ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Core Idea
  keyword TEXT NOT NULL,
  tool_name TEXT,                      -- Extracted tool name
  context_query TEXT,                  -- e.g., "Best CRM for Startups"

  -- SEO Metrics (from CSV or API)
  search_volume INT,
  keyword_difficulty INT,
  cpc DECIMAL(10, 2),

  -- Calculated Metrics
  roi_score DECIMAL(10, 2),            -- (Volume / Difficulty) * CPC
  semantic_similarity DECIMAL(5, 4),   -- Cosine similarity to existing content (0-1)

  -- Deduplication Flags
  is_duplicate BOOLEAN DEFAULT FALSE,
  duplicate_tool_id UUID REFERENCES tools(id),
  duplicate_review_id UUID REFERENCES reviews(id),
  duplicate_reason TEXT,               -- "exact_domain" | "semantic_95" | "keyword_overlap"

  -- Status & Workflow
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'approved' | 'rejected' | 'queued'
  rejection_reason TEXT,
  approved_at TIMESTAMPTZ,
  approved_by TEXT,                    -- Admin who approved

  -- Source Tracking
  source TEXT NOT NULL DEFAULT 'csv',  -- 'csv' | 'manual' | 'suggestion'
  source_file TEXT,                    -- Original CSV filename
  import_batch_id UUID,                -- Group imports together

  -- Embedding for Semantic Dedupe (pgvector)
  embedding vector(1536),              -- OpenAI ada-002 or similar

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,                          -- Admin notes

  -- Constraints
  CONSTRAINT valid_status CHECK (status IN ('pending', 'approved', 'rejected', 'queued'))
);

-- Indexes for Performance
CREATE INDEX idx_content_ideas_status ON content_ideas (status);
CREATE INDEX idx_content_ideas_roi ON content_ideas (roi_score DESC) WHERE status = 'pending';
CREATE INDEX idx_content_ideas_batch ON content_ideas (import_batch_id, created_at DESC);
CREATE INDEX idx_content_ideas_keyword ON content_ideas (keyword);

-- Vector Index for Semantic Search
CREATE INDEX idx_content_ideas_embedding ON content_ideas USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Full-text search on keyword + tool_name
CREATE INDEX idx_content_ideas_search ON content_ideas USING GIN (
  to_tsvector('english', COALESCE(keyword, '') || ' ' || COALESCE(tool_name, '') || ' ' || COALESCE(context_query, ''))
);

-- ============================================================================
-- CONTENT IDEAS FUNCTIONS
-- ============================================================================

-- Function: Calculate ROI Score
CREATE OR REPLACE FUNCTION calculate_roi_score(
  p_volume INT,
  p_difficulty INT,
  p_cpc DECIMAL
)
RETURNS DECIMAL
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Avoid division by zero
  IF p_difficulty IS NULL OR p_difficulty = 0 THEN
    RETURN 0;
  END IF;

  -- ROI = (Volume / Difficulty) * CPC_Weight
  -- CPC weight: 0.1 to 1.0 (higher CPC = higher value)
  RETURN (p_volume::DECIMAL / p_difficulty) * LEAST(p_cpc / 10, 1.0);
END;
$$;

-- Function: Auto-calculate ROI on insert/update
CREATE OR REPLACE FUNCTION update_roi_score()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.roi_score := calculate_roi_score(NEW.search_volume, NEW.keyword_difficulty, NEW.cpc);
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_roi_score
  BEFORE INSERT OR UPDATE OF search_volume, keyword_difficulty, cpc
  ON content_ideas
  FOR EACH ROW
  EXECUTE FUNCTION update_roi_score();

-- ============================================================================
-- STRATEGY GATEKEEPER FUNCTIONS
-- ============================================================================

-- Function: Check for Hard Duplicates (Exact Domain Match)
CREATE OR REPLACE FUNCTION check_hard_duplicate(
  p_tool_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing_tool RECORD;
BEGIN
  -- Extract potential domain from tool name
  -- Simple heuristic: lowercase, remove spaces, check if exists
  SELECT id, name, website
  INTO v_existing_tool
  FROM tools
  WHERE LOWER(REPLACE(name, ' ', '')) = LOWER(REPLACE(p_tool_name, ' ', ''))
     OR website ILIKE '%' || REPLACE(LOWER(p_tool_name), ' ', '') || '%'
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'is_duplicate', TRUE,
      'reason', 'exact_domain',
      'tool_id', v_existing_tool.id,
      'tool_name', v_existing_tool.name,
      'tool_website', v_existing_tool.website
    );
  END IF;

  RETURN jsonb_build_object('is_duplicate', FALSE);
END;
$$;

-- Function: Check for Semantic Duplicates (95% similarity)
CREATE OR REPLACE FUNCTION check_semantic_duplicate(
  p_embedding vector(1536),
  p_threshold DECIMAL DEFAULT 0.95
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing_review RECORD;
  v_similarity DECIMAL;
BEGIN
  -- Find most similar existing review
  SELECT
    r.id,
    r.title,
    t.name as tool_name,
    1 - (r.embedding <=> p_embedding) as similarity
  INTO v_existing_review
  FROM reviews r
  JOIN tools t ON r.tool_id = t.id
  WHERE r.embedding IS NOT NULL
  ORDER BY r.embedding <=> p_embedding
  LIMIT 1;

  IF FOUND AND v_existing_review.similarity >= p_threshold THEN
    RETURN jsonb_build_object(
      'is_duplicate', TRUE,
      'reason', 'semantic_95',
      'review_id', v_existing_review.id,
      'review_title', v_existing_review.title,
      'tool_name', v_existing_review.tool_name,
      'similarity', v_existing_review.similarity
    );
  END IF;

  RETURN jsonb_build_object('is_duplicate', FALSE);
END;
$$;

-- Function: Analyze Content Ideas (Strategy Gatekeeper)
CREATE OR REPLACE FUNCTION analyze_content_ideas(
  p_batch_id UUID DEFAULT NULL,
  p_limit INT DEFAULT 100
)
RETURNS TABLE(
  id UUID,
  keyword TEXT,
  tool_name TEXT,
  roi_score DECIMAL,
  is_duplicate BOOLEAN,
  duplicate_reason TEXT,
  recommendation TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ci.id,
    ci.keyword,
    ci.tool_name,
    ci.roi_score,
    ci.is_duplicate,
    ci.duplicate_reason,
    CASE
      WHEN ci.is_duplicate THEN 'REJECT: Duplicate content'
      WHEN ci.roi_score IS NULL THEN 'PENDING: Need SEO data'
      WHEN ci.roi_score < 1 THEN 'REJECT: Low ROI'
      WHEN ci.roi_score >= 10 THEN 'APPROVE: High ROI opportunity'
      WHEN ci.roi_score >= 5 THEN 'CONSIDER: Medium ROI'
      ELSE 'REVIEW: Low-medium ROI'
    END as recommendation
  FROM content_ideas ci
  WHERE ci.status = 'pending'
    AND (p_batch_id IS NULL OR ci.import_batch_id = p_batch_id)
  ORDER BY ci.roi_score DESC NULLS LAST
  LIMIT p_limit;
END;
$$;

-- Function: Approve Content Idea & Queue for Hunt
CREATE OR REPLACE FUNCTION approve_content_idea(
  p_idea_id UUID,
  p_approved_by TEXT,
  p_priority INT DEFAULT 50
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_idea RECORD;
  v_queue_id UUID;
BEGIN
  -- Get the idea
  SELECT * INTO v_idea
  FROM content_ideas
  WHERE id = p_idea_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Content idea not found or already processed';
  END IF;

  -- Check if already a duplicate
  IF v_idea.is_duplicate THEN
    RAISE EXCEPTION 'Cannot approve duplicate content';
  END IF;

  -- Update idea status
  UPDATE content_ideas
  SET
    status = 'approved',
    approved_at = NOW(),
    approved_by = p_approved_by
  WHERE id = p_idea_id;

  -- Add to hunt queue
  INSERT INTO hunt_queue (
    tool_name,
    context_title,
    priority,
    source,
    hunt_type
  )
  VALUES (
    v_idea.tool_name,
    v_idea.context_query,
    p_priority,
    'strategy',
    'full'
  )
  ON CONFLICT (tool_name, status) WHERE status IN ('pending', 'claimed', 'processing')
  DO NOTHING
  RETURNING id INTO v_queue_id;

  -- Update idea to queued
  IF v_queue_id IS NOT NULL THEN
    UPDATE content_ideas
    SET status = 'queued'
    WHERE id = p_idea_id;
  END IF;

  RETURN v_queue_id;
END;
$$;

-- Function: Bulk Approve High ROI Ideas
CREATE OR REPLACE FUNCTION bulk_approve_ideas(
  p_min_roi DECIMAL DEFAULT 5.0,
  p_max_count INT DEFAULT 20,
  p_approved_by TEXT DEFAULT 'system'
)
RETURNS TABLE(
  approved_count INT,
  queue_ids UUID[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_idea RECORD;
  v_queue_ids UUID[] := ARRAY[]::UUID[];
  v_queue_id UUID;
  v_count INT := 0;
BEGIN
  -- Loop through high ROI, non-duplicate ideas
  FOR v_idea IN
    SELECT id
    FROM content_ideas
    WHERE status = 'pending'
      AND NOT is_duplicate
      AND roi_score >= p_min_roi
    ORDER BY roi_score DESC
    LIMIT p_max_count
  LOOP
    -- Approve and queue each idea
    BEGIN
      v_queue_id := approve_content_idea(v_idea.id, p_approved_by, 75);
      IF v_queue_id IS NOT NULL THEN
        v_queue_ids := array_append(v_queue_ids, v_queue_id);
        v_count := v_count + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Log error but continue
      RAISE NOTICE 'Failed to approve idea %: %', v_idea.id, SQLERRM;
    END;
  END LOOP;

  RETURN QUERY SELECT v_count, v_queue_ids;
END;
$$;

-- ============================================================================
-- IMPORT BATCH TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  total_rows INT NOT NULL,
  imported_rows INT NOT NULL DEFAULT 0,
  duplicate_rows INT NOT NULL DEFAULT 0,
  error_rows INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'processing',  -- 'processing' | 'completed' | 'failed'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_by TEXT,                             -- Admin user
  notes TEXT,

  CONSTRAINT valid_batch_status CHECK (status IN ('processing', 'completed', 'failed'))
);

CREATE INDEX idx_import_batches_status ON import_batches (status, created_at DESC);

-- Function: Create Import Batch
CREATE OR REPLACE FUNCTION create_import_batch(
  p_filename TEXT,
  p_total_rows INT,
  p_created_by TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_batch_id UUID;
BEGIN
  INSERT INTO import_batches (filename, total_rows, created_by)
  VALUES (p_filename, p_total_rows, p_created_by)
  RETURNING id INTO v_batch_id;

  RETURN v_batch_id;
END;
$$;

-- Function: Complete Import Batch
CREATE OR REPLACE FUNCTION complete_import_batch(
  p_batch_id UUID,
  p_status TEXT DEFAULT 'completed'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE import_batches
  SET
    status = p_status,
    completed_at = NOW(),
    -- Count actual results from content_ideas
    imported_rows = (SELECT COUNT(*) FROM content_ideas WHERE import_batch_id = p_batch_id),
    duplicate_rows = (SELECT COUNT(*) FROM content_ideas WHERE import_batch_id = p_batch_id AND is_duplicate)
  WHERE id = p_batch_id;
END;
$$;

-- ============================================================================
-- VIEWS FOR ADMIN UI
-- ============================================================================

-- View: Strategy War Room Dashboard
CREATE OR REPLACE VIEW strategy_war_room AS
SELECT
  ci.id,
  ci.keyword,
  ci.tool_name,
  ci.context_query,
  ci.search_volume,
  ci.keyword_difficulty,
  ci.cpc,
  ci.roi_score,
  ci.is_duplicate,
  ci.duplicate_reason,
  ci.status,
  ci.source,
  ci.source_file,
  ci.created_at,
  CASE
    WHEN ci.is_duplicate THEN '🚫 Duplicate'
    WHEN ci.roi_score IS NULL THEN '⏳ Analyzing'
    WHEN ci.roi_score >= 10 THEN '🔥 High Priority'
    WHEN ci.roi_score >= 5 THEN '✅ Approved'
    WHEN ci.roi_score >= 2 THEN '⚠️ Review Needed'
    ELSE '❌ Low ROI'
  END as status_emoji,
  -- Link to duplicate if exists
  t.name as duplicate_tool_name,
  t.slug as duplicate_tool_slug
FROM content_ideas ci
LEFT JOIN tools t ON ci.duplicate_tool_id = t.id
WHERE ci.status = 'pending'
ORDER BY ci.roi_score DESC NULLS LAST;

-- View: Import Batch Summary
CREATE OR REPLACE VIEW import_batch_summary AS
SELECT
  ib.id,
  ib.filename,
  ib.status,
  ib.total_rows,
  ib.imported_rows,
  ib.duplicate_rows,
  ib.error_rows,
  ib.created_at,
  ib.completed_at,
  ib.created_by,
  -- Stats
  ROUND((ib.imported_rows::DECIMAL / NULLIF(ib.total_rows, 0)) * 100, 2) as success_rate,
  ROUND((ib.duplicate_rows::DECIMAL / NULLIF(ib.total_rows, 0)) * 100, 2) as duplicate_rate,
  -- Counts from content_ideas
  (SELECT COUNT(*) FROM content_ideas WHERE import_batch_id = ib.id AND status = 'approved') as approved_count,
  (SELECT COUNT(*) FROM content_ideas WHERE import_batch_id = ib.id AND status = 'queued') as queued_count
FROM import_batches ib
ORDER BY ib.created_at DESC;

-- ============================================================================
-- ROW LEVEL SECURITY (Optional - Enable if needed)
-- ============================================================================

-- Content ideas are admin-only, so no RLS needed for now
-- If we add multi-tenant admins later, enable RLS here

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE content_ideas IS 'Strategy Gatekeeper: Staging area for CSV imports before they cost money';
COMMENT ON TABLE import_batches IS 'Tracks CSV import batches for audit and analytics';

COMMENT ON COLUMN content_ideas.roi_score IS 'Calculated as (Volume / Difficulty) * CPC_Weight - Higher is better';
COMMENT ON COLUMN content_ideas.semantic_similarity IS 'Cosine similarity to most similar existing content (0-1)';
COMMENT ON COLUMN content_ideas.embedding IS 'Vector embedding for semantic deduplication (OpenAI ada-002 compatible)';

COMMENT ON FUNCTION check_hard_duplicate IS 'Checks if tool already exists by domain/name matching';
COMMENT ON FUNCTION check_semantic_duplicate IS 'Checks if content is semantically similar (>95%) to existing reviews';
COMMENT ON FUNCTION approve_content_idea IS 'Approves idea and adds to hunt_queue atomically';
COMMENT ON FUNCTION bulk_approve_ideas IS 'Auto-approves high ROI ideas in batch (min ROI threshold)';
