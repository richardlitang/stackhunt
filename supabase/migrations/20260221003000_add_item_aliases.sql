-- Canonical item alias support
-- Purpose: stabilize identity across rebrands/synonyms/domain variants for compare/best compilation.

CREATE TABLE IF NOT EXISTS public.item_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  alias_normalized TEXT GENERATED ALWAYS AS (lower(trim(alias))) STORED,
  alias_type TEXT NOT NULL DEFAULT 'name_variant',
  confidence NUMERIC(3, 2) NOT NULL DEFAULT 1.0 CHECK (confidence >= 0 AND confidence <= 1),
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT item_aliases_alias_nonempty CHECK (length(trim(alias)) > 0),
  CONSTRAINT item_aliases_alias_type_valid CHECK (
    alias_type IN ('name_variant', 'slug_variant', 'domain_variant', 'legacy_brand')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_item_aliases_alias_normalized
  ON public.item_aliases(alias_normalized);

CREATE INDEX IF NOT EXISTS idx_item_aliases_item_id
  ON public.item_aliases(item_id);

CREATE OR REPLACE FUNCTION public.item_aliases_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_item_aliases_updated_at ON public.item_aliases;
CREATE TRIGGER trigger_item_aliases_updated_at
  BEFORE UPDATE ON public.item_aliases
  FOR EACH ROW
  EXECUTE FUNCTION public.item_aliases_set_updated_at();

ALTER TABLE public.item_aliases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access" ON public.item_aliases;
CREATE POLICY "Public read access"
  ON public.item_aliases
  FOR SELECT
  USING (true);

GRANT SELECT ON public.item_aliases TO anon, authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON public.item_aliases TO service_role;
