-- Compiler policy version tracking
-- Purpose: keep deterministic policy contracts versioned and queryable by snapshot jobs.

CREATE TABLE IF NOT EXISTS public.compiler_policy_versions (
  version TEXT PRIMARY KEY,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  activated_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_compiler_policy_versions_active
  ON public.compiler_policy_versions (is_active)
  WHERE is_active = true;

ALTER TABLE public.compiler_policy_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access" ON public.compiler_policy_versions;
CREATE POLICY "Public read access"
  ON public.compiler_policy_versions
  FOR SELECT
  USING (true);

INSERT INTO public.compiler_policy_versions (version, description, is_active, activated_at)
VALUES (
  '2026-02-20.v1',
  'Initial snapshot trust contract: volatility-tier freshness, evidence tiers, conflict semantics, count semantics',
  true,
  NOW()
)
ON CONFLICT (version) DO UPDATE
SET
  description = EXCLUDED.description,
  is_active = true,
  activated_at = COALESCE(public.compiler_policy_versions.activated_at, NOW());

UPDATE public.compiler_policy_versions
SET is_active = false
WHERE version <> '2026-02-20.v1'
  AND is_active = true;

CREATE OR REPLACE VIEW public.active_compiler_policy_version AS
SELECT version, description, created_at, activated_at
FROM public.compiler_policy_versions
WHERE is_active = true
ORDER BY activated_at DESC NULLS LAST, created_at DESC
LIMIT 1;

GRANT SELECT ON public.compiler_policy_versions TO anon, authenticated, service_role;
GRANT SELECT ON public.active_compiler_policy_version TO anon, authenticated, service_role;
