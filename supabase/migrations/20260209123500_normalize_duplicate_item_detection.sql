-- Improve duplicate detection for vendor-prefixed product names
-- Example: "Anthropic Claude" should match existing "Claude"

CREATE OR REPLACE FUNCTION normalize_item_name(p_name TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT trim(
    regexp_replace(
      regexp_replace(
        lower(coalesce(p_name, '')),
        '^(anthropic|openai|google|microsoft|meta|xai|amazon|aws)[[:space:]]+',
        ''
      ),
      '[^a-z0-9]+',
      ' ',
      'g'
    )
  );
$$;

CREATE OR REPLACE FUNCTION find_duplicate_item(
  p_tool_name TEXT,
  p_website_url TEXT DEFAULT NULL,
  p_similarity_threshold REAL DEFAULT 0.9
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  website TEXT,
  similarity_score REAL
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  WITH input_name AS (
    SELECT
      lower(coalesce(p_tool_name, '')) AS raw_name,
      normalize_item_name(p_tool_name) AS normalized_name
  ),
  name_matches AS (
    SELECT
      i.id,
      i.name,
      i.website,
      GREATEST(
        similarity(lower(i.name), n.raw_name),
        CASE
          WHEN char_length(n.normalized_name) >= 5
            THEN similarity(normalize_item_name(i.name), n.normalized_name)
          ELSE 0.0
        END,
        CASE
          WHEN char_length(n.normalized_name) >= 5 AND (
            normalize_item_name(i.name) = n.normalized_name
            OR normalize_item_name(i.name) LIKE n.normalized_name || ' %'
            OR n.normalized_name LIKE normalize_item_name(i.name) || ' %'
          ) THEN 0.995
          ELSE 0.0
        END
      ) AS sim_score
    FROM items i
    CROSS JOIN input_name n
    WHERE
      similarity(lower(i.name), n.raw_name) > p_similarity_threshold
      OR (
        char_length(n.normalized_name) >= 5
        AND similarity(normalize_item_name(i.name), n.normalized_name) > LEAST(p_similarity_threshold, 0.72)
      )
      OR (
        char_length(n.normalized_name) >= 5
        AND (
          normalize_item_name(i.name) = n.normalized_name
          OR normalize_item_name(i.name) LIKE n.normalized_name || ' %'
          OR n.normalized_name LIKE normalize_item_name(i.name) || ' %'
        )
      )
    ORDER BY sim_score DESC
    LIMIT 5
  ),
  website_matches AS (
    SELECT
      i.id,
      i.name,
      i.website,
      1.0::REAL AS sim_score
    FROM items i
    WHERE p_website_url IS NOT NULL
      AND lower(substring(i.website from '(?:https?://)?(?:www\\.)?([^/]+)')) =
          lower(substring(p_website_url from '(?:https?://)?(?:www\\.)?([^/]+)'))
    LIMIT 1
  )
  SELECT * FROM website_matches
  UNION ALL
  SELECT * FROM name_matches
  WHERE NOT EXISTS (SELECT 1 FROM website_matches)
  ORDER BY 4 DESC
  LIMIT 1;
END;
$$;

ALTER FUNCTION normalize_item_name(TEXT) SET search_path = public, pg_catalog;
ALTER FUNCTION find_duplicate_item(TEXT, TEXT, REAL) SET search_path = public, pg_catalog;
