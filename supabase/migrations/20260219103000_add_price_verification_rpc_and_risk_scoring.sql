-- Add deterministic risk scoring + canonical RPC for price verification ingestion.
-- This fixes drift where API expects public.record_price_verification to exist.

ALTER TABLE public.price_verifications
  ADD COLUMN IF NOT EXISTS actor_key TEXT,
  ADD COLUMN IF NOT EXISTS turnstile_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS source_page TEXT,
  ADD COLUMN IF NOT EXISTS origin_host TEXT,
  ADD COLUMN IF NOT EXISTS expected_host TEXT,
  ADD COLUMN IF NOT EXISTS risk_score INTEGER NOT NULL DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
  ADD COLUMN IF NOT EXISTS risk_reasons TEXT[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_price_verifications_actor_created_at
  ON public.price_verifications(actor_key, created_at DESC)
  WHERE actor_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_price_verifications_risk_score
  ON public.price_verifications(risk_score DESC)
  WHERE risk_score >= 60;

CREATE OR REPLACE FUNCTION public.record_price_verification(
  p_item_id UUID,
  p_item_name TEXT DEFAULT NULL,
  p_is_accurate BOOLEAN DEFAULT true,
  p_ip_hash TEXT DEFAULT NULL,
  p_fingerprint_hash TEXT DEFAULT NULL,
  p_has_turnstile BOOLEAN DEFAULT false,
  p_source_page TEXT DEFAULT NULL,
  p_origin_host TEXT DEFAULT NULL,
  p_expected_host TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_actor_key TEXT;
  v_recent_same_actor_count INTEGER := 0;
  v_actor_velocity_10m INTEGER := 0;
  v_ip_velocity_10m INTEGER := 0;
  v_fingerprint_churn_24h INTEGER := 0;
  v_risk_score INTEGER := 0;
  v_risk_reasons TEXT[] := '{}';
  v_inserted_id UUID;
  v_item_name TEXT;
  v_queued_for_refresh BOOLEAN := false;
BEGIN
  IF p_item_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'missing_item_id');
  END IF;

  IF p_ip_hash IS NULL OR btrim(p_ip_hash) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'missing_ip_hash');
  END IF;

  v_actor_key := COALESCE(NULLIF(btrim(p_fingerprint_hash), ''), p_ip_hash);

  -- Enforce one verification per actor+item over a rolling 7-day window.
  SELECT COUNT(*)
  INTO v_recent_same_actor_count
  FROM public.price_verifications pv
  WHERE pv.item_id = p_item_id
    AND COALESCE(NULLIF(pv.actor_key, ''), pv.ip_hash) = v_actor_key
    AND pv.created_at >= (NOW() - INTERVAL '7 days');

  IF v_recent_same_actor_count > 0 THEN
    RAISE EXCEPTION 'duplicate verification in actor window'
      USING ERRCODE = '23505';
  END IF;

  -- Deterministic risk scoring factors.
  IF NOT COALESCE(p_has_turnstile, false) THEN
    v_risk_reasons := array_append(v_risk_reasons, 'missing_turnstile');
    v_risk_score := v_risk_score + 45;
  END IF;

  IF p_fingerprint_hash IS NULL OR btrim(p_fingerprint_hash) = '' THEN
    v_risk_reasons := array_append(v_risk_reasons, 'ip_only_actor_key');
    v_risk_score := v_risk_score + 25;
  END IF;

  IF p_origin_host IS NOT NULL
     AND btrim(p_origin_host) <> ''
     AND p_expected_host IS NOT NULL
     AND btrim(p_expected_host) <> ''
     AND lower(btrim(p_origin_host)) <> lower(btrim(p_expected_host)) THEN
    v_risk_reasons := array_append(v_risk_reasons, 'origin_mismatch');
    v_risk_score := v_risk_score + 60;
  END IF;

  SELECT COUNT(*)
  INTO v_actor_velocity_10m
  FROM public.price_verifications pv
  WHERE COALESCE(NULLIF(pv.actor_key, ''), pv.ip_hash) = v_actor_key
    AND pv.created_at >= (NOW() - INTERVAL '10 minutes');

  IF v_actor_velocity_10m >= 3 THEN
    v_risk_reasons := array_append(v_risk_reasons, 'velocity_spike_actor');
    v_risk_score := v_risk_score + 40;
  END IF;

  SELECT COUNT(*)
  INTO v_ip_velocity_10m
  FROM public.price_verifications pv
  WHERE pv.ip_hash = p_ip_hash
    AND pv.created_at >= (NOW() - INTERVAL '10 minutes');

  IF v_ip_velocity_10m >= 8 THEN
    v_risk_reasons := array_append(v_risk_reasons, 'velocity_spike_ip');
    v_risk_score := v_risk_score + 45;
  END IF;

  SELECT COUNT(DISTINCT pv.fingerprint_hash)
  INTO v_fingerprint_churn_24h
  FROM public.price_verifications pv
  WHERE pv.ip_hash = p_ip_hash
    AND pv.created_at >= (NOW() - INTERVAL '24 hours')
    AND pv.fingerprint_hash IS NOT NULL
    AND btrim(pv.fingerprint_hash) <> '';

  IF v_fingerprint_churn_24h >= 4 THEN
    v_risk_reasons := array_append(v_risk_reasons, 'fingerprint_churn');
    v_risk_score := v_risk_score + 50;
  END IF;

  v_risk_score := LEAST(100, GREATEST(0, v_risk_score));

  INSERT INTO public.price_verifications (
    item_id,
    is_accurate,
    ip_hash,
    actor_key,
    fingerprint_hash,
    turnstile_verified,
    source_page,
    origin_host,
    expected_host,
    risk_score,
    risk_reasons,
    created_at
  )
  VALUES (
    p_item_id,
    p_is_accurate,
    p_ip_hash,
    v_actor_key,
    NULLIF(btrim(p_fingerprint_hash), ''),
    COALESCE(p_has_turnstile, false),
    NULLIF(btrim(p_source_page), ''),
    NULLIF(lower(btrim(p_origin_host)), ''),
    NULLIF(lower(btrim(p_expected_host)), ''),
    v_risk_score,
    v_risk_reasons,
    NOW()
  )
  RETURNING id INTO v_inserted_id;

  IF p_is_accurate THEN
    UPDATE public.items
    SET
      user_verifications_this_week = COALESCE(user_verifications_this_week, 0) + 1,
      last_user_verified_at = NOW()
    WHERE id = p_item_id;
  ELSE
    SELECT i.name INTO v_item_name
    FROM public.items i
    WHERE i.id = p_item_id;

    INSERT INTO public.hunt_queue (
      tool_name,
      item_id,
      hunt_type,
      priority,
      source
    )
    SELECT
      COALESCE(NULLIF(btrim(p_item_name), ''), NULLIF(btrim(v_item_name), ''), 'Unknown Tool'),
      p_item_id,
      'price_only',
      90,
      'api'
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.hunt_queue hq
      WHERE hq.item_id = p_item_id
        AND hq.status IN ('pending', 'claimed', 'processing')
        AND hq.hunt_type = 'price_only'
    );

    v_queued_for_refresh := FOUND;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'id', v_inserted_id,
    'queued_for_refresh', v_queued_for_refresh,
    'risk_score', v_risk_score,
    'risk_reasons', v_risk_reasons
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_price_verification(
  UUID,
  TEXT,
  BOOLEAN,
  TEXT,
  TEXT,
  BOOLEAN,
  TEXT,
  TEXT,
  TEXT
) TO anon, authenticated, service_role;
