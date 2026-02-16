-- ============================================================================
-- MIGRATION: Fix complete_hunt to use item_id + named param compatibility
--
-- Problem:
-- - complete_hunt function body still writes to deprecated hunt_queue.tool_id.
-- - Queue service calls with named param p_item_id, which misses this legacy
--   signature and triggers fallback updates.
--
-- Solution:
-- - Replace complete_hunt(uuid,uuid,uuid,uuid,integer) with p_item_id naming.
-- - Update function body to write hunt_queue.item_id.
-- ============================================================================

DROP FUNCTION IF EXISTS public.complete_hunt(UUID, UUID, UUID, UUID, INTEGER);

CREATE OR REPLACE FUNCTION public.complete_hunt(
  p_queue_id UUID,
  p_item_id UUID,
  p_context_id UUID DEFAULT NULL,
  p_review_id UUID DEFAULT NULL,
  p_tokens_used INTEGER DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  UPDATE public.hunt_queue
  SET
    status = 'completed',
    item_id = p_item_id,
    context_id = p_context_id,
    review_id = p_review_id,
    tokens_used = p_tokens_used,
    completed_at = NOW(),
    duration_ms = EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000,
    updated_at = NOW()
  WHERE id = p_queue_id;
END;
$$;

COMMENT ON FUNCTION public.complete_hunt(UUID, UUID, UUID, UUID, INTEGER)
IS 'Mark queue item as completed with result IDs and token usage';
