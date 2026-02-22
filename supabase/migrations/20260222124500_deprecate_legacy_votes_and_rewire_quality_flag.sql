-- Deprecate legacy review vote pipeline now that thumbs feedback writes to structured signals.
-- Safe cleanup:
--   1) Drop legacy vote RPC and storage table (unused, zero rows)
--   2) Rewire flag_low_vote_tools() to use `review_helpful` signal aggregates
--
-- Notes:
-- - We keep reviews.upvotes/downvotes columns for backward compatibility and historical snapshots.
-- - We keep the `low_votes` quality_review_reason label to avoid downstream enum/string changes.

DROP FUNCTION IF EXISTS public.cast_vote(UUID, SMALLINT, TEXT, TEXT, TEXT);

DROP TABLE IF EXISTS public.votes;

CREATE OR REPLACE FUNCTION public.flag_low_vote_tools()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_flagged INT := 0;
BEGIN
  /*
    Legacy behavior flagged published reviews with enough downvotes.
    New behavior flags items based on structured thumbs feedback (`review_helpful`):
    - at least 3 "no" signals
    - "no" count exceeds "yes" count
  */
  WITH helpful_signal AS (
    SELECT
      sd.id AS signal_id,
      MAX(CASE WHEN so.key = 'yes' THEN so.id END) AS yes_option_id,
      MAX(CASE WHEN so.key = 'no' THEN so.id END) AS no_option_id
    FROM public.signal_definitions sd
    LEFT JOIN public.signal_options so
      ON so.signal_id = sd.id
     AND so.key IN ('yes', 'no')
    WHERE sd.key = 'review_helpful'
      AND sd.is_active = TRUE
    GROUP BY sd.id
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
