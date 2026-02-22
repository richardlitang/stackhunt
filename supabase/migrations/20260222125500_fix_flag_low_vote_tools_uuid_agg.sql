-- Fix flag_low_vote_tools(): Postgres has no MAX(uuid), so resolve yes/no option IDs via subqueries.

CREATE OR REPLACE FUNCTION public.flag_low_vote_tools()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_flagged INT := 0;
BEGIN
  WITH helpful_signal AS (
    SELECT
      sd.id AS signal_id,
      (
        SELECT so_yes.id
        FROM public.signal_options so_yes
        WHERE so_yes.signal_id = sd.id
          AND so_yes.key = 'yes'
        LIMIT 1
      ) AS yes_option_id,
      (
        SELECT so_no.id
        FROM public.signal_options so_no
        WHERE so_no.signal_id = sd.id
          AND so_no.key = 'no'
        LIMIT 1
      ) AS no_option_id
    FROM public.signal_definitions sd
    WHERE sd.key = 'review_helpful'
      AND sd.is_active = TRUE
  ),
  helpful_counts AS (
    SELECT
      sa.item_id,
      COALESCE(SUM(CASE WHEN sa.option_id = hs.yes_option_id THEN sa.count_total ELSE 0 END), 0)::INT AS yes_count,
      COALESCE(SUM(CASE WHEN sa.option_id = hs.no_option_id THEN sa.count_total ELSE 0 END), 0)::INT AS no_count
    FROM public.signal_aggregates sa
    JOIN helpful_signal hs
      ON hs.signal_id = sa.signal_id
    GROUP BY sa.item_id
  )
  UPDATE public.items i
  SET
    quality_review_needed = TRUE,
    quality_review_reason = 'low_votes',
    quality_review_flagged_at = NOW()
  FROM helpful_counts hc
  WHERE hc.item_id = i.id
    AND hc.no_count >= 3
    AND hc.no_count > hc.yes_count
    AND COALESCE(i.quality_review_needed, FALSE) = FALSE;

  GET DIAGNOSTICS v_flagged = ROW_COUNT;
  RETURN v_flagged;
END;
$$;
