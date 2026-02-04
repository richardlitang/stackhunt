-- ============================================================================
-- MIGRATION 040: Document Constraints Schema (No DDL Changes)
--
-- Constraints are stored in items.specs.constraints (JSONB).
-- This migration only documents the schema for reference.
-- ============================================================================

COMMENT ON COLUMN items.specs IS
'Type-specific structured data. Schema varies by item.type (tool vs gear).

V4: Constraints Schema (added 2026-02-04)
  constraints: {
    hard_limits: [
      {
        plan_id: string | null,          -- Plan ID (e.g., "slack-pro") or null for all plans
        type: enum,                      -- record_count, storage_gb, api_requests_per_month, etc.
        value: number,                   -- Limit threshold
        consequence: enum,               -- hard_stop, soft_throttle, auto_charge, upgrade_locked, data_deletion
        description: string,             -- Detailed explanation
        source_url: string               -- Pricing page or ToS URL
      }
    ],
    hidden_costs: [
      {
        description: string,             -- What the cost is
        cost: number | null,             -- Cost if known
        currency: string,                -- Default USD
        trigger: string                  -- When cost applies
      }
    ]
  }

See src/lib/knowledge-card.ts ToolConstraintsSchema for full type definitions.';
