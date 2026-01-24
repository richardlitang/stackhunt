-- =================================================================
-- MIGRATION 017: Security Hardening
-- Addresses Supabase security advisories:
-- - Enable RLS on unprotected tables
-- - Add security_invoker to views
-- - Set search_path on SECURITY DEFINER functions
-- - Fix overly permissive RLS policies
-- =================================================================

-- =================================================================
-- 1. ENABLE RLS ON UNPROTECTED TABLES
-- =================================================================

-- These tables contain sensitive/admin data and should not be publicly accessible
ALTER TABLE content_ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_batches ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Block all public access (service_role bypasses RLS automatically)
CREATE POLICY "No public access" ON content_ideas FOR ALL USING (false);
CREATE POLICY "No public access" ON import_batches FOR ALL USING (false);
CREATE POLICY "No public access" ON admin_sessions FOR ALL USING (false);
CREATE POLICY "No public access" ON rate_limits FOR ALL USING (false);
CREATE POLICY "No public access" ON verification_batches FOR ALL USING (false);

-- =================================================================
-- 2. FIX OVERLY PERMISSIVE RLS POLICIES
-- =================================================================

-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Service role full access" ON prompts;
DROP POLICY IF EXISTS "Service role full access" ON prompt_versions;
DROP POLICY IF EXISTS "Anyone can submit corrections" ON corrections;

-- Recreate with proper restrictions
-- Prompts: No public access (service_role bypasses RLS)
CREATE POLICY "No public access" ON prompts FOR ALL USING (false);

-- Prompt versions: No public access (service_role bypasses RLS)
CREATE POLICY "No public access" ON prompt_versions FOR ALL USING (false);

-- Corrections: Allow public INSERT but validate the data
-- This is a public form, but we restrict what can be inserted
CREATE POLICY "Public can submit corrections" ON corrections
  FOR INSERT
  WITH CHECK (
    -- Must be a new pending correction
    status = 'pending'
    -- Must have required fields (tool_id will be validated by FK)
    AND field_name IS NOT NULL
    AND correction_text IS NOT NULL
  );

-- =================================================================
-- 3. ADD SECURITY_INVOKER TO VIEWS (PostgreSQL 15+)
-- This makes views respect the caller's permissions instead of
-- running with the view owner's privileges
-- =================================================================

ALTER VIEW admin_review_queue SET (security_invoker = on);
ALTER VIEW affiliate_performance SET (security_invoker = on);
ALTER VIEW categories_by_pillar SET (security_invoker = on);
ALTER VIEW categories_by_type SET (security_invoker = on);
ALTER VIEW competitor_keyword_gaps SET (security_invoker = on);
ALTER VIEW competitor_opportunities SET (security_invoker = on);
ALTER VIEW context_performance SET (security_invoker = on);
ALTER VIEW contexts_with_title SET (security_invoker = on);
ALTER VIEW corrections_by_tool SET (security_invoker = on);
ALTER VIEW freelancer_friendly_tools SET (security_invoker = on);
ALTER VIEW hunt_queue_dashboard SET (security_invoker = on);
ALTER VIEW hunt_queue_stats SET (security_invoker = on);
ALTER VIEW import_batch_summary SET (security_invoker = on);
ALTER VIEW keyword_roi_analysis SET (security_invoker = on);
ALTER VIEW market_state_freshness SET (security_invoker = on);
ALTER VIEW strategy_war_room SET (security_invoker = on);
ALTER VIEW tools_needing_affiliates SET (security_invoker = on);
ALTER VIEW tools_with_tags SET (security_invoker = on);

-- =================================================================
-- 4. RECREATE SECURITY DEFINER FUNCTIONS WITH SEARCH_PATH
-- Setting search_path prevents search_path injection attacks
-- =================================================================

-- 4.1 cast_vote
CREATE OR REPLACE FUNCTION cast_vote(
  p_review_id UUID,
  p_vote_type SMALLINT,
  p_ip_hash TEXT,
  p_fingerprint_hash TEXT DEFAULT NULL,
  p_turnstile_token TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_vote SMALLINT;
  v_result JSONB;
BEGIN
  -- Validate vote type
  IF p_vote_type NOT IN (-1, 1) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid vote type');
  END IF;

  -- Check for existing vote
  SELECT vote_type INTO v_existing_vote
  FROM votes
  WHERE review_id = p_review_id
    AND ip_hash = p_ip_hash
    AND (fingerprint_hash = p_fingerprint_hash OR (fingerprint_hash IS NULL AND p_fingerprint_hash IS NULL));

  IF v_existing_vote IS NOT NULL THEN
    IF v_existing_vote = p_vote_type THEN
      -- Same vote exists - silently accept (shadowban behavior)
      RETURN jsonb_build_object('success', true, 'action', 'unchanged');
    ELSE
      -- Changing vote - update it
      UPDATE votes
      SET vote_type = p_vote_type,
          turnstile_token = p_turnstile_token
      WHERE review_id = p_review_id
        AND ip_hash = p_ip_hash
        AND (fingerprint_hash = p_fingerprint_hash OR (fingerprint_hash IS NULL AND p_fingerprint_hash IS NULL));

      -- Update review counts (swing of 2: remove old, add new)
      UPDATE reviews
      SET upvotes = upvotes + (CASE WHEN p_vote_type = 1 THEN 1 ELSE -1 END),
          downvotes = downvotes + (CASE WHEN p_vote_type = -1 THEN 1 ELSE -1 END),
          updated_at = NOW()
      WHERE id = p_review_id;

      RETURN jsonb_build_object('success', true, 'action', 'changed');
    END IF;
  END IF;

  -- New vote
  INSERT INTO votes (review_id, vote_type, ip_hash, fingerprint_hash, turnstile_token)
  VALUES (p_review_id, p_vote_type, p_ip_hash, p_fingerprint_hash, p_turnstile_token);

  -- Update review counts
  UPDATE reviews
  SET upvotes = upvotes + (CASE WHEN p_vote_type = 1 THEN 1 ELSE 0 END),
      downvotes = downvotes + (CASE WHEN p_vote_type = -1 THEN 1 ELSE 0 END),
      updated_at = NOW()
  WHERE id = p_review_id;

  RETURN jsonb_build_object('success', true, 'action', 'created');

EXCEPTION
  WHEN unique_violation THEN
    -- Race condition - vote already exists, silently accept
    RETURN jsonb_build_object('success', true, 'action', 'unchanged');
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 4.2 check_rate_limit
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_identifier TEXT,
  p_endpoint TEXT,
  p_max_requests INT DEFAULT 10,
  p_window_seconds INT DEFAULT 60
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_current_count INT;
  v_remaining INT;
  v_allowed BOOLEAN;
BEGIN
  -- Calculate window start (truncate to window boundary)
  v_window_start := date_trunc('minute', NOW())
    - ((EXTRACT(MINUTE FROM NOW())::INT % (p_window_seconds / 60)) * INTERVAL '1 minute');

  -- For sub-minute windows, use simpler truncation
  IF p_window_seconds < 60 THEN
    v_window_start := NOW() - (p_window_seconds * INTERVAL '1 second');
  END IF;

  -- Try to increment existing record or insert new one
  INSERT INTO rate_limits (identifier, endpoint, window_start, request_count)
  VALUES (p_identifier, p_endpoint, v_window_start, 1)
  ON CONFLICT (identifier, endpoint, window_start)
  DO UPDATE SET request_count = rate_limits.request_count + 1
  RETURNING request_count INTO v_current_count;

  -- Calculate remaining requests
  v_remaining := GREATEST(0, p_max_requests - v_current_count);
  v_allowed := v_current_count <= p_max_requests;

  RETURN jsonb_build_object(
    'allowed', v_allowed,
    'remaining', v_remaining,
    'current', v_current_count,
    'limit', p_max_requests,
    'reset_at', v_window_start + (p_window_seconds * INTERVAL '1 second')
  );
END;
$$;

-- 4.3 cleanup_rate_limits
CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted INT;
BEGIN
  DELETE FROM rate_limits
  WHERE window_start < NOW() - INTERVAL '1 hour';

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- 4.4 validate_admin_session
CREATE OR REPLACE FUNCTION validate_admin_session(
  p_token_hash TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session RECORD;
BEGIN
  -- Find valid session
  SELECT * INTO v_session
  FROM admin_sessions
  WHERE token_hash = p_token_hash
    AND NOT is_revoked
    AND expires_at > NOW();

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false);
  END IF;

  -- Update last used
  UPDATE admin_sessions
  SET last_used_at = NOW()
  WHERE id = v_session.id;

  RETURN jsonb_build_object(
    'valid', true,
    'session_id', v_session.id,
    'created_at', v_session.created_at,
    'expires_at', v_session.expires_at
  );
END;
$$;

-- 4.5 create_admin_session
CREATE OR REPLACE FUNCTION create_admin_session(
  p_token_hash TEXT,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_expires_in_days INT DEFAULT 7
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_id UUID;
BEGIN
  INSERT INTO admin_sessions (token_hash, ip_address, user_agent, expires_at)
  VALUES (
    p_token_hash,
    p_ip_address,
    LEFT(p_user_agent, 500),
    NOW() + (p_expires_in_days * INTERVAL '1 day')
  )
  RETURNING id INTO v_session_id;

  RETURN v_session_id;
END;
$$;

-- 4.6 revoke_admin_session
CREATE OR REPLACE FUNCTION revoke_admin_session(
  p_token_hash TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE admin_sessions
  SET is_revoked = TRUE
  WHERE token_hash = p_token_hash;

  RETURN FOUND;
END;
$$;

-- 4.7 cleanup_admin_sessions
CREATE OR REPLACE FUNCTION cleanup_admin_sessions()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted INT;
BEGIN
  DELETE FROM admin_sessions
  WHERE expires_at < NOW() - INTERVAL '1 day'
     OR (is_revoked AND last_used_at < NOW() - INTERVAL '1 hour');

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- 4.8 check_hard_duplicate
CREATE OR REPLACE FUNCTION check_hard_duplicate(
  p_tool_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_tool RECORD;
BEGIN
  -- Extract potential domain from tool name
  SELECT id, name, website
  INTO v_existing_tool
  FROM tools
  WHERE LOWER(REPLACE(name, ' ', '')) = LOWER(REPLACE(p_tool_name, ' ', ''))
     OR website ILIKE '%' || REPLACE(LOWER(p_tool_name), ' ', '') || '%'
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'is_duplicate', TRUE,
      'reason', 'exact_domain',
      'tool_id', v_existing_tool.id,
      'tool_name', v_existing_tool.name,
      'tool_website', v_existing_tool.website
    );
  END IF;

  RETURN jsonb_build_object('is_duplicate', FALSE);
END;
$$;

-- 4.9 check_semantic_duplicate
CREATE OR REPLACE FUNCTION check_semantic_duplicate(
  p_embedding vector(1536),
  p_threshold DECIMAL DEFAULT 0.95
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_review RECORD;
  v_similarity DECIMAL;
BEGIN
  -- Find most similar existing review
  SELECT
    r.id,
    r.title,
    t.name as tool_name,
    1 - (r.embedding <=> p_embedding) as similarity
  INTO v_existing_review
  FROM reviews r
  JOIN tools t ON r.tool_id = t.id
  WHERE r.embedding IS NOT NULL
  ORDER BY r.embedding <=> p_embedding
  LIMIT 1;

  IF FOUND AND v_existing_review.similarity >= p_threshold THEN
    RETURN jsonb_build_object(
      'is_duplicate', TRUE,
      'reason', 'semantic_95',
      'review_id', v_existing_review.id,
      'review_title', v_existing_review.title,
      'tool_name', v_existing_review.tool_name,
      'similarity', v_existing_review.similarity
    );
  END IF;

  RETURN jsonb_build_object('is_duplicate', FALSE);
END;
$$;

-- 4.10 analyze_content_ideas
CREATE OR REPLACE FUNCTION analyze_content_ideas(
  p_batch_id UUID DEFAULT NULL,
  p_limit INT DEFAULT 100
)
RETURNS TABLE(
  id UUID,
  keyword TEXT,
  tool_name TEXT,
  roi_score DECIMAL,
  is_duplicate BOOLEAN,
  duplicate_reason TEXT,
  recommendation TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ci.id,
    ci.keyword,
    ci.tool_name,
    ci.roi_score,
    ci.is_duplicate,
    ci.duplicate_reason,
    CASE
      WHEN ci.is_duplicate THEN 'REJECT: Duplicate content'
      WHEN ci.roi_score IS NULL THEN 'PENDING: Need SEO data'
      WHEN ci.roi_score < 1 THEN 'REJECT: Low ROI'
      WHEN ci.roi_score >= 10 THEN 'APPROVE: High ROI opportunity'
      WHEN ci.roi_score >= 5 THEN 'CONSIDER: Medium ROI'
      ELSE 'REVIEW: Low-medium ROI'
    END as recommendation
  FROM content_ideas ci
  WHERE ci.status = 'pending'
    AND (p_batch_id IS NULL OR ci.import_batch_id = p_batch_id)
  ORDER BY ci.roi_score DESC NULLS LAST
  LIMIT p_limit;
END;
$$;

-- 4.11 approve_content_idea
CREATE OR REPLACE FUNCTION approve_content_idea(
  p_idea_id UUID,
  p_approved_by TEXT,
  p_priority INT DEFAULT 50
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_idea RECORD;
  v_queue_id UUID;
BEGIN
  -- Get the idea
  SELECT * INTO v_idea
  FROM content_ideas
  WHERE id = p_idea_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Content idea not found or already processed';
  END IF;

  -- Check if already a duplicate
  IF v_idea.is_duplicate THEN
    RAISE EXCEPTION 'Cannot approve duplicate content';
  END IF;

  -- Update idea status
  UPDATE content_ideas
  SET
    status = 'approved',
    approved_at = NOW(),
    approved_by = p_approved_by
  WHERE id = p_idea_id;

  -- Add to hunt queue
  INSERT INTO hunt_queue (
    tool_name,
    context_title,
    priority,
    source,
    hunt_type
  )
  VALUES (
    v_idea.tool_name,
    v_idea.context_query,
    p_priority,
    'strategy',
    'full'
  )
  ON CONFLICT (tool_name, status) WHERE status IN ('pending', 'claimed', 'processing')
  DO NOTHING
  RETURNING id INTO v_queue_id;

  -- Update idea to queued
  IF v_queue_id IS NOT NULL THEN
    UPDATE content_ideas
    SET status = 'queued'
    WHERE id = p_idea_id;
  END IF;

  RETURN v_queue_id;
END;
$$;

-- 4.12 bulk_approve_ideas
CREATE OR REPLACE FUNCTION bulk_approve_ideas(
  p_min_roi DECIMAL DEFAULT 5.0,
  p_max_count INT DEFAULT 20,
  p_approved_by TEXT DEFAULT 'system'
)
RETURNS TABLE(
  approved_count INT,
  queue_ids UUID[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_idea RECORD;
  v_queue_ids UUID[] := ARRAY[]::UUID[];
  v_queue_id UUID;
  v_count INT := 0;
BEGIN
  -- Loop through high ROI, non-duplicate ideas
  FOR v_idea IN
    SELECT ci.id
    FROM content_ideas ci
    WHERE ci.status = 'pending'
      AND NOT ci.is_duplicate
      AND ci.roi_score >= p_min_roi
    ORDER BY ci.roi_score DESC
    LIMIT p_max_count
  LOOP
    -- Approve and queue each idea
    BEGIN
      v_queue_id := approve_content_idea(v_idea.id, p_approved_by, 75);
      IF v_queue_id IS NOT NULL THEN
        v_queue_ids := array_append(v_queue_ids, v_queue_id);
        v_count := v_count + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Log error but continue
      RAISE NOTICE 'Failed to approve idea %: %', v_idea.id, SQLERRM;
    END;
  END LOOP;

  RETURN QUERY SELECT v_count, v_queue_ids;
END;
$$;

-- 4.13 create_import_batch
CREATE OR REPLACE FUNCTION create_import_batch(
  p_filename TEXT,
  p_total_rows INT,
  p_created_by TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_batch_id UUID;
BEGIN
  INSERT INTO import_batches (filename, total_rows, created_by)
  VALUES (p_filename, p_total_rows, p_created_by)
  RETURNING id INTO v_batch_id;

  RETURN v_batch_id;
END;
$$;

-- 4.14 complete_import_batch
CREATE OR REPLACE FUNCTION complete_import_batch(
  p_batch_id UUID,
  p_status TEXT DEFAULT 'completed'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE import_batches
  SET
    status = p_status,
    completed_at = NOW(),
    -- Count actual results from content_ideas
    imported_rows = (SELECT COUNT(*) FROM content_ideas WHERE import_batch_id = p_batch_id),
    duplicate_rows = (SELECT COUNT(*) FROM content_ideas WHERE import_batch_id = p_batch_id AND is_duplicate)
  WHERE id = p_batch_id;
END;
$$;

-- 4.15 get_verification_stats
CREATE OR REPLACE FUNCTION get_verification_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pending_count INT;
  v_oldest_days INT;
  v_unique_tools INT;
BEGIN
  -- Count pending corrections
  SELECT COUNT(*) INTO v_pending_count
  FROM corrections
  WHERE status = 'pending' AND ai_verified = FALSE;

  -- Get age of oldest correction in days
  SELECT EXTRACT(DAY FROM NOW() - MIN(created_at))::INT INTO v_oldest_days
  FROM corrections
  WHERE status = 'pending' AND ai_verified = FALSE;

  -- Count unique tools with pending corrections
  SELECT COUNT(DISTINCT tool_id) INTO v_unique_tools
  FROM corrections
  WHERE status = 'pending' AND ai_verified = FALSE;

  RETURN jsonb_build_object(
    'pending_count', COALESCE(v_pending_count, 0),
    'oldest_days', COALESCE(v_oldest_days, 0),
    'unique_tools', COALESCE(v_unique_tools, 0),
    'should_verify', (
      COALESCE(v_pending_count, 0) >= 50 OR
      COALESCE(v_oldest_days, 0) > 30
    )
  );
END;
$$;

-- =================================================================
-- 5. GRANT EXECUTE PERMISSIONS
-- Ensure the functions can be called by appropriate roles
-- =================================================================

-- Public functions (called from client)
GRANT EXECUTE ON FUNCTION cast_vote TO anon, authenticated;
GRANT EXECUTE ON FUNCTION check_rate_limit TO anon, authenticated;

-- Admin/service functions (service_role only)
GRANT EXECUTE ON FUNCTION cleanup_rate_limits TO service_role;
GRANT EXECUTE ON FUNCTION validate_admin_session TO service_role;
GRANT EXECUTE ON FUNCTION create_admin_session TO service_role;
GRANT EXECUTE ON FUNCTION revoke_admin_session TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_admin_sessions TO service_role;
GRANT EXECUTE ON FUNCTION check_hard_duplicate TO service_role;
GRANT EXECUTE ON FUNCTION check_semantic_duplicate TO service_role;
GRANT EXECUTE ON FUNCTION analyze_content_ideas TO service_role;
GRANT EXECUTE ON FUNCTION approve_content_idea TO service_role;
GRANT EXECUTE ON FUNCTION bulk_approve_ideas TO service_role;
GRANT EXECUTE ON FUNCTION create_import_batch TO service_role;
GRANT EXECUTE ON FUNCTION complete_import_batch TO service_role;
GRANT EXECUTE ON FUNCTION get_verification_stats TO service_role;

-- =================================================================
-- 6. DOCUMENTATION
-- =================================================================

COMMENT ON POLICY "No public access" ON content_ideas IS 'Admin-only table - use service_role key';
COMMENT ON POLICY "No public access" ON import_batches IS 'Admin-only table - use service_role key';
COMMENT ON POLICY "No public access" ON admin_sessions IS 'Security-critical table - use service_role key';
COMMENT ON POLICY "No public access" ON rate_limits IS 'System table - use service_role key';
COMMENT ON POLICY "No public access" ON verification_batches IS 'Admin-only table - use service_role key';

-- =================================================================
-- NOTE: Extensions in public schema
-- =================================================================
-- The vector and pg_trgm extensions are installed in the public schema.
-- Moving them requires careful consideration as it could break existing
-- functionality. This is a known limitation that can be addressed in a
-- future migration if needed by:
-- 1. Creating an 'extensions' schema
-- 2. Moving extensions to that schema
-- 3. Adding 'extensions' to the search_path
-- =================================================================
