-- ============================================================================
-- MIGRATION 026: SaaS Management Platform (SMP) Data Foundation
--
-- Prepares the database for future user stack tracking and cost analysis:
-- 1. Seeds core department categories
-- 2. Adds comparison_insights.substitutability_score for switching recommendations
-- 3. Adds pricing verification tracking to items
--
-- Design: Collect structured pricing data NOW to enable future cost calculators
-- ============================================================================

-- ============================================================================
-- PART 1: SEED DEPARTMENT CATEGORIES
-- ============================================================================

-- Core departments (who owns/pays for the software)
INSERT INTO categories (name, slug, type, description, display_order) VALUES
  ('Engineering', 'engineering', 'department', 'Software development, DevOps, and technical teams', 300),
  ('Product', 'product', 'department', 'Product management and design teams', 301),
  ('Marketing', 'marketing', 'department', 'Marketing, growth, and communications teams', 302),
  ('Sales', 'sales', 'department', 'Sales and business development teams', 303),
  ('Customer Success', 'customer-success', 'department', 'Customer support and success teams', 304),
  ('Operations', 'operations', 'department', 'Business operations and administration', 305),
  ('Finance', 'finance', 'department', 'Finance, accounting, and billing teams', 306),
  ('HR', 'hr', 'department', 'Human resources and people operations', 307),
  ('Legal', 'legal', 'department', 'Legal and compliance teams', 308),
  ('IT Security', 'it-security', 'department', 'IT infrastructure and security teams', 309)
ON CONFLICT (slug) DO UPDATE SET
  type = EXCLUDED.type,
  description = EXCLUDED.description,
  display_order = EXCLUDED.display_order;

-- ============================================================================
-- PART 2: ADD SUBSTITUTABILITY SCORE TO COMPARISON_INSIGHTS
-- ============================================================================

-- Add substitutability_score for switching recommendations
-- 100 = drop-in replacement, 50 = partial overlap, 10 = vaguely related
ALTER TABLE comparison_insights
  ADD COLUMN IF NOT EXISTS substitutability_score INT CHECK (
    substitutability_score IS NULL OR (substitutability_score >= 0 AND substitutability_score <= 100)
  );

COMMENT ON COLUMN comparison_insights.substitutability_score IS
  'How substitutable are these tools? 100=drop-in replacement (Zoom/Meet), 50=functional overlap (Notion/Jira), 10=vaguely related';

-- ============================================================================
-- PART 3: ADD PRICING VERIFICATION FIELDS TO ITEMS
-- ============================================================================

-- Track when pricing was last verified (separate from general updated_at)
ALTER TABLE items
  ADD COLUMN IF NOT EXISTS pricing_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pricing_confidence TEXT CHECK (
    pricing_confidence IS NULL OR pricing_confidence IN ('high', 'medium', 'low')
  );

COMMENT ON COLUMN items.pricing_verified_at IS 'When pricing data was last verified (separate from content updates)';
COMMENT ON COLUMN items.pricing_confidence IS 'Confidence level in pricing data accuracy';

-- Simple index on pricing_verified_at for finding stale items
CREATE INDEX IF NOT EXISTS idx_items_pricing_verified_at
  ON items(pricing_verified_at ASC NULLS FIRST)
  WHERE pricing_verified_at IS NULL;

-- ============================================================================
-- PART 4: HELPER FUNCTION - GET ITEMS BY DEPARTMENT
-- ============================================================================

CREATE OR REPLACE FUNCTION get_items_by_department(
  p_department_slug TEXT,
  p_limit INT DEFAULT 50
)
RETURNS TABLE (
  item_id UUID,
  item_name TEXT,
  item_slug TEXT,
  relevance_score NUMERIC,
  pricing_type TEXT,
  base_score INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id AS item_id,
    i.name AS item_name,
    i.slug AS item_slug,
    icl.relevance_score,
    i.pricing_type::TEXT,
    i.base_score::INT
  FROM items i
  JOIN item_category_links icl ON icl.item_id = i.id
  JOIN categories c ON c.id = icl.category_id
  WHERE c.slug = p_department_slug
    AND c.type = 'department'
  ORDER BY icl.relevance_score DESC, i.avg_score DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION get_items_by_department TO anon, authenticated, service_role;

-- ============================================================================
-- PART 5: VIEW FOR PRICING AUDIT
-- ============================================================================

CREATE OR REPLACE VIEW pricing_audit AS
SELECT
  i.id,
  i.name,
  i.slug,
  i.pricing_type,
  i.pricing_confidence,
  i.pricing_verified_at,
  EXTRACT(DAY FROM NOW() - COALESCE(i.pricing_verified_at, i.created_at))::INT AS days_since_verification,
  i.specs->'pricing_data' IS NOT NULL AS has_smp_pricing,
  jsonb_array_length(COALESCE(i.specs->'pricing_data'->'plans', '[]'::jsonb)) AS plan_count,
  i.updated_at
FROM items i
WHERE i.type = 'tool'
ORDER BY
  CASE WHEN i.pricing_verified_at IS NULL THEN 0 ELSE 1 END,
  i.pricing_verified_at ASC NULLS FIRST;

-- Make view use invoker's permissions
ALTER VIEW pricing_audit SET (security_invoker = on);

COMMENT ON VIEW pricing_audit IS 'Audit view for tracking pricing data freshness and completeness';
