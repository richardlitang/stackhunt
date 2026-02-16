-- ============================================================================
-- MIGRATION: Secure claims + source policy tables with RLS
--
-- Problem:
-- - claims, source_policy_registry, and source_policy_review_queue had RLS disabled.
-- - anon/authenticated roles retained direct table privileges.
--
-- Solution:
-- - Enable RLS on all three tables.
-- - Add explicit deny-all public policies (matching existing project convention).
-- - Revoke direct table privileges from anon/authenticated for defense in depth.
-- ============================================================================

ALTER TABLE IF EXISTS public.claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.source_policy_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.source_policy_review_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "No public claims" ON public.claims;
DROP POLICY IF EXISTS "No public source_policy_registry" ON public.source_policy_registry;
DROP POLICY IF EXISTS "No public source_policy_review_queue" ON public.source_policy_review_queue;

CREATE POLICY "No public claims" ON public.claims FOR ALL USING (false);
CREATE POLICY "No public source_policy_registry"
ON public.source_policy_registry
FOR ALL
USING (false);
CREATE POLICY "No public source_policy_review_queue"
ON public.source_policy_review_queue
FOR ALL
USING (false);

REVOKE ALL PRIVILEGES ON TABLE public.claims FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.source_policy_registry FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.source_policy_review_queue FROM anon, authenticated;
