-- ============================================================================
-- Migration 026: Unify Review Schema
-- ============================================================================
-- Problem: Discovery hunts store analysis in items.specs, contextual hunts in reviews
-- Solution: Make context_id nullable, migrate all analysis to reviews
-- Benefit: Consistent data structure, all pros/cons in one place
-- ============================================================================

-- Step 1: Make context_id nullable (allow reviews without context)
ALTER TABLE reviews
  ALTER COLUMN context_id DROP NOT NULL;

-- Step 2: Drop the unique constraint (can't have multiple NULL context_ids for same item)
-- and recreate it to allow NULL
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS unique_item_context;

-- Step 3: Add new unique constraint that allows NULL context_id
-- (Postgres treats NULL as distinct, so multiple NULL values are allowed)
-- But we still want to prevent duplicate item+context pairs when context IS NOT NULL
CREATE UNIQUE INDEX unique_item_context_not_null
  ON reviews(item_id, context_id)
  WHERE context_id IS NOT NULL;

-- Step 4: Add quality field to reviews (from items.metadata.meta.data_quality)
ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS quality TEXT CHECK (quality IN ('high', 'medium', 'low'));

-- Step 5: Migrate orphaned analysis from items.specs to reviews
-- Only migrate items that have specs.pros or specs.cons but no reviews
INSERT INTO reviews (
  item_id,
  context_id,
  score,
  pros,
  cons,
  sources,
  quality,
  status,
  created_at,
  updated_at
)
SELECT
  i.id as item_id,
  NULL as context_id, -- Discovery hunt, no context
  COALESCE(
    (i.metadata->'analysis'->>'score')::int,
    (i.metadata->'user_advocate'->>'score')::int,
    NULL
  ) as score,
  COALESCE(i.specs->'pros', '[]'::jsonb) as pros,
  COALESCE(i.specs->'cons', '[]'::jsonb) as cons,
  -- Extract and deduplicate sources from pros/cons
  (
    SELECT jsonb_agg(DISTINCT jsonb_build_object(
      'url', elem->>'source_url',
      'type', elem->>'source_type'
    ))
    FROM (
      SELECT jsonb_array_elements(COALESCE(i.specs->'pros', '[]'::jsonb)) as elem
      UNION ALL
      SELECT jsonb_array_elements(COALESCE(i.specs->'cons', '[]'::jsonb)) as elem
    ) all_claims
    WHERE elem->>'source_url' IS NOT NULL
  ) as sources,
  COALESCE(i.metadata->'meta'->>'data_quality', 'medium') as quality,
  'draft' as status, -- Discovery hunts default to draft
  i.created_at,
  i.updated_at
FROM items i
WHERE
  -- Has analysis data in specs
  (
    (i.specs->'pros' IS NOT NULL AND jsonb_array_length(i.specs->'pros') > 0)
    OR
    (i.specs->'cons' IS NOT NULL AND jsonb_array_length(i.specs->'cons') > 0)
  )
  -- But no existing reviews
  AND NOT EXISTS (
    SELECT 1 FROM reviews r WHERE r.item_id = i.id
  );

-- Step 6: Add comment for future reference
COMMENT ON COLUMN reviews.context_id IS 'Context for this review. NULL = general/discovery review, non-NULL = context-specific review';

-- Step 7: Update statistics
ANALYZE reviews;
