-- =================================================================
-- MIGRATION 007: Security Enhancements
-- Rate limiting + admin session tracking
-- =================================================================

-- =================================================================
-- RATE LIMITING
-- Simple table-based rate limiting for Supabase (no Redis needed)
-- =================================================================

CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,           -- IP hash or user identifier
  endpoint TEXT NOT NULL,             -- API endpoint path
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  request_count INT NOT NULL DEFAULT 1,

  -- Unique per identifier + endpoint + time window
  CONSTRAINT unique_rate_limit UNIQUE (identifier, endpoint, window_start)
);

-- Index for fast lookups
CREATE INDEX idx_rate_limits_lookup ON rate_limits (identifier, endpoint, window_start DESC);

-- Auto-cleanup old records (older than 1 hour)
CREATE INDEX idx_rate_limits_cleanup ON rate_limits (window_start);

-- =================================================================
-- RATE LIMIT CHECK FUNCTION
-- Returns: { allowed: boolean, remaining: int, reset_at: timestamp }
-- =================================================================

CREATE OR REPLACE FUNCTION check_rate_limit(
  p_identifier TEXT,
  p_endpoint TEXT,
  p_max_requests INT DEFAULT 10,
  p_window_seconds INT DEFAULT 60
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
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

-- =================================================================
-- CLEANUP FUNCTION (call periodically or via pg_cron)
-- =================================================================

CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
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

-- =================================================================
-- ADMIN SESSIONS (more secure than cookie-only)
-- =================================================================

CREATE TABLE IF NOT EXISTS admin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash TEXT NOT NULL UNIQUE,    -- SHA256 of session token
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_revoked BOOLEAN NOT NULL DEFAULT FALSE
);

-- Index for token lookup
CREATE INDEX idx_admin_sessions_token ON admin_sessions (token_hash) WHERE NOT is_revoked;

-- Index for cleanup
CREATE INDEX idx_admin_sessions_expires ON admin_sessions (expires_at);

-- =================================================================
-- SESSION VALIDATION FUNCTION
-- =================================================================

CREATE OR REPLACE FUNCTION validate_admin_session(
  p_token_hash TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
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

-- =================================================================
-- CREATE SESSION FUNCTION
-- =================================================================

CREATE OR REPLACE FUNCTION create_admin_session(
  p_token_hash TEXT,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_expires_in_days INT DEFAULT 7
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
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

-- =================================================================
-- REVOKE SESSION FUNCTION
-- =================================================================

CREATE OR REPLACE FUNCTION revoke_admin_session(
  p_token_hash TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE admin_sessions
  SET is_revoked = TRUE
  WHERE token_hash = p_token_hash;

  RETURN FOUND;
END;
$$;

-- =================================================================
-- CLEANUP OLD SESSIONS
-- =================================================================

CREATE OR REPLACE FUNCTION cleanup_admin_sessions()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
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

-- =================================================================
-- ADD METADATA COLUMN TO TOOLS (for Knowledge Cards)
-- =================================================================

ALTER TABLE tools ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Index for JSONB queries
CREATE INDEX IF NOT EXISTS idx_tools_metadata ON tools USING GIN (metadata);

-- Comment for documentation
COMMENT ON COLUMN tools.metadata IS 'Structured facts extracted by Hunter (Knowledge Card)';
