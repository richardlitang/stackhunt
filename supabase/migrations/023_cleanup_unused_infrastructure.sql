-- ============================================================================
-- MIGRATION 023: Cleanup Unused Infrastructure
--
-- Removes tables, views, and functions that were created but never used:
-- - keyword_performance table (ROI validation never implemented)
-- - keyword_roi_analysis view (depends on keyword_performance)
-- - should_import_keyword function (filtering logic never used)
-- - calculate_page_opportunity function (competitor scoring never used)
-- ============================================================================

-- Drop view first (depends on keyword_performance)
DROP VIEW IF EXISTS keyword_roi_analysis;

-- Drop the table
DROP TABLE IF EXISTS keyword_performance;

-- Drop orphaned functions
DROP FUNCTION IF EXISTS should_import_keyword(integer, integer, numeric, keyword_type);
DROP FUNCTION IF EXISTS calculate_page_opportunity(numeric, integer, integer);

-- ============================================================================
-- Document what was removed and why
-- ============================================================================
COMMENT ON SCHEMA public IS 'Cleanup 023: Removed keyword_performance table, keyword_roi_analysis view, should_import_keyword and calculate_page_opportunity functions - never used in production code';
