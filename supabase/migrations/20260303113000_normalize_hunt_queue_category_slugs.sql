-- Normalize hunt_queue category slugs to canonical taxonomy values.
--
-- Why:
-- - Historical queue rows can contain drift aliases (e.g. team-chat, version-control).
-- - App code now canonicalizes slugs, but DB-level normalization keeps data clean
--   regardless of insert path (scripts, RPCs, manual SQL).

CREATE OR REPLACE FUNCTION public.normalize_hunt_category_slug(p_slug TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_slug TEXT;
BEGIN
  IF p_slug IS NULL THEN
    RETURN NULL;
  END IF;

  v_slug := lower(trim(p_slug));
  v_slug := regexp_replace(v_slug, '[^a-z0-9]+', '-', 'g');
  v_slug := regexp_replace(v_slug, '(^-|-$)', '', 'g');

  IF v_slug = '' THEN
    RETURN NULL;
  END IF;

  RETURN CASE v_slug
    WHEN 'team-chat' THEN 'communication'
    WHEN 'version-control' THEN 'developer-tools'
    WHEN 'sales-crm' THEN 'crm-sales'
    WHEN 'marketing-automation' THEN 'email-marketing'
    WHEN 'payment-processing' THEN 'payments'
    WHEN 'ecommerce-platform' THEN 'payments'
    WHEN 'ecommerce-payments' THEN 'payments'
    WHEN 'design-marketing' THEN 'design'
    WHEN 'no-code-low-code' THEN 'no-code'
    WHEN 'api-development' THEN 'developer-tools'
    WHEN 'file-storage' THEN 'productivity'
    WHEN 'documentation' THEN 'productivity'
    WHEN 'note-taking' THEN 'notetaking'
    WHEN 'video-editing' THEN 'video-audio'
    WHEN 'security-identity' THEN 'it-security'
    ELSE v_slug
  END;
END;
$$;

CREATE OR REPLACE FUNCTION public.canonicalize_hunt_queue_categories()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
BEGIN
  NEW.category_slug := public.normalize_hunt_category_slug(NEW.category_slug);
  NEW.detected_category := public.normalize_hunt_category_slug(NEW.detected_category);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_canonicalize_hunt_queue_categories ON public.hunt_queue;

CREATE TRIGGER trg_canonicalize_hunt_queue_categories
BEFORE INSERT OR UPDATE OF category_slug, detected_category ON public.hunt_queue
FOR EACH ROW
EXECUTE FUNCTION public.canonicalize_hunt_queue_categories();

UPDATE public.hunt_queue
SET
  category_slug = public.normalize_hunt_category_slug(category_slug),
  detected_category = public.normalize_hunt_category_slug(detected_category)
WHERE
  category_slug IS DISTINCT FROM public.normalize_hunt_category_slug(category_slug)
  OR detected_category IS DISTINCT FROM public.normalize_hunt_category_slug(detected_category);

COMMENT ON FUNCTION public.normalize_hunt_category_slug(TEXT) IS
'Canonicalizes hunt queue category slugs, including historical alias mappings.';

COMMENT ON FUNCTION public.canonicalize_hunt_queue_categories() IS
'Trigger function that normalizes hunt_queue.category_slug and hunt_queue.detected_category on write.';
