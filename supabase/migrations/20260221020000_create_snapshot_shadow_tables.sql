-- Snapshot compiler shadow schema (no serving cutover)
-- Purpose: create deterministic storage for /best and /compare compiled outputs.

CREATE TABLE IF NOT EXISTS public.context_specs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  context_slug TEXT NOT NULL UNIQUE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  schema_id TEXT NOT NULL,
  modifiers JSONB NOT NULL DEFAULT '[]'::jsonb,
  weights_override JSONB,
  hard_filters_override JSONB,
  penalties_override JSONB,
  archetypes_override JSONB,
  editorial_override JSONB,
  version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.best_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  context_slug TEXT NOT NULL,
  version INT NOT NULL DEFAULT 1,
  policy_version TEXT NOT NULL DEFAULT '2026-02-20.v1',
  spec_version TEXT,
  snapshot_json JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.compare_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  schema_id TEXT,
  tool_a_slug TEXT NOT NULL,
  tool_b_slug TEXT NOT NULL,
  spec_key TEXT,
  version INT NOT NULL DEFAULT 1,
  policy_version TEXT NOT NULL DEFAULT '2026-02-20.v1',
  spec_version TEXT,
  snapshot_json JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT compare_snapshots_order CHECK (tool_a_slug < tool_b_slug)
);

CREATE INDEX IF NOT EXISTS idx_best_snapshots_lookup
  ON public.best_snapshots(context_slug, status, published_at DESC, computed_at DESC);

CREATE INDEX IF NOT EXISTS idx_compare_snapshots_lookup
  ON public.compare_snapshots(tool_a_slug, tool_b_slug, status, published_at DESC, computed_at DESC);

CREATE INDEX IF NOT EXISTS idx_compare_snapshots_spec_key
  ON public.compare_snapshots(spec_key, status, published_at DESC)
  WHERE spec_key IS NOT NULL;

CREATE OR REPLACE VIEW public.best_snapshots_published_v AS
SELECT *
FROM public.best_snapshots
WHERE status = 'published';

CREATE OR REPLACE VIEW public.compare_snapshots_published_v AS
SELECT *
FROM public.compare_snapshots
WHERE status = 'published';

ALTER TABLE public.context_specs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.best_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compare_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access" ON public.context_specs;
DROP POLICY IF EXISTS "Public read access" ON public.best_snapshots;
DROP POLICY IF EXISTS "Public read access" ON public.compare_snapshots;

CREATE POLICY "Public read access" ON public.context_specs FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.best_snapshots FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.compare_snapshots FOR SELECT USING (true);

GRANT SELECT ON public.context_specs TO anon, authenticated, service_role;
GRANT SELECT ON public.best_snapshots TO anon, authenticated, service_role;
GRANT SELECT ON public.compare_snapshots TO anon, authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON public.context_specs TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.best_snapshots TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.compare_snapshots TO service_role;
GRANT SELECT ON public.best_snapshots_published_v TO anon, authenticated, service_role;
GRANT SELECT ON public.compare_snapshots_published_v TO anon, authenticated, service_role;
