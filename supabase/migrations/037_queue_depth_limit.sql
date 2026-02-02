-- Queue Depth Limit (Backpressure)
-- Prevents unbounded queue growth during API outages

-- Function to check queue depth before insert
CREATE OR REPLACE FUNCTION check_hunt_queue_depth()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  pending_count INT;
  max_queue_depth INT := 10000;
BEGIN
  -- Only check for new pending items (not updates)
  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
    -- Count current pending items
    SELECT COUNT(*) INTO pending_count
    FROM hunt_queue
    WHERE status = 'pending';

    -- Enforce limit
    IF pending_count >= max_queue_depth THEN
      RAISE EXCEPTION 'Queue depth limit reached (% pending items). Backpressure activated - please retry later.', pending_count
        USING HINT = 'Wait for queue to drain or increase max_queue_depth limit',
              ERRCODE = 'P0001';  -- raise_exception error code
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger to enforce queue depth limit
DROP TRIGGER IF EXISTS enforce_hunt_queue_depth ON hunt_queue;
CREATE TRIGGER enforce_hunt_queue_depth
  BEFORE INSERT ON hunt_queue
  FOR EACH ROW
  EXECUTE FUNCTION check_hunt_queue_depth();

COMMENT ON FUNCTION check_hunt_queue_depth IS 'Enforces 10K pending item limit to prevent unbounded queue growth';
COMMENT ON TRIGGER enforce_hunt_queue_depth ON hunt_queue IS 'Activates backpressure when queue reaches 10K pending items';

-- Add queue metrics view for monitoring
CREATE OR REPLACE VIEW hunt_queue_metrics AS
SELECT
  COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
  COUNT(*) FILTER (WHERE status = 'processing') as processing_count,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
  ROUND(COUNT(*) FILTER (WHERE status = 'pending')::numeric / 10000 * 100, 2) as queue_utilization_pct,
  CASE
    WHEN COUNT(*) FILTER (WHERE status = 'pending') >= 9000 THEN 'CRITICAL'
    WHEN COUNT(*) FILTER (WHERE status = 'pending') >= 7000 THEN 'WARNING'
    ELSE 'HEALTHY'
  END as queue_health
FROM hunt_queue;

COMMENT ON VIEW hunt_queue_metrics IS 'Real-time queue health monitoring (utilization and backpressure status)';
