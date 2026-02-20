-- Harden user signals against spam by moving uniqueness/upsert into DB.
-- Keeps one signal per actor per (item, signal), updates in place, and recomputes aggregates atomically.

ALTER TABLE public.user_signals
  ADD COLUMN IF NOT EXISTS actor_key TEXT,
  ADD COLUMN IF NOT EXISTS risk_score INTEGER NOT NULL DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
  ADD COLUMN IF NOT EXISTS risk_reasons TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE public.user_signals
SET actor_key = COALESCE(NULLIF(btrim(fingerprint_hash), ''), ip_hash)
WHERE actor_key IS NULL;

-- Collapse historical duplicates before enforcing uniqueness.
WITH ranked AS (
  SELECT
    ctid,
    ROW_NUMBER() OVER (
      PARTITION BY item_id, signal_id, actor_key
      ORDER BY created_at DESC, id DESC
    ) AS rn
  FROM public.user_signals
)
DELETE FROM public.user_signals us
USING ranked
WHERE us.ctid = ranked.ctid
  AND ranked.rn > 1;

ALTER TABLE public.user_signals
  ALTER COLUMN actor_key SET NOT NULL;

DROP INDEX IF EXISTS idx_user_signals_actor_signal_unique;
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_signals_actor_signal_unique
  ON public.user_signals(item_id, signal_id, actor_key);

CREATE INDEX IF NOT EXISTS idx_user_signals_actor_created_at
  ON public.user_signals(actor_key, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_signals_risk_score
  ON public.user_signals(risk_score DESC)
  WHERE risk_score >= 60;

-- Replace trigger-based aggregate updates with deterministic recompute from source of truth.
DROP TRIGGER IF EXISTS trigger_user_signals_aggregate ON public.user_signals;

CREATE OR REPLACE FUNCTION public.recompute_signal_aggregate(
  p_item_id UUID,
  p_signal_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  DELETE FROM public.signal_aggregates
  WHERE item_id = p_item_id
    AND signal_id = p_signal_id;

  INSERT INTO public.signal_aggregates (
    id,
    item_id,
    signal_id,
    option_id,
    count_total,
    count_positive,
    count_negative,
    last_updated
  )
  SELECT
    gen_random_uuid(),
    us.item_id,
    us.signal_id,
    us.option_id,
    COUNT(*)::INT,
    SUM(CASE WHEN us.value_bool = true THEN 1 ELSE 0 END)::INT,
    SUM(CASE WHEN us.value_bool = false THEN 1 ELSE 0 END)::INT,
    NOW()
  FROM public.user_signals us
  WHERE us.item_id = p_item_id
    AND us.signal_id = p_signal_id
  GROUP BY us.item_id, us.signal_id, us.option_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_signal(
  p_item_id UUID,
  p_signal_key TEXT,
  p_option_key TEXT DEFAULT NULL,
  p_value_bool BOOLEAN DEFAULT NULL,
  p_value_text TEXT DEFAULT NULL,
  p_value_num NUMERIC DEFAULT NULL,
  p_ip_hash TEXT DEFAULT NULL,
  p_fingerprint_hash TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_source_page TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_signal_id UUID;
  v_option_id UUID;
  v_actor_key TEXT;
  v_existing_id UUID;
  v_action TEXT := 'created';
  v_actor_velocity_10m INTEGER := 0;
  v_ip_velocity_10m INTEGER := 0;
  v_fingerprint_churn_24h INTEGER := 0;
  v_risk_score INTEGER := 0;
  v_risk_reasons TEXT[] := '{}';
BEGIN
  SELECT id INTO v_signal_id
  FROM public.signal_definitions
  WHERE key = p_signal_key
    AND is_active = true;

  IF v_signal_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unknown signal');
  END IF;

  IF p_option_key IS NOT NULL THEN
    SELECT id INTO v_option_id
    FROM public.signal_options
    WHERE signal_id = v_signal_id
      AND key = p_option_key;

    IF v_option_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Unknown signal option');
    END IF;
  END IF;

  IF p_ip_hash IS NULL OR btrim(p_ip_hash) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Missing ip_hash');
  END IF;

  v_actor_key := COALESCE(NULLIF(btrim(p_fingerprint_hash), ''), p_ip_hash);

  IF p_fingerprint_hash IS NULL OR btrim(p_fingerprint_hash) = '' THEN
    v_risk_reasons := array_append(v_risk_reasons, 'ip_only_actor_key');
    v_risk_score := v_risk_score + 25;
  END IF;

  SELECT COUNT(*)
  INTO v_actor_velocity_10m
  FROM public.user_signals us
  WHERE us.actor_key = v_actor_key
    AND us.created_at >= (NOW() - INTERVAL '10 minutes');

  IF v_actor_velocity_10m >= 8 THEN
    v_risk_reasons := array_append(v_risk_reasons, 'velocity_spike_actor');
    v_risk_score := v_risk_score + 40;
  END IF;

  SELECT COUNT(*)
  INTO v_ip_velocity_10m
  FROM public.user_signals us
  WHERE us.ip_hash = p_ip_hash
    AND us.created_at >= (NOW() - INTERVAL '10 minutes');

  IF v_ip_velocity_10m >= 15 THEN
    v_risk_reasons := array_append(v_risk_reasons, 'velocity_spike_ip');
    v_risk_score := v_risk_score + 45;
  END IF;

  SELECT COUNT(DISTINCT us.fingerprint_hash)
  INTO v_fingerprint_churn_24h
  FROM public.user_signals us
  WHERE us.ip_hash = p_ip_hash
    AND us.created_at >= (NOW() - INTERVAL '24 hours')
    AND us.fingerprint_hash IS NOT NULL
    AND btrim(us.fingerprint_hash) <> '';

  IF v_fingerprint_churn_24h >= 6 THEN
    v_risk_reasons := array_append(v_risk_reasons, 'fingerprint_churn');
    v_risk_score := v_risk_score + 50;
  END IF;

  v_risk_score := LEAST(100, GREATEST(0, v_risk_score));

  SELECT id INTO v_existing_id
  FROM public.user_signals
  WHERE item_id = p_item_id
    AND signal_id = v_signal_id
    AND actor_key = v_actor_key
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    v_action := 'updated';
  END IF;

  INSERT INTO public.user_signals (
    item_id,
    signal_id,
    option_id,
    value_bool,
    value_text,
    value_num,
    ip_hash,
    actor_key,
    fingerprint_hash,
    user_agent,
    source_page,
    risk_score,
    risk_reasons,
    created_at,
    updated_at,
    last_seen_at
  )
  VALUES (
    p_item_id,
    v_signal_id,
    v_option_id,
    p_value_bool,
    p_value_text,
    p_value_num,
    p_ip_hash,
    v_actor_key,
    NULLIF(btrim(p_fingerprint_hash), ''),
    p_user_agent,
    p_source_page,
    v_risk_score,
    v_risk_reasons,
    NOW(),
    NOW(),
    NOW()
  )
  ON CONFLICT (item_id, signal_id, actor_key)
  DO UPDATE SET
    option_id = EXCLUDED.option_id,
    value_bool = EXCLUDED.value_bool,
    value_text = EXCLUDED.value_text,
    value_num = EXCLUDED.value_num,
    ip_hash = EXCLUDED.ip_hash,
    fingerprint_hash = EXCLUDED.fingerprint_hash,
    user_agent = EXCLUDED.user_agent,
    source_page = EXCLUDED.source_page,
    risk_score = EXCLUDED.risk_score,
    risk_reasons = EXCLUDED.risk_reasons,
    updated_at = NOW(),
    last_seen_at = NOW();

  PERFORM public.recompute_signal_aggregate(p_item_id, v_signal_id);

  RETURN jsonb_build_object(
    'success', true,
    'action', v_action,
    'risk_score', v_risk_score,
    'risk_reasons', v_risk_reasons
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.recompute_signal_aggregate(UUID, UUID)
  TO service_role;

GRANT EXECUTE ON FUNCTION public.record_signal(
  UUID,
  TEXT,
  TEXT,
  BOOLEAN,
  TEXT,
  NUMERIC,
  TEXT,
  TEXT,
  TEXT,
  TEXT
) TO anon, authenticated, service_role;
