-- Migration: Hybrid Search with Category Guardrails
-- Prevents "semantic smudge" where functionally different tools appear similar
-- Strategy: Vector similarity + hard category filter as a safety net

CREATE OR REPLACE FUNCTION match_items (
  query_embedding vector(768),
  match_threshold float,
  match_count int,
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
    -- The "Hybrid" Logic: filter by primary_function if provided
    AND (
      filter_category IS NULL
      OR
      items.specs->'taxonomy'->>'primary_function' = filter_category
    )
    -- Exclude the source item
    AND (
      exclude_item_id IS NULL
      OR
      items.id != exclude_item_id
    )
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION match_items IS
'Hybrid search combining vector similarity with category guardrails.
Primary use: finding alternatives (same category) or related tools (cross-category fallback).
The filter_category parameter acts as a "safety net" to prevent semantic smudge.';
