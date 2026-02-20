-- Fair queue claiming for hunt workers
-- Purpose: reduce starvation by avoiding single-source/context dominance in claim ordering.

DROP FUNCTION IF EXISTS public.claim_hunt_queue_item(TEXT);

CREATE OR REPLACE FUNCTION public.claim_hunt_queue_item(p_worker_id TEXT)
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
  research_dossier JSONB
)
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
DECLARE
  claimed_item hunt_queue;
BEGIN
  -- Atomically claim a pending item using fairness-aware ordering:
  -- 1) lower in-flight source load first
  -- 2) lower in-flight context load first
  -- 3) then respect priority and age
  UPDATE hunt_queue
  SET
    status = 'claimed',
    claimed_by = p_worker_id,
    claimed_at = NOW(),
    heartbeat_at = NOW(),
    attempts = attempts + 1,
    updated_at = NOW()
  WHERE hunt_queue.id = (
    WITH source_load AS (
      SELECT
        COALESCE(source, 'unknown') AS source_key,
        COUNT(*)::INT AS in_flight
      FROM hunt_queue
      WHERE status IN ('claimed', 'processing')
      GROUP BY 1
    ),
    context_load AS (
      SELECT
        context_title,
        COUNT(*)::INT AS in_flight
      FROM hunt_queue
      WHERE status IN ('claimed', 'processing')
        AND context_title IS NOT NULL
      GROUP BY 1
    )
    SELECT hq.id
    FROM hunt_queue hq
    LEFT JOIN source_load sl ON sl.source_key = COALESCE(hq.source, 'unknown')
    LEFT JOIN context_load cl ON cl.context_title = hq.context_title
    WHERE hq.status = 'pending'
      AND (hq.scheduled_for IS NULL OR hq.scheduled_for <= NOW())
      AND hq.attempts < hq.max_attempts
    ORDER BY
      COALESCE(sl.in_flight, 0) ASC,
      COALESCE(cl.in_flight, 0) ASC,
      hq.priority DESC,
      hq.created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING * INTO claimed_item;

  IF claimed_item.id IS NULL THEN
    RETURN;
  END IF;

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
    ci.ai_classification->'research_dossier' AS research_dossier
  FROM (SELECT claimed_item.*) AS q
  LEFT JOIN content_ideas ci
    ON ci.keyword = claimed_item.tool_name
    OR ci.tool_name = claimed_item.tool_name
  WHERE q.id = claimed_item.id
  LIMIT 1;
END;
$$;

COMMENT ON FUNCTION public.claim_hunt_queue_item(TEXT) IS
'Fairness-aware queue claimer: balances source/context in-flight load before applying priority and FIFO order.';

CREATE INDEX IF NOT EXISTS idx_hunt_queue_source_status
  ON public.hunt_queue(source, status, priority DESC, created_at ASC)
  WHERE status IN ('pending', 'claimed', 'processing');

CREATE INDEX IF NOT EXISTS idx_hunt_queue_context_status
  ON public.hunt_queue(context_title, status, priority DESC, created_at ASC)
  WHERE context_title IS NOT NULL
    AND status IN ('pending', 'claimed', 'processing');
