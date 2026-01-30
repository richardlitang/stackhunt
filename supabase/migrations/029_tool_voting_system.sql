-- Tool Voting System
-- Allows users to upvote/recommend tools they find useful

CREATE TABLE IF NOT EXISTS tool_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Tool reference
  tool_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,

  -- Vote type (1 = upvote/recommend, -1 = downvote/not useful)
  vote_type SMALLINT NOT NULL CHECK (vote_type IN (1, -1)),

  -- Voter identity (hashed for privacy + deduplication)
  ip_hash TEXT NOT NULL,
  fingerprint_hash TEXT,

  -- Anti-spam: Turnstile token (optional but recommended)
  turnstile_token TEXT,
  turnstile_verified BOOLEAN DEFAULT FALSE,

  -- Prevent duplicate votes
  UNIQUE(tool_id, ip_hash, fingerprint_hash)
);

-- Indexes
CREATE INDEX idx_tool_votes_tool_id ON tool_votes(tool_id);
CREATE INDEX idx_tool_votes_created_at ON tool_votes(created_at DESC);
CREATE INDEX idx_tool_votes_ip_hash ON tool_votes(ip_hash);

-- RLS Policies
ALTER TABLE tool_votes ENABLE ROW LEVEL SECURITY;

-- Anyone can vote (spam prevention via application logic)
CREATE POLICY "Anyone can vote on tools"
  ON tool_votes
  FOR INSERT
  WITH CHECK (true);

-- Anyone can view vote counts (aggregated)
CREATE POLICY "Anyone can view votes"
  ON tool_votes
  FOR SELECT
  USING (true);

-- Function to get tool vote counts
CREATE OR REPLACE FUNCTION get_tool_vote_counts(p_tool_id UUID)
RETURNS TABLE (
  upvotes BIGINT,
  downvotes BIGINT,
  net_score BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE vote_type = 1) AS upvotes,
    COUNT(*) FILTER (WHERE vote_type = -1) AS downvotes,
    SUM(vote_type)::BIGINT AS net_score
  FROM tool_votes
  WHERE tool_id = p_tool_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to handle vote upsert (change vote or add new)
CREATE OR REPLACE FUNCTION upsert_tool_vote(
  p_tool_id UUID,
  p_vote_type SMALLINT,
  p_ip_hash TEXT,
  p_fingerprint_hash TEXT,
  p_turnstile_token TEXT DEFAULT NULL
)
RETURNS TABLE (
  action TEXT,
  upvotes BIGINT,
  downvotes BIGINT,
  net_score BIGINT
) AS $$
DECLARE
  v_existing_vote SMALLINT;
BEGIN
  -- Check for existing vote
  SELECT vote_type INTO v_existing_vote
  FROM tool_votes
  WHERE tool_id = p_tool_id
    AND ip_hash = p_ip_hash
    AND (fingerprint_hash = p_fingerprint_hash OR fingerprint_hash IS NULL);

  IF v_existing_vote IS NOT NULL THEN
    IF v_existing_vote = p_vote_type THEN
      -- Same vote - remove it (toggle off)
      DELETE FROM tool_votes
      WHERE tool_id = p_tool_id
        AND ip_hash = p_ip_hash
        AND (fingerprint_hash = p_fingerprint_hash OR fingerprint_hash IS NULL);

      RETURN QUERY
      SELECT 'removed'::TEXT, upvotes, downvotes, net_score
      FROM get_tool_vote_counts(p_tool_id);
    ELSE
      -- Different vote - update it
      UPDATE tool_votes
      SET vote_type = p_vote_type,
          turnstile_token = p_turnstile_token,
          created_at = now()
      WHERE tool_id = p_tool_id
        AND ip_hash = p_ip_hash
        AND (fingerprint_hash = p_fingerprint_hash OR fingerprint_hash IS NULL);

      RETURN QUERY
      SELECT 'changed'::TEXT, upvotes, downvotes, net_score
      FROM get_tool_vote_counts(p_tool_id);
    END IF;
  ELSE
    -- New vote
    INSERT INTO tool_votes (tool_id, vote_type, ip_hash, fingerprint_hash, turnstile_token)
    VALUES (p_tool_id, p_vote_type, p_ip_hash, p_fingerprint_hash, p_turnstile_token);

    RETURN QUERY
    SELECT 'added'::TEXT, upvotes, downvotes, net_score
    FROM get_tool_vote_counts(p_tool_id);
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE tool_votes IS 'User votes/recommendations for tools';
COMMENT ON FUNCTION get_tool_vote_counts IS 'Get aggregated vote counts for a tool';
COMMENT ON FUNCTION upsert_tool_vote IS 'Add, change, or remove a vote (toggle behavior)';
