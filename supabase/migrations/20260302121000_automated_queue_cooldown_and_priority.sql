-- Keep automation useful by prioritizing new-content sources in queue claims
-- and suppressing short-window duplicate auto-enqueues.

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
        COALESCE(hq.source, 'unknown') AS source_key,
        COUNT(*)::INT AS in_flight
      FROM hunt_queue hq
      WHERE hq.status IN ('claimed', 'processing')
      GROUP BY 1
    ),
    context_load AS (
      SELECT
        hq.context_title,
        COUNT(*)::INT AS in_flight
      FROM hunt_queue hq
      WHERE hq.status IN ('claimed', 'processing')
        AND hq.context_title IS NOT NULL
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
      CASE
        WHEN COALESCE(hq.source, '') IN ('suggestion', 'trend_scanner') THEN 0
        WHEN COALESCE(hq.source, '') = 'admin' THEN 1
        ELSE 2
      END ASC,
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
    claimed_item.priority::numeric,
    claimed_item.status::text,
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
'Fairness-aware queue claimer with new-content source priority (suggestion/trend_scanner first).';

CREATE OR REPLACE FUNCTION public.skip_redundant_automated_hunt_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_duplicate_exists BOOLEAN := FALSE;
BEGIN
  IF NEW.status IS DISTINCT FROM 'pending'::hunt_queue_status THEN
    RETURN NEW;
  END IF;

  IF NOT (
    NEW.source = 'scheduled'
    OR (NEW.source = 'admin' AND COALESCE(NEW.hunt_type, 'full') = 'price_only')
  ) THEN
    RETURN NEW;
  END IF;

  IF lower(COALESCE(NEW.error_details->>'cooldown_bypass', 'false')) = 'true' THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.hunt_queue hq
    WHERE hq.tool_name = NEW.tool_name
      AND COALESCE(hq.context_title, '') = COALESCE(NEW.context_title, '')
      AND COALESCE(hq.entity_scope, '') = COALESCE(NEW.entity_scope, '')
      AND COALESCE(hq.hunt_type, 'full') = COALESCE(NEW.hunt_type, 'full')
      AND hq.source = NEW.source
      AND hq.created_at >= NOW() - INTERVAL '7 days'
      AND hq.status IN ('pending', 'claimed', 'processing', 'research_complete', 'completed', 'defunct')
  ) INTO v_duplicate_exists;

  IF v_duplicate_exists THEN
    RETURN NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_skip_redundant_automated_hunt_insert ON public.hunt_queue;

CREATE TRIGGER trg_skip_redundant_automated_hunt_insert
BEFORE INSERT ON public.hunt_queue
FOR EACH ROW
EXECUTE FUNCTION public.skip_redundant_automated_hunt_insert();

COMMENT ON FUNCTION public.skip_redundant_automated_hunt_insert() IS
'Skips repeated scheduled/automated queue inserts for the same tool+context+scope+hunt_type within 7 days.';

CREATE OR REPLACE FUNCTION public.enqueue_pricing_refresh(
  p_days_stale INT DEFAULT 90,
  p_priority INT DEFAULT 50,
  p_limit INT DEFAULT 50
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_count INT := 0;
  v_item RECORD;
BEGIN
  FOR v_item IN
    SELECT i.id, i.name
    FROM public.items i
    WHERE i.type = 'tool'
      AND (i.pricing_verified_at IS NULL OR i.pricing_verified_at < NOW() - (p_days_stale || ' days')::INTERVAL)
      AND NOT EXISTS (
        SELECT 1
        FROM public.hunt_queue hq
        WHERE hq.tool_name = i.name
          AND COALESCE(hq.hunt_type, 'full') = 'price_only'
          AND hq.source = 'scheduled'
          AND hq.created_at >= NOW() - INTERVAL '7 days'
          AND hq.status IN ('pending', 'claimed', 'processing', 'research_complete', 'completed', 'defunct')
      )
    ORDER BY i.pricing_verified_at ASC NULLS FIRST
    LIMIT p_limit
  LOOP
    INSERT INTO public.hunt_queue (
      tool_name,
      priority,
      source,
      hunt_type
    )
    VALUES (
      v_item.name,
      p_priority,
      'scheduled',
      'price_only'
    )
    ON CONFLICT (tool_name, status) WHERE status IN ('pending', 'claimed', 'processing')
    DO NOTHING;

    IF FOUND THEN
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_hunt_queue_item(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.enqueue_pricing_refresh(INT, INT, INT) TO service_role;
