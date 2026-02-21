-- Canonical Fact Pack storage for item/tool ETL outputs.
-- Purpose: keep structured facts + evidence + quality snapshots separate from prose reviews.

CREATE TABLE IF NOT EXISTS public.item_fact_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  schema_id TEXT NOT NULL,
  version INT NOT NULL DEFAULT 1 CHECK (version > 0),
  facts_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  evidence_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  quality_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT item_fact_packs_unique_item_schema_version UNIQUE (item_id, schema_id, version)
);

CREATE INDEX IF NOT EXISTS idx_item_fact_packs_item_id
  ON public.item_fact_packs(item_id);

CREATE INDEX IF NOT EXISTS idx_item_fact_packs_schema_id
  ON public.item_fact_packs(schema_id);

CREATE INDEX IF NOT EXISTS idx_item_fact_packs_checked_at
  ON public.item_fact_packs(checked_at DESC);

CREATE OR REPLACE FUNCTION public.item_fact_packs_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_item_fact_packs_updated_at ON public.item_fact_packs;
CREATE TRIGGER trigger_item_fact_packs_updated_at
  BEFORE UPDATE ON public.item_fact_packs
  FOR EACH ROW
  EXECUTE FUNCTION public.item_fact_packs_set_updated_at();

-- Compatibility view for "tool_fact_packs" terminology used in roadmap docs.
CREATE OR REPLACE VIEW public.tool_fact_packs AS
SELECT *
FROM public.item_fact_packs;

ALTER TABLE public.item_fact_packs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access" ON public.item_fact_packs;
CREATE POLICY "Public read access"
  ON public.item_fact_packs
  FOR SELECT
  USING (true);

GRANT SELECT ON public.item_fact_packs TO anon, authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON public.item_fact_packs TO service_role;
GRANT SELECT ON public.tool_fact_packs TO anon, authenticated, service_role;
