-- Context count semantics hardening
-- Purpose: separate all/published/snapshot-ranked counts and keep them deterministic.

ALTER TABLE public.contexts
  ADD COLUMN IF NOT EXISTS all_reviews_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS published_reviews_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS snapshot_ranked_count INT NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.contexts.all_reviews_count IS
  'All reviews linked to this context (all statuses).';
COMMENT ON COLUMN public.contexts.published_reviews_count IS
  'Only reviews with status=published (public-safe).';
COMMENT ON COLUMN public.contexts.snapshot_ranked_count IS
  'Count of ranked items in the active published snapshot.';

CREATE OR REPLACE FUNCTION public.update_context_count_semantics(p_context_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_context_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.contexts c
  SET
    all_reviews_count = COALESCE(r.all_count, 0),
    published_reviews_count = COALESCE(r.published_count, 0),
    updated_at = NOW()
  FROM (
    SELECT
      context_id,
      COUNT(*)::INT AS all_count,
      COUNT(*) FILTER (WHERE status = 'published')::INT AS published_count
    FROM public.reviews
    WHERE context_id = p_context_id
    GROUP BY context_id
  ) r
  WHERE c.id = p_context_id
    AND c.id = r.context_id;

  -- Handle contexts with zero reviews.
  UPDATE public.contexts
  SET
    all_reviews_count = 0,
    published_reviews_count = 0,
    updated_at = NOW()
  WHERE id = p_context_id
    AND NOT EXISTS (
      SELECT 1
      FROM public.reviews
      WHERE context_id = p_context_id
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.recompute_context_count_semantics(p_context_id UUID DEFAULT NULL)
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  v_updated INT := 0;
BEGIN
  IF p_context_id IS NOT NULL THEN
    PERFORM public.update_context_count_semantics(p_context_id);
    RETURN 1;
  END IF;

  WITH agg AS (
    SELECT
      c.id AS context_id,
      COALESCE(all_counts.all_count, 0)::INT AS all_count,
      COALESCE(all_counts.published_count, 0)::INT AS published_count
    FROM public.contexts c
    LEFT JOIN (
      SELECT
        context_id,
        COUNT(*)::INT AS all_count,
        COUNT(*) FILTER (WHERE status = 'published')::INT AS published_count
      FROM public.reviews
      WHERE context_id IS NOT NULL
      GROUP BY context_id
    ) all_counts ON all_counts.context_id = c.id
  )
  UPDATE public.contexts c
  SET
    all_reviews_count = agg.all_count,
    published_reviews_count = agg.published_count,
    updated_at = NOW()
  FROM agg
  WHERE c.id = agg.context_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_context_count_semantics()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.update_context_count_semantics(OLD.context_id);
    RETURN OLD;
  END IF;

  IF TG_OP = 'INSERT' THEN
    PERFORM public.update_context_count_semantics(NEW.context_id);
    RETURN NEW;
  END IF;

  -- UPDATE path: refresh both old and new context ids in case context changed.
  PERFORM public.update_context_count_semantics(OLD.context_id);
  PERFORM public.update_context_count_semantics(NEW.context_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_reviews_context_count_semantics ON public.reviews;
CREATE TRIGGER trigger_reviews_context_count_semantics
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_context_count_semantics();

SELECT public.recompute_context_count_semantics(NULL);

GRANT EXECUTE ON FUNCTION public.update_context_count_semantics(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.recompute_context_count_semantics(UUID) TO service_role;
