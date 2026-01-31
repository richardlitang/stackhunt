-- ==========================================================================
-- MIGRATION 031: Align embeddings to 768 dimensions (Gemini text-embedding-004)
--
-- This migration standardizes embeddings across items/content_ideas and
-- updates semantic functions to accept vector(768).
-- NOTE: Existing embeddings are cleared and should be re-generated.
-- ==========================================================================

-- 1) Items embedding dimension
ALTER TABLE items
  ALTER COLUMN embedding TYPE vector(768)
  USING NULL;

DROP INDEX IF EXISTS idx_items_embedding;
CREATE INDEX idx_items_embedding
  ON items USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- 2) Content ideas embedding dimension
ALTER TABLE content_ideas
  ALTER COLUMN embedding TYPE vector(768)
  USING NULL;

DROP INDEX IF EXISTS idx_content_ideas_embedding;
CREATE INDEX idx_content_ideas_embedding
  ON content_ideas USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

COMMENT ON COLUMN content_ideas.embedding IS
  'Vector embedding for semantic deduplication (Gemini text-embedding-004, 768 dims)';

-- 3) Drop old function overloads that expect 1536
DROP FUNCTION IF EXISTS match_items(vector(1536), float, int);
DROP FUNCTION IF EXISTS match_items(vector(1536), float, int, text, uuid);
DROP FUNCTION IF EXISTS match_tools(vector(1536), float, int);
DROP FUNCTION IF EXISTS check_semantic_duplicate(vector(1536), DECIMAL);

-- 4) Hybrid search with 768-dim embeddings
CREATE OR REPLACE FUNCTION match_items (
  query_embedding vector(768),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  filter_category text DEFAULT null,
  exclude_item_id uuid DEFAULT null
)
RETURNS TABLE (
  id uuid,
  slug text,
  name text,
  base_score int,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    items.id,
    items.slug,
    items.name,
    items.base_score,
    1 - (items.embedding <=> query_embedding) as similarity
  FROM items
  WHERE 1 - (items.embedding <=> query_embedding) > match_threshold
    AND items.embedding IS NOT NULL
    AND (
      filter_category IS NULL
      OR
      items.specs->'taxonomy'->>'primary_function' = filter_category
    )
    AND (
      exclude_item_id IS NULL
      OR
      items.id != exclude_item_id
    )
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

-- 5) Backward-compatible alias for tools view
CREATE OR REPLACE FUNCTION match_tools(
  query_embedding vector(768),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT,
  short_description TEXT,
  logo_url TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id,
    i.name,
    i.slug,
    i.short_description,
    i.logo_url,
    1 - (i.embedding <=> query_embedding) AS similarity
  FROM items i
  WHERE i.embedding IS NOT NULL
    AND 1 - (i.embedding <=> query_embedding) > match_threshold
  ORDER BY i.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 6) Semantic duplicate check (if used)
CREATE OR REPLACE FUNCTION check_semantic_duplicate(
  p_embedding vector(768),
  p_threshold DECIMAL DEFAULT 0.95
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing_review RECORD;
  v_similarity DECIMAL;
BEGIN
  SELECT
    r.id,
    r.title,
    t.name as tool_name,
    1 - (r.embedding <=> p_embedding) as similarity
  INTO v_existing_review
  FROM reviews r
  JOIN items t ON r.item_id = t.id
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
