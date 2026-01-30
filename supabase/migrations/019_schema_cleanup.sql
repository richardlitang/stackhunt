-- ============================================================================
-- MIGRATION 019: Schema Cleanup
-- Removes unused tables and duplicate functions
-- ============================================================================

-- Drop unused tables (never implemented features)
DROP TABLE IF EXISTS prompt_versions CASCADE;
DROP TABLE IF EXISTS prompts CASCADE;
DROP TABLE IF EXISTS admin_users CASCADE;

-- Drop duplicate/dead queue functions (replaced by newer versions)
DROP FUNCTION IF EXISTS claim_next_hunt_job(text);
DROP FUNCTION IF EXISTS complete_hunt_job(uuid, uuid, uuid, uuid);
DROP FUNCTION IF EXISTS complete_queue_item(uuid, uuid, uuid, uuid);
DROP FUNCTION IF EXISTS fail_hunt_job(uuid, text, jsonb);
DROP FUNCTION IF EXISTS fail_queue_item(uuid, text);

-- Drop orphaned trigger function (prompts table dropped)
DROP FUNCTION IF EXISTS save_prompt_version() CASCADE;
