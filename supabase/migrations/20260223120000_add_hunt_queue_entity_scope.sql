-- Add first-class entity scope to hunt_queue so parent/sub-product variants can be queued reliably.
ALTER TABLE public.hunt_queue
ADD COLUMN IF NOT EXISTS entity_scope text;

COMMENT ON COLUMN public.hunt_queue.entity_scope IS
  'Optional scoped research target (e.g. core, copilot, actions, enterprise_server) for ambiguous parent products.';

-- Update duplicate-prevention index so scoped variants can coexist in pending/processing.
DROP INDEX IF EXISTS public.idx_hunt_queue_no_duplicates;

CREATE UNIQUE INDEX IF NOT EXISTS idx_hunt_queue_no_duplicates
  ON public.hunt_queue (
    tool_name,
    COALESCE(context_title, ''),
    COALESCE(entity_scope, '')
  )
  WHERE status IN ('pending', 'claimed', 'processing', 'research_complete');
