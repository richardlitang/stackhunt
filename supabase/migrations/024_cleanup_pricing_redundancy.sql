-- ============================================================================
-- MIGRATION 024: Cleanup Pricing Redundancy
--
-- PROBLEM: Pricing data scattered across 8 places, causing sync issues
-- SOLUTION: Keep ONLY pricing_type column + specs.pricing_data JSONB
--
-- Removes:
-- - effective_starting_price_monthly/annual (computed from pricing_data)
-- - normalized_price_per_seat_monthly/annual (computed)
-- - pricing_comparison_tier (computed)
-- - pricing_comparison_plan_id (computed)
-- - specs.pricing_model (duplicate of pricing_type column)
--
-- Creates:
-- - Helper functions to compute these on-demand
-- ============================================================================

-- ============================================================================
-- PART 1: Remove Redundant Columns
-- ============================================================================

-- Drop computed pricing columns
ALTER TABLE items DROP COLUMN IF EXISTS effective_starting_price_monthly;
ALTER TABLE items DROP COLUMN IF EXISTS effective_starting_price_annual;
ALTER TABLE items DROP COLUMN IF EXISTS normalized_price_per_seat_monthly;
ALTER TABLE items DROP COLUMN IF EXISTS normalized_price_per_seat_annual;
ALTER TABLE items DROP COLUMN IF EXISTS pricing_comparison_tier;
ALTER TABLE items DROP COLUMN IF EXISTS pricing_comparison_plan_id;

COMMENT ON TABLE items IS 'Migration 024: Removed redundant pricing columns. Use get_effective_pricing() function or extract from specs.pricing_data directly.';

-- ============================================================================
-- PART 2: Helper Functions for Common Pricing Queries
-- ============================================================================

-- Get the cheapest monthly plan price
CREATE OR REPLACE FUNCTION get_starting_price_monthly(p_item_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_price NUMERIC;
BEGIN
  -- Extract cheapest monthly price from specs.pricing_data.plans[]
  SELECT MIN((plan->>'price_monthly')::numeric)
  INTO v_price
  FROM items,
       jsonb_array_elements(specs->'pricing_data'->'plans') AS plan
  WHERE items.id = p_item_id
    AND plan->>'price_monthly' IS NOT NULL
    AND (plan->>'price_monthly')::numeric > 0;

  RETURN v_price;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_starting_price_monthly IS 'Returns cheapest monthly price from pricing_data.plans, or NULL if no paid plans';

-- Get the cheapest annual plan price
CREATE OR REPLACE FUNCTION get_starting_price_annual(p_item_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_price NUMERIC;
BEGIN
  SELECT MIN((plan->>'price_annual')::numeric)
  INTO v_price
  FROM items,
       jsonb_array_elements(specs->'pricing_data'->'plans') AS plan
  WHERE items.id = p_item_id
    AND plan->>'price_annual' IS NOT NULL
    AND (plan->>'price_annual')::numeric > 0;

  RETURN v_price;
END;
$$ LANGUAGE plpgsql STABLE;

-- Get normalized per-seat monthly price (for comparisons)
CREATE OR REPLACE FUNCTION get_per_seat_price_monthly(p_item_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_price NUMERIC;
BEGIN
  -- Find cheapest per-user monthly price
  SELECT MIN((plan->>'price_per_unit')::numeric)
  INTO v_price
  FROM items,
       jsonb_array_elements(specs->'pricing_data'->'plans') AS plan
  WHERE items.id = p_item_id
    AND plan->>'scaling_unit' IN ('user', 'seat', 'member')
    AND plan->>'price_per_unit' IS NOT NULL
    AND (plan->>'price_per_unit')::numeric > 0;

  RETURN v_price;
END;
$$ LANGUAGE plpgsql STABLE;

-- Get the "business" tier plan for comparisons (most common comparison point)
CREATE OR REPLACE FUNCTION get_comparison_plan(p_item_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_plan JSONB;
BEGIN
  -- Try to find "Business" or "Team" plan first
  SELECT plan
  INTO v_plan
  FROM items,
       jsonb_array_elements(specs->'pricing_data'->'plans') AS plan
  WHERE items.id = p_item_id
    AND (
      plan->>'name' ILIKE '%business%'
      OR plan->>'name' ILIKE '%team%'
      OR plan->>'target_audience' = 'business'
    )
  LIMIT 1;

  -- Fallback: Get middle-tier plan (not free, not enterprise)
  IF v_plan IS NULL THEN
    WITH numbered_plans AS (
      SELECT plan, ROW_NUMBER() OVER (ORDER BY (plan->>'price_monthly')::numeric) AS rn
      FROM items,
           jsonb_array_elements(specs->'pricing_data'->'plans') AS plan
      WHERE items.id = p_item_id
        AND (plan->>'is_enterprise')::boolean = false
        AND (plan->>'price_monthly')::numeric > 0
    )
    SELECT plan INTO v_plan
    FROM numbered_plans
    WHERE rn = (SELECT CEIL(COUNT(*) / 2.0) FROM numbered_plans);
  END IF;

  RETURN v_plan;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_comparison_plan IS 'Returns the "business" tier plan for apples-to-apples comparisons, or middle-tier if no business plan exists';

-- ============================================================================
-- PART 3: SSO Tax Calculator (for Scale-Up CTO persona)
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_sso_tax(p_item_id UUID)
RETURNS TABLE (
  base_plan_name TEXT,
  base_price_monthly NUMERIC,
  sso_plan_name TEXT,
  sso_price_monthly NUMERIC,
  sso_tax_pct NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH base_plan AS (
    -- Cheapest plan WITHOUT SSO
    SELECT
      plan->>'name' AS name,
      (plan->>'price_monthly')::numeric AS price
    FROM items,
         jsonb_array_elements(specs->'pricing_data'->'plans') AS plan
    WHERE items.id = p_item_id
      AND (plan->>'includes_sso')::boolean = false
      AND (plan->>'price_monthly')::numeric > 0
    ORDER BY (plan->>'price_monthly')::numeric ASC
    LIMIT 1
  ),
  sso_plan AS (
    -- Cheapest plan WITH SSO
    SELECT
      plan->>'name' AS name,
      (plan->>'price_monthly')::numeric AS price
    FROM items,
         jsonb_array_elements(specs->'pricing_data'->'plans') AS plan
    WHERE items.id = p_item_id
      AND (plan->>'includes_sso')::boolean = true
      AND (plan->>'price_monthly')::numeric > 0
    ORDER BY (plan->>'price_monthly')::numeric ASC
    LIMIT 1
  )
  SELECT
    base_plan.name,
    base_plan.price,
    sso_plan.name,
    sso_plan.price,
    ROUND(((sso_plan.price - base_plan.price) / base_plan.price * 100)::numeric, 1) AS tax_pct
  FROM base_plan, sso_plan
  WHERE base_plan.price IS NOT NULL AND sso_plan.price IS NOT NULL;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION calculate_sso_tax IS 'Computes the % price increase to get SSO (for Scale-Up CTO persona)';

-- ============================================================================
-- PART 4: Create Index on pricing_data for Fast Queries
-- ============================================================================

-- Index for fast extraction of pricing data
CREATE INDEX IF NOT EXISTS idx_items_pricing_data ON items USING gin ((specs->'pricing_data'));

-- Index for fast filtering by pricing model
CREATE INDEX IF NOT EXISTS idx_items_specs_pricing_model ON items ((specs->>'pricing_model'));

-- ============================================================================
-- PART 5: Grants
-- ============================================================================

GRANT EXECUTE ON FUNCTION get_starting_price_monthly TO anon;
GRANT EXECUTE ON FUNCTION get_starting_price_annual TO anon;
GRANT EXECUTE ON FUNCTION get_per_seat_price_monthly TO anon;
GRANT EXECUTE ON FUNCTION get_comparison_plan TO anon;
GRANT EXECUTE ON FUNCTION calculate_sso_tax TO anon;

-- ============================================================================
-- PART 6: Migration Notes
-- ============================================================================

COMMENT ON SCHEMA public IS 'Migration 024: Removed 6 redundant pricing columns. Pricing data now sourced from specs.pricing_data only. Use helper functions for computed values.';
