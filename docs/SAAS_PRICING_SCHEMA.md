## SaaS Pricing & Bundle Schema (Catalog + Org Instance)

This document defines the exact tables and JSON schemas needed to make pricing
and bundle logic usable for a subscription‑management SaaS. It builds on the
existing `items` catalog, `items.specs.pricing_data`, and `items.parent_id`.

---

### 1) Catalog‑Level Pricing JSON Schema (extend `items.specs.pricing_data`)

Purpose: Capture pricing logic precisely enough to model teams vs individuals,
usage meters, add‑ons, and bundle entitlements.

```
SMPPricingData {
  model: 'free' | 'flat' | 'per_seat' | 'per_unit' | 'tiered' | 'hybrid' | 'contact_sales'
  currency: 'USD' | 'EUR' | 'GBP'
  billing_cycles: ['monthly' | 'annual' | 'quarterly']
  annual_discount_pct: number | null

  plans: SMPPlanData[]

  // Seat and usage structure
  seat_types?: SeatTypePricing[]               // member/guest/viewer/etc
  volume_tiers?: VolumeTierPricing[]           // ranges with price overrides
  usage_meters?: UsageMeterPricing[]           // GB, requests, messages, etc
  add_ons?: AddOnPricing[]                     // SSO, audit logs, storage, etc

  // Hidden costs & constraints
  min_seats: number | null
  implementation_fee: number | null
  pricing_page_url: string | null
  last_verified: string | null
  confidence: 'high' | 'medium' | 'low'
  discounts_available: ('startup' | 'nonprofit' | 'education' | 'government' | 'annual_prepay')[]

  // Bundle hints (if this item is a child of a suite)
  is_standalone?: boolean
  bundled_in?: string | null
}

SMPPlanData {
  id: string
  name: string
  price_monthly: number | null
  price_annual: number | null
  scaling_unit: 'user' | 'seat' | 'member' | 'GB' | 'message' | 'request' | 'project' | 'workspace' | null
  price_per_unit: number | null
  included_units: number | null

  // Limits
  max_users: number | null
  max_storage_gb: number | null
  max_projects: number | null

  // Feature flags
  includes_sso: boolean
  includes_api: boolean
  includes_sla: boolean
  includes_priority_support: boolean
  is_enterprise: boolean
}

SeatTypePricing {
  type: 'member' | 'guest' | 'viewer' | 'contractor' | 'admin'
  price_per_unit: number | null
  free_units: number | null
  notes?: string | null
}

VolumeTierPricing {
  min_units: number
  max_units: number | null
  price_per_unit: number
  applies_to?: 'member' | 'seat' | 'workspace' | 'gb' | 'request' | null
}

UsageMeterPricing {
  unit: 'gb' | 'message' | 'request' | 'minute' | 'api_call'
  price_per_unit: number
  included_units: number | null
  billing_cycle: 'monthly' | 'annual' | 'quarterly'
}

AddOnPricing {
  name: string
  price: number
  unit: 'seat' | 'account' | 'org' | 'gb' | 'request'
  required: boolean
  notes?: string | null
}
```

Notes:
- `plans` remain the canonical summary; seat/usage/add‑on layers are optional
  overrides for real cost calculation.
- If a tool is bundled, use `bundled_in` and parent `items.parent_id`.

---

### 2) Bundle Composition (New Tables)

Purpose: Define which child tools are included in a parent suite, and at what
plan level. This enables “you already paid for this” logic.

```
CREATE TABLE bundle_components (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bundle_item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  component_item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  plan_id TEXT,                -- SMPPlanData.id of the bundle plan (nullable = all plans)
  included BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(bundle_item_id, component_item_id, COALESCE(plan_id, 'all'))
);

CREATE INDEX idx_bundle_components_bundle ON bundle_components(bundle_item_id);
CREATE INDEX idx_bundle_components_component ON bundle_components(component_item_id);
```

Optional: allocation for internal cost attribution.
```
CREATE TABLE bundle_allocation (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bundle_item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  component_item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  allocation_pct NUMERIC(5,2) CHECK (allocation_pct >= 0 AND allocation_pct <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(bundle_item_id, component_item_id)
);
```

---

### 3) Org‑Level Subscription Instance (New Tables)

Purpose: SaaS requires org‑specific subscriptions to compute real spend and
recommend replacements.

```
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  domain TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE org_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'finance', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, email)
);

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  plan_id TEXT,                          -- SMPPlanData.id (if known)
  billing_cycle TEXT CHECK (billing_cycle IN ('monthly', 'annual', 'quarterly')),
  started_at TIMESTAMPTZ,
  renews_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  status TEXT CHECK (status IN ('active', 'trial', 'canceled', 'past_due')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE subscription_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('seat', 'add_on', 'usage_meter')),
  name TEXT NOT NULL,                    -- "member seats", "SSO add‑on", "storage overage"
  quantity NUMERIC DEFAULT 0,
  unit_price NUMERIC,                    -- for seat/add‑on
  unit TEXT,                             -- 'seat', 'gb', 'request'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE subscription_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  meter_unit TEXT NOT NULL,              -- 'gb', 'request', etc
  quantity NUMERIC NOT NULL,
  usage_period_start DATE,
  usage_period_end DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  vendor_name TEXT,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'USD',
  invoice_date DATE,
  due_date DATE,
  source TEXT,                           -- 'stripe', 'email', 'manual'
  raw JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 4) Team vs Individual Cost Computation (Rules)

Use the catalog SMP data + org subscription instance data:

1) If bundle parent exists and org has the parent subscription, child tools
   should show “Already included”.
2) For per‑seat pricing:
   - Start with plan price_per_unit.
   - Apply seat_types if present (member/guest/viewer).
   - Apply volume_tiers if seat count crosses thresholds.
3) For usage‑based pricing:
   - Usage meters with included units.
4) Add‑ons always applied if required or explicitly enabled.

---

### 5) Migration Path (Minimal)

1) Add JSON fields to pricing_data (seat_types, usage_meters, add_ons).  
2) Add bundle_components table.  
3) Introduce org/subscription tables (can be empty until SaaS phase).  
4) Start collecting real data sources (invoices or Stripe) later.

---

### 6) Quick FAQ

- **Why not store everything in JSON?**  
  Catalog data is JSON; org‑level instances need relational tables.

- **Why do we need bundle_components?**  
  Parent/child alone isn’t enough to know what is included in which plan.

- **Why do we need seat types?**  
  Most SaaS pricing is not “all seats equal.”

---

If you want, I can also provide:
- Migration SQL for extending SMP JSON schema validation (Zod updates).
- A cost calculation function based on these rules.
