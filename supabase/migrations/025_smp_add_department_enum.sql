-- ============================================================================
-- MIGRATION 025a: Add 'department' to category_type enum
--
-- Must be separate migration because new enum values can't be used
-- in the same transaction they're added.
-- ============================================================================

-- Add 'department' to category_type enum
DO $$
BEGIN
  -- Check if 'department' value already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'department'
    AND enumtypid = 'category_type'::regtype
  ) THEN
    ALTER TYPE category_type ADD VALUE 'department';
  END IF;
END
$$;
