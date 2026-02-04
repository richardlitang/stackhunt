-- ============================================================================
-- MIGRATION 041: Research Dossier Integration
--
-- Upgrades the Keyword Classifier from a simple filter to a "Tactical Planner"
-- by fetching pre-generated Research Dossiers that tell the Hunter exactly
-- what to search for, moving strategic intelligence from the expensive Hunter
-- phase ($0.05/hunt) to the cheap Classifier phase ($0.0001/classification).
--
-- Problem Solved:
-- - "Claude" disambiguation happens early for $0.0001 instead of $0.05 in Hunter
-- - Targeted queries reduce Serper failures and wasted API costs
-- - Category-aware research strategies (AI models ≠ SaaS collaboration tools)
-- ============================================================================

-- ============================================================================
-- PART 1: Update claim_hunt_queue_item RPC to fetch Research Dossier
-- ============================================================================

-- Drop existing function (return type changed, so must drop first)
DROP FUNCTION IF EXISTS claim_hunt_queue_item(TEXT);

CREATE OR REPLACE FUNCTION claim_hunt_queue_item(p_worker_id TEXT)
RETURNS TABLE (
  id UUID,
  tool_name TEXT,
  context_title TEXT,
  category_slug TEXT,
  hunt_type TEXT,
  priority NUMERIC,
  status TEXT,
  is_discovery_hunt BOOLEAN,
  context_id UUID,
  force_regenerate BOOLEAN,
  research_dossier JSONB  -- NEW: Dossier from content_ideas.ai_classification
)
LANGUAGE plpgsql
AS $$
DECLARE
  claimed_item hunt_queue;
BEGIN
  -- Atomically claim the highest priority pending item
  UPDATE hunt_queue
  SET
    status = 'claimed',
    claimed_by = p_worker_id,
    claimed_at = NOW(),
    heartbeat_at = NOW(),
    attempts = attempts + 1,
    updated_at = NOW()
  WHERE hunt_queue.id = (
    SELECT hunt_queue.id FROM hunt_queue
    WHERE hunt_queue.status = 'pending'
      AND (hunt_queue.scheduled_for IS NULL OR hunt_queue.scheduled_for <= NOW())
      AND hunt_queue.attempts < hunt_queue.max_attempts
    ORDER BY hunt_queue.priority DESC, hunt_queue.created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING * INTO claimed_item;

  -- Return queue item with dossier from content_ideas (if exists)
  RETURN QUERY
  SELECT
    claimed_item.id,
    claimed_item.tool_name,
    claimed_item.context_title,
    claimed_item.category_slug,
    claimed_item.hunt_type,
    claimed_item.priority,
    claimed_item.status,
    claimed_item.is_discovery_hunt,
    claimed_item.context_id,
    claimed_item.force_regenerate,
    -- Fetch research_dossier from content_ideas via LEFT JOIN
    -- (NULL if queue item not from Ahrefs import or classification not run yet)
    ci.ai_classification->'research_dossier' AS research_dossier
  FROM (SELECT claimed_item.*) AS q
  LEFT JOIN content_ideas ci ON ci.keyword = claimed_item.tool_name OR ci.tool_name = claimed_item.tool_name
  WHERE q.id = claimed_item.id
  LIMIT 1;
END;
$$;

COMMENT ON FUNCTION claim_hunt_queue_item IS
'V5: Upgraded to fetch Research Dossier from content_ideas.ai_classification.
The dossier contains pre-generated scout queries, forensic targets, and category hints
that tell the Hunter exactly what to search for, reducing API waste.';

-- ============================================================================
-- PART 2: Index for faster dossier lookups
-- ============================================================================

-- Speed up LEFT JOIN in claim_hunt_queue_item
CREATE INDEX IF NOT EXISTS idx_content_ideas_tool_name
ON content_ideas(tool_name)
WHERE tool_name IS NOT NULL;

-- Speed up GIN index for JSONB queries on research_dossier
CREATE INDEX IF NOT EXISTS idx_content_ideas_dossier
ON content_ideas USING GIN (ai_classification)
WHERE ai_classification->'research_dossier' IS NOT NULL;

-- ============================================================================
-- PART 3: Flywheel Integration - Ensure flywheel keywords get classified
-- ============================================================================

-- Note: This migration doesn't modify the flywheel logic, but documents
-- the required integration points:
--
-- 1. When cross-pollination generates a new tool review, it should create
--    a pending content_idea with keyword = tool_name
--
-- 2. When topic discovery finds a new context, it should create pending
--    content_ideas for each tool to be researched
--
-- 3. Periodic job: SELECT * FROM content_ideas WHERE keyword_type IS NULL
--    AND status = 'pending' → run classification batch
--
-- 4. Queue insertion: Before adding to hunt_queue, check if content_idea exists
--    and classification is complete. If so, the dossier will be available.
--
-- The flow should be:
-- Import/Flywheel → content_ideas → Classify → hunt_queue → Hunter (with dossier)

COMMENT ON TABLE content_ideas IS
'V5: Acts as "staging area" for ALL hunt queue items (both Ahrefs import and flywheel).
Before queuing a hunt, check if a content_idea exists for the tool/keyword and ensure
it is classified. This guarantees the Hunter receives a Research Dossier with targeted
queries instead of generic fallback queries.';
