-- Harden vote integrity with actor-key semantics and true toggle/switch behavior.
-- Goals:
-- 1) One canonical vote per (review_id, actor_key)
-- 2) cast_vote handles add/switch/remove atomically
-- 3) review counters can be reconciled deterministically from votes

ALTER TABLE public.votes
  ADD COLUMN IF NOT EXISTS actor_key TEXT;

UPDATE public.votes
SET actor_key = COALESCE(NULLIF(btrim(fingerprint_hash), ''), ip_hash)
WHERE actor_key IS NULL;

-- Remove historical duplicates under new actor-key uniqueness.
WITH ranked AS (
  SELECT
    ctid,
    ROW_NUMBER() OVER (
      PARTITION BY review_id, actor_key
      ORDER BY created_at DESC, id DESC
    ) AS rn
  FROM public.votes
)
DELETE FROM public.votes v
USING ranked
WHERE v.ctid = ranked.ctid
  AND ranked.rn > 1;

ALTER TABLE public.votes
  ALTER COLUMN actor_key SET NOT NULL;

DROP INDEX IF EXISTS idx_votes_review_actor_key_unique;
CREATE UNIQUE INDEX IF NOT EXISTS idx_votes_review_actor_key_unique
  ON public.votes(review_id, actor_key);

CREATE INDEX IF NOT EXISTS idx_votes_actor_key_created_at
  ON public.votes(actor_key, created_at DESC);

CREATE OR REPLACE FUNCTION public.reconcile_review_vote_counts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_updated INTEGER := 0;
BEGIN
  -- Update reviews that have votes.
  WITH vote_totals AS (
    SELECT
      review_id,
      COUNT(*) FILTER (WHERE vote_type = 1)::INT AS upvotes,
      COUNT(*) FILTER (WHERE vote_type = -1)::INT AS downvotes
    FROM public.votes
    GROUP BY review_id
  ),
  updated_nonzero AS (
    UPDATE public.reviews r
    SET
      upvotes = vt.upvotes,
      downvotes = vt.downvotes,
      updated_at = NOW()
    FROM vote_totals vt
    WHERE r.id = vt.review_id
      AND (r.upvotes IS DISTINCT FROM vt.upvotes OR r.downvotes IS DISTINCT FROM vt.downvotes)
    RETURNING r.id
  ),
  updated_zero AS (
    UPDATE public.reviews r
    SET
      upvotes = 0,
      downvotes = 0,
      updated_at = NOW()
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.votes v
      WHERE v.review_id = r.id
    )
      AND (COALESCE(r.upvotes, 0) <> 0 OR COALESCE(r.downvotes, 0) <> 0)
    RETURNING r.id
  )
  SELECT
    (SELECT COUNT(*) FROM updated_nonzero) + (SELECT COUNT(*) FROM updated_zero)
  INTO v_updated;

  RETURN v_updated;
END;
$$;

CREATE OR REPLACE FUNCTION public.cast_vote(
  p_review_id UUID,
  p_vote_type SMALLINT,
  p_ip_hash TEXT,
  p_fingerprint_hash TEXT DEFAULT NULL,
  p_turnstile_token TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_existing_vote SMALLINT;
  v_actor_key TEXT;
BEGIN
  IF p_review_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Missing review ID');
  END IF;

  IF p_ip_hash IS NULL OR btrim(p_ip_hash) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Missing ip hash');
  END IF;

  IF p_vote_type NOT IN (-1, 0, 1) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid vote type');
  END IF;

  v_actor_key := COALESCE(NULLIF(btrim(p_fingerprint_hash), ''), p_ip_hash);

  SELECT vote_type INTO v_existing_vote
  FROM public.votes
  WHERE review_id = p_review_id
    AND actor_key = v_actor_key
  FOR UPDATE;

  -- Explicit remove/toggle-off semantics.
  IF p_vote_type = 0 THEN
    IF v_existing_vote IS NULL THEN
      RETURN jsonb_build_object('success', true, 'action', 'unchanged');
    END IF;

    DELETE FROM public.votes
    WHERE review_id = p_review_id
      AND actor_key = v_actor_key;

    UPDATE public.reviews
    SET
      upvotes = GREATEST(0, upvotes - CASE WHEN v_existing_vote = 1 THEN 1 ELSE 0 END),
      downvotes = GREATEST(0, downvotes - CASE WHEN v_existing_vote = -1 THEN 1 ELSE 0 END),
      updated_at = NOW()
    WHERE id = p_review_id;

    RETURN jsonb_build_object('success', true, 'action', 'removed');
  END IF;

  -- New vote.
  IF v_existing_vote IS NULL THEN
    INSERT INTO public.votes (
      review_id,
      vote_type,
      ip_hash,
      actor_key,
      fingerprint_hash,
      turnstile_token,
      created_at
    )
    VALUES (
      p_review_id,
      p_vote_type,
      p_ip_hash,
      v_actor_key,
      NULLIF(btrim(p_fingerprint_hash), ''),
      p_turnstile_token,
      NOW()
    );

    UPDATE public.reviews
    SET
      upvotes = upvotes + CASE WHEN p_vote_type = 1 THEN 1 ELSE 0 END,
      downvotes = downvotes + CASE WHEN p_vote_type = -1 THEN 1 ELSE 0 END,
      updated_at = NOW()
    WHERE id = p_review_id;

    RETURN jsonb_build_object('success', true, 'action', 'created');
  END IF;

  -- Same vote repeated is idempotent (no-op).
  IF v_existing_vote = p_vote_type THEN
    RETURN jsonb_build_object('success', true, 'action', 'unchanged');
  END IF;

  -- Switch vote.
  UPDATE public.votes
  SET
    vote_type = p_vote_type,
    ip_hash = p_ip_hash,
    fingerprint_hash = NULLIF(btrim(p_fingerprint_hash), ''),
    turnstile_token = p_turnstile_token,
    created_at = NOW()
  WHERE review_id = p_review_id
    AND actor_key = v_actor_key;

  UPDATE public.reviews
  SET
    upvotes = upvotes + CASE
      WHEN v_existing_vote = -1 AND p_vote_type = 1 THEN 1
      WHEN v_existing_vote = 1 AND p_vote_type = -1 THEN -1
      ELSE 0
    END,
    downvotes = downvotes + CASE
      WHEN v_existing_vote = 1 AND p_vote_type = -1 THEN 1
      WHEN v_existing_vote = -1 AND p_vote_type = 1 THEN -1
      ELSE 0
    END,
    updated_at = NOW()
  WHERE id = p_review_id;

  RETURN jsonb_build_object('success', true, 'action', 'changed');
END;
$$;

GRANT EXECUTE ON FUNCTION public.reconcile_review_vote_counts()
  TO service_role;
