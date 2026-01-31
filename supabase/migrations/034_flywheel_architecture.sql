-- Flywheel Architecture: Track queued tools for context pages
-- Enables "Ghost Card" UI pattern for pending hunts

-- Add queued_tool_ids to contexts table
ALTER TABLE contexts
ADD COLUMN IF NOT EXISTS queued_tool_ids UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS discovery_query TEXT,
ADD COLUMN IF NOT EXISTS last_discovery_at TIMESTAMPTZ;

COMMENT ON COLUMN contexts.queued_tool_ids IS 'Tools currently being hunted for this context (Phase 2 of Flywheel)';
COMMENT ON COLUMN contexts.discovery_query IS 'Search query used for tool discovery';
COMMENT ON COLUMN contexts.last_discovery_at IS 'Last time we ran discovery for this context';

-- Add metadata to hunt_queue for context association
ALTER TABLE hunt_queue
ADD COLUMN IF NOT EXISTS context_id UUID REFERENCES contexts(id),
ADD COLUMN IF NOT EXISTS is_discovery_hunt BOOLEAN DEFAULT false;

COMMENT ON COLUMN hunt_queue.context_id IS 'If this hunt was triggered by context discovery';
COMMENT ON COLUMN hunt_queue.is_discovery_hunt IS 'True if this is a Phase 2 discovery hunt';

-- Function to auto-remove from queued_tool_ids when hunt completes
CREATE OR REPLACE FUNCTION remove_from_queued_tools()
RETURNS TRIGGER AS $$
BEGIN
  -- If this was a discovery hunt that completed successfully
  IF NEW.status = 'completed' AND NEW.context_id IS NOT NULL AND NEW.is_discovery_hunt = true THEN
    -- Remove tool_id from context's queued_tool_ids
    UPDATE contexts
    SET queued_tool_ids = array_remove(queued_tool_ids, NEW.tool_id)
    WHERE id = NEW.context_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-cleanup queued tools
DROP TRIGGER IF EXISTS cleanup_queued_tools ON hunt_queue;
CREATE TRIGGER cleanup_queued_tools
AFTER UPDATE OF status ON hunt_queue
FOR EACH ROW
WHEN (NEW.status = 'completed')
EXECUTE FUNCTION remove_from_queued_tools();

-- Index for faster queued tool lookups
CREATE INDEX IF NOT EXISTS idx_contexts_queued_tools ON contexts USING GIN (queued_tool_ids);
CREATE INDEX IF NOT EXISTS idx_hunt_queue_context ON hunt_queue(context_id) WHERE context_id IS NOT NULL;
