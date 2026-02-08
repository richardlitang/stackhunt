-- Pricing V2: Canonical meter registry
-- Purpose: Prevent unit drift and ensure all pricing computation references canonical meter IDs.

CREATE TABLE IF NOT EXISTS pricing_meter_registry (
  meter_id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  unit_ucum TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('team', 'usage', 'resource', 'audience', 'money')),
  aliases TEXT[] NOT NULL DEFAULT '{}',
  normalization_factor NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pricing_meter_registry_category
  ON pricing_meter_registry(category);

INSERT INTO pricing_meter_registry (meter_id, label, unit_ucum, category, aliases, normalization_factor)
VALUES
  ('seat', 'Seat', '1', 'team', ARRAY['seat','seats','user','users','member','members','agent','agents'], 1),
  ('contact', 'Contact', '{contact}', 'audience', ARRAY['contact','contacts','subscriber','subscribers','lead','leads'], 1),
  ('request', 'Request', '{request}', 'usage', ARRAY['request','requests','api_call','api calls','api request','api requests'], 1),
  ('token', 'Token', '{token}', 'usage', ARRAY['token','tokens'], 1),
  ('storage_bytes', 'Storage', 'By', 'resource', ARRAY['gb','gib','storage','storage gb','bytes','by'], 1),
  ('hour', 'Hour', 'h', 'usage', ARRAY['hour','hours','hr','hrs'], 1),
  ('ad_spend', 'Ad Spend', '{money}', 'money', ARRAY['ad_spend','ad spend','spend','media spend'], 1)
ON CONFLICT (meter_id) DO UPDATE SET
  label = EXCLUDED.label,
  unit_ucum = EXCLUDED.unit_ucum,
  category = EXCLUDED.category,
  aliases = EXCLUDED.aliases,
  normalization_factor = EXCLUDED.normalization_factor,
  updated_at = NOW();

COMMENT ON TABLE pricing_meter_registry IS
'Canonical meter registry for pricing v2 compute paths. Raw units/labels are normalized to meter_id before pricing math.';

