-- ============================================================================
-- MIGRATION: Security view + function hardening
--
-- Problem:
-- - Views `tools_needing_affiliates` and `freelancer_friendly_tools` lack
--   security_invoker, triggering security_definer_view lint risk.
-- - Functions `claim_hunt_queue_item(text)` and `set_updated_at_timestamp()`
--   do not pin search_path, triggering function_search_path_mutable lint.
--
-- Solution:
-- - Set both views to security_invoker.
-- - Set explicit search_path on both functions.
-- ============================================================================

ALTER VIEW IF EXISTS public.tools_needing_affiliates SET (security_invoker = on);
ALTER VIEW IF EXISTS public.freelancer_friendly_tools SET (security_invoker = on);

ALTER FUNCTION public.claim_hunt_queue_item(TEXT) SET search_path = public, pg_catalog;
ALTER FUNCTION public.set_updated_at_timestamp() SET search_path = public, pg_catalog;
