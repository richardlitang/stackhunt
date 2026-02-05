-- ==========================================================================
-- MIGRATION 044: Context Similarity Lookup
--
-- Adds a pg_trgm-backed function to find similar contexts without loading
-- the full contexts table into application memory.
-- ==========================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE OR REPLACE FUNCTION find_similar_context(
  p_context_title TEXT,
  p_threshold NUMERIC DEFAULT 0.9
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  similarity NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.title,
    similarity(c.title, p_context_title) AS similarity
  FROM contexts c
  WHERE similarity(c.title, p_context_title) >= p_threshold
  ORDER BY similarity DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION find_similar_context(TEXT, NUMERIC) IS
'Finds the most similar context title using pg_trgm similarity and a threshold.';
