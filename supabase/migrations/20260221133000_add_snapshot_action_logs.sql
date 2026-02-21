-- Snapshot action audit trail
-- Tracks compile/publish/parity operations for /best and /compare snapshot workflows.

CREATE TABLE IF NOT EXISTS public.snapshot_action_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'denied')),
  actor TEXT,
  details_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_text TEXT,
  request_ip TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_snapshot_action_logs_created_at
  ON public.snapshot_action_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_snapshot_action_logs_action_status
  ON public.snapshot_action_logs(action, status, created_at DESC);

ALTER TABLE public.snapshot_action_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access" ON public.snapshot_action_logs;
CREATE POLICY "Service role full access"
  ON public.snapshot_action_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

REVOKE ALL ON public.snapshot_action_logs FROM anon, authenticated;
GRANT SELECT, INSERT ON public.snapshot_action_logs TO service_role;
