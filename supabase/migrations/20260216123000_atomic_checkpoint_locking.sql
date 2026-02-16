-- ============================================================================
-- MIGRATION: Atomic checkpoint version locking
--
-- Problem:
-- - App-level expected-version checks were non-atomic (read-then-write race).
--
-- Solution:
-- - Move expected-version check into save_hunt_checkpoint() WHERE clause.
-- - Return BOOLEAN to indicate whether the update succeeded.
-- ============================================================================

-- Remove legacy 3-arg signature to avoid ambiguous overloads.
DROP FUNCTION IF EXISTS save_hunt_checkpoint(UUID, INT, JSONB);

CREATE OR REPLACE FUNCTION save_hunt_checkpoint(
  p_queue_id UUID,
  p_phase INT,
  p_checkpoint JSONB,
  p_expected_version INT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE hunt_queue
  SET
    phase_checkpoint = p_checkpoint,
    last_completed_phase = p_phase,
    updated_at = NOW()
  WHERE id = p_queue_id
    AND (
      p_expected_version IS NULL
      OR COALESCE((phase_checkpoint ->> 'version')::INT, 0) = p_expected_version
    );

  RETURN FOUND;
END;
$$;

COMMENT ON FUNCTION save_hunt_checkpoint(UUID, INT, JSONB, INT) IS
'Save checkpoint after completing a phase (atomic version check, returns true on success)';
