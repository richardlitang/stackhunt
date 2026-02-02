-- Phase Checkpointing for Hunt Queue
-- Enables resuming hunts from the last completed phase to avoid re-running expensive API calls

-- Add checkpoint columns to hunt_queue table
ALTER TABLE hunt_queue
  ADD COLUMN IF NOT EXISTS phase_checkpoint JSONB,
  ADD COLUMN IF NOT EXISTS last_completed_phase INT DEFAULT 0 CHECK (last_completed_phase >= 0 AND last_completed_phase <= 3);

-- RPC to save checkpoint after each phase
CREATE OR REPLACE FUNCTION save_hunt_checkpoint(
  p_queue_id UUID,
  p_phase INT,
  p_checkpoint JSONB
)
RETURNS VOID
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
  WHERE id = p_queue_id;
END;
$$;

-- RPC to clear checkpoint on successful completion
CREATE OR REPLACE FUNCTION clear_hunt_checkpoint(
  p_queue_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE hunt_queue
  SET
    phase_checkpoint = NULL,
    last_completed_phase = 0,
    updated_at = NOW()
  WHERE id = p_queue_id;
END;
$$;

COMMENT ON FUNCTION save_hunt_checkpoint IS 'Save checkpoint after completing a phase (enables resume on failure)';
COMMENT ON FUNCTION clear_hunt_checkpoint IS 'Clear checkpoint after successful hunt completion';
COMMENT ON COLUMN hunt_queue.phase_checkpoint IS 'Serialized phase data for resuming hunts (research/analysis output)';
COMMENT ON COLUMN hunt_queue.last_completed_phase IS 'Last successfully completed phase: 0=none, 1=research, 2=analysis, 3=persistence';
