-- ==========================================================================
-- MIGRATION 045: Batch Category Linking
--
-- Adds an RPC to link an item to multiple categories in one call.
-- ==========================================================================

CREATE OR REPLACE FUNCTION link_item_to_categories(
  p_item_id UUID,
  p_functions TEXT[] DEFAULT '{}',
  p_audiences TEXT[] DEFAULT '{}',
  p_platforms TEXT[] DEFAULT '{}'
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  fn TEXT;
  aud TEXT;
  plat TEXT;
BEGIN
  FOREACH fn IN ARRAY p_functions LOOP
    PERFORM link_item_to_category(p_item_id, fn, 'function');
  END LOOP;

  FOREACH aud IN ARRAY p_audiences LOOP
    PERFORM link_item_to_category(p_item_id, aud, 'audience');
  END LOOP;

  FOREACH plat IN ARRAY p_platforms LOOP
    PERFORM link_item_to_category(p_item_id, plat, 'platform');
  END LOOP;
END;
$$;

COMMENT ON FUNCTION link_item_to_categories(UUID, TEXT[], TEXT[], TEXT[]) IS
'Links an item to multiple function/audience/platform categories in a single RPC call.';
