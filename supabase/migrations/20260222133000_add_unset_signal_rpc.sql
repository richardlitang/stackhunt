-- Add explicit structured-signal unset semantics (delete actor's signal row + recompute aggregates).
-- This restores thumbs toggle-off behavior without reintroducing a parallel vote pipeline.

CREATE OR REPLACE FUNCTION public.unset_signal(
  p_item_id UUID,
  p_signal_key TEXT,
  p_ip_hash TEXT DEFAULT NULL,
  p_fingerprint_hash TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_signal_id UUID;
  v_actor_key TEXT;
  v_deleted_count INT := 0;
BEGIN
  SELECT id INTO v_signal_id
  FROM public.signal_definitions
  WHERE key = p_signal_key
  LIMIT 1;

  IF v_signal_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unknown signal');
  END IF;

  IF p_ip_hash IS NULL OR btrim(p_ip_hash) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Missing ip_hash');
  END IF;

  v_actor_key := COALESCE(NULLIF(btrim(p_fingerprint_hash), ''), p_ip_hash);

  DELETE FROM public.user_signals
  WHERE item_id = p_item_id
    AND signal_id = v_signal_id
    AND actor_key = v_actor_key;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  PERFORM public.recompute_signal_aggregate(p_item_id, v_signal_id);

  RETURN jsonb_build_object(
    'success', true,
    'action', CASE WHEN v_deleted_count > 0 THEN 'removed' ELSE 'unchanged' END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.unset_signal(
  UUID,
  TEXT,
  TEXT,
  TEXT
) TO anon, authenticated, service_role;
