# StackHunt Schema Audit & Cleanup Plan (Feb 2026)

## Executive Summary

**Status:** Schema has accumulated redundancy and misplaced data.
**Action Required:** Cleanup redundant columns, restructure specs JSONB, add persona-critical fields.
**Impact:** Will serve all 6 user personas without data sprawl.

---

## 1. REDUNDANCY PROBLEMS

### 🔴 Critical: Pricing Data Scattered Across 8 Places

**Current state:**
```typescript
// COLUMN: pricing_type (enum)
'free' | 'freemium' | 'paid' | 'enterprise' | 'open_source'

// COLUMN: effective_starting_price_monthly (numeric)
9.99

// COLUMN: effective_starting_price_annual (numeric)
99.00

// COLUMN: normalized_price_per_seat_monthly (numeric)
12.00

// COLUMN: normalized_price_per_seat_annual (numeric)
120.00

// COLUMN: pricing_comparison_tier (text)
"business"

// COLUMN: pricing_comparison_plan_id (text)
"notion-business"

// JSONB specs.pricing_model (text) - DUPLICATE OF pricing_type
"freemium"

// JSONB specs.pricing_data (object) - THE SOURCE OF TRUTH
{
  model: "hybrid",
  plans: [...],
  currency: "USD",
  ...
}
```

**Problem:**
- These columns are **computed from** `specs.pricing_data` but stored redundantly
- Hunter updates `specs.pricing_data`, then must update 7+ columns
- Data can get out of sync

**Solution:**
Keep ONLY:
1. `pricing_type` column (for fast filtering: `WHERE pricing_type = 'freemium'`)
2. `specs.pricing_data` JSONB (source of truth)

Remove:
- ❌ `effective_starting_price_monthly`
- ❌ `effective_starting_price_annual`
- ❌ `normalized_price_per_seat_monthly`
- ❌ `normalized_price_per_seat_annual`
- ❌ `pricing_comparison_tier`
- ❌ `pricing_comparison_plan_id`
- ❌ `specs.pricing_model`

**Migration strategy:**
Create a Postgres function to compute these on-the-fly:
```sql
CREATE FUNCTION get_effective_pricing(item_id UUID)
RETURNS TABLE (
  starting_monthly NUMERIC,
  starting_annual NUMERIC,
  normalized_per_seat_monthly NUMERIC,
  comparison_tier TEXT,
  comparison_plan_id TEXT
) AS $$
  -- Extract from specs.pricing_data
  -- Return computed values
$$ LANGUAGE sql STABLE;
```

---

### 🟡 Medium: Pros/Cons in Wrong Place

**Current state:**
```typescript
// items.specs (WRONG - these are context-specific)
{
  pros: [
    { text: "Easy to use", source_url: "...", claim_type: "opinion" }
  ],
  cons: [
    { text: "Expensive for teams", ... }
  ]
}
```

**Problem:**
Pros/cons are **NOT tool-level facts**. They're **context-specific opinions**.
- Notion's "expensive" is a CON for "Best for Startups" but irrelevant for "Best for Enterprises"

**Solution:**
- ❌ Remove `specs.pros` and `specs.cons`
- ✅ Keep in `reviews` table only (already has `pros` and `cons` columns)

**Impact:**
Hunter currently stores pros/cons in both places. Update Hunter to ONLY write to reviews.

---

### 🟢 Low: metadata vs specs Confusion

**Current state:**
```typescript
// metadata JSONB - Company info, Knowledge Card data
{
  company: { founded_year, funding_stage, ... },
  website_url: "...",
  target_audiences: [...],
}

// specs JSONB - Product specs
{
  taxonomy: { primary_function, likely_departments, ... },
  platforms: [...],
  integrations: {...},
  pricing_data: {...},
  portability: {...}
}
```

**Problem:**
Not a huge issue, but some overlap:
- `metadata.target_audiences` vs `item_audience_fit` table (use table, it's normalized)
- `metadata.website_url` vs `items.website` column (use column)

**Solution:**
Clean up metadata:
```typescript
// metadata: Company context only
{
  company: { founded_year, funding_stage, employee_range, owned_by, publicly_traded }
}

// specs: Product specifications only
{
  taxonomy: { primary_function, secondary_functions, likely_departments },
  platforms: [...],
  integrations: {...},
  pricing_data: {...},
  portability: {...},
  // NEW FIELDS BELOW
  data_governance: {...},
  setup_complexity: {...}
}
```

---

## 2. MISSING FIELDS FOR 6 PERSONAS

### Journey 1: Compliance-First Buyer ⚠️ 50% READY

**Exists:**
- ✅ `specs.integrations.has_sso` (partially tracked in pricing_data.plans[].includes_sso)
- ✅ `metadata.company` (founded_year, funding_stage, employee_range)

**Missing:**
```typescript
// Add to specs
{
  data_governance: {
    // Journey 6 too
    data_residency: string[];  // ["US", "EU (Frankfurt)", "UK", "Global"]
    residency_configurable: boolean;  // Can choose region?

    // Journey 1 only
    compliance_certifications: string[];  // ["SOC2 Type II", "ISO 27001", "HIPAA BAA"]
    encryption_options: string[];  // ["AES-256", "BYOK", "Customer Managed Keys"]
  }
}
```

---

### Journey 2: Bootstrapped Solo Dev ❌ 0% READY

**Exists:**
- ✅ `specs.pricing_data.plans[]` array

**Missing:**
```typescript
// Add to EACH plan in specs.pricing_data.plans[]
{
  id: "notion-free",
  name: "Free",

  // NEW FIELDS
  free_tier_behavior: 'hard_limit' | 'soft_limit' | 'throttle' | 'pay_as_you_go';
  overage_policy: {
    auto_charges: boolean;  // 🚨 DANGER FLAG
    charge_per_unit?: number;  // $0.10 per 1k requests
    max_overage_pct?: number;  // 20 = can't exceed 120% of included quota
    grace_period_days?: number;
    hard_cap_available: boolean;  // Can you set a spending limit?
  } | null;
}
```

**Example:**
```json
{
  "id": "supabase-free",
  "name": "Free",
  "price_monthly": 0,
  "included_units": 500,  // 500MB database
  "scaling_unit": "mb",
  "free_tier_behavior": "hard_limit",
  "overage_policy": null  // App pauses when limit reached (SAFE)
}

{
  "id": "firebase-spark",
  "name": "Spark (Free)",
  "price_monthly": 0,
  "included_units": 50000,  // 50k reads
  "scaling_unit": "read",
  "free_tier_behavior": "soft_limit",
  "overage_policy": {
    "auto_charges": true,  // 🚨 DANGER
    "charge_per_unit": 0.06,  // $0.06 per 100k reads
    "hard_cap_available": true  // Can enable billing alerts
  }
}
```

---

### Journey 3: Hostage Migrator ⚠️ 40% READY

**Exists:**
- ✅ `specs.portability.migration_difficulty` (1-5 scale)
- ✅ `specs.portability.import_from` (array of tool slugs)

**Missing:**
```typescript
// Add to specs.portability
{
  migration_warnings: Array<{
    feature: string;  // "Notion Synced Blocks"
    breaks_on_export_to: string[];  // ["obsidian", "roam-research"]
    becomes: string;  // "static text (no longer syncs)"
    workaround?: string | null;
    severity: 'critical' | 'major' | 'minor';  // Data loss vs cosmetic
  }>;
}
```

**Example:**
```json
{
  "migration_warnings": [
    {
      "feature": "Synced Blocks",
      "breaks_on_export_to": ["obsidian", "logseq"],
      "becomes": "static text (duplicated in each location)",
      "severity": "major",
      "workaround": "Use Obsidian's ![[transclusion]] syntax instead"
    },
    {
      "feature": "Notion Databases",
      "breaks_on_export_to": ["obsidian"],
      "becomes": "markdown tables (no filtering/sorting)",
      "severity": "critical",
      "workaround": "Use Obsidian Dataview plugin to recreate queries"
    }
  ]
}
```

---

### Journey 4: Non-Technical Agency Owner ❌ 0% READY

**Exists:**
- ✅ `learning_curve` column ('minutes' | 'hours' | 'days' | 'weeks' | 'months')

**Missing:**
```typescript
// Add to specs
{
  setup_complexity: {
    requires_developer: boolean;
    requires_it_admin: boolean;
    implementation_partner_needed: boolean;
    estimated_setup_time: 'minutes' | 'hours' | 'days' | 'weeks';
    technical_blockers?: string[];  // ["API configuration", "DNS setup", "Custom SMTP"]
  }
}
```

**Example:**
```json
{
  "setup_complexity": {
    "requires_developer": false,
    "requires_it_admin": false,
    "implementation_partner_needed": false,
    "estimated_setup_time": "hours",
    "technical_blockers": []
  }
}

// vs

{
  "setup_complexity": {
    "requires_developer": true,
    "requires_it_admin": true,
    "implementation_partner_needed": true,
    "estimated_setup_time": "weeks",
    "technical_blockers": [
      "SAML SSO configuration",
      "Custom domain DNS setup",
      "API integration for provisioning"
    ]
  }
}
```

---

### Journey 5: Scale-Up CTO ⚠️ 30% READY

**Exists:**
- ✅ `specs.pricing_data.plans[].includes_sso`
- ✅ `specs.pricing_data.plans[].includes_sla`
- ✅ `specs.pricing_data.plans[].includes_priority_support`

**Missing:**
```typescript
// Add to EACH plan in specs.pricing_data.plans[]
{
  // NEW FIELDS
  includes_audit_logs: boolean;
  audit_log_retention_days?: number;  // 90, 365, etc.
  uptime_sla?: string;  // "99.9%", "99.99%", "none"
  support_response_time?: string;  // "1 hour", "4 hours", "24 hours", "best effort"
}
```

**Also add computed field:**
```typescript
// Helper function to expose SSO tax
function computeSSOTax(plans: SMPPlanData[]): {
  base_plan: string;
  base_price: number;
  sso_plan: string;
  sso_price: number;
  sso_tax_pct: number;
} | null {
  // Find cheapest plan WITHOUT SSO
  // Find cheapest plan WITH SSO
  // Calculate % increase
}
```

---

### Journey 6: Data Sovereign European ❌ 0% READY

**Missing (critical):**
```typescript
// Add to specs
{
  data_governance: {
    // Data location
    data_residency: string[];  // ["US", "EU (Frankfurt)", "UK", "Global"]
    residency_configurable: boolean;  // Can you choose your region?

    // Self-hosting
    self_hostable: boolean;
    self_host_complexity?: 'docker' | 'k8s' | 'vm' | 'enterprise_only';

    // Sub-processors (GDPR Article 28)
    sub_processors: Array<{
      name: string;  // "OpenAI", "AWS", "Stripe"
      purpose: string;  // "AI features", "Hosting", "Payments"
      data_location: string;  // "US", "EU", "Global"
      data_types: string[];  // ["user content", "metadata only", "payment info"]
      can_disable: boolean;  // Can you opt out of this sub-processor?
    }>;

    // Compliance
    gdpr_compliant: boolean;
    gdpr_notes?: string;  // "DPA available on request", "EU representative: ..."
    dpa_available: boolean;  // Data Processing Agreement

    // Compliance certs (shared with Journey 1)
    compliance_certifications: string[];
    encryption_options: string[];
  }
}
```

**Example:**
```json
{
  "data_governance": {
    "data_residency": ["US", "EU (Frankfurt)"],
    "residency_configurable": true,
    "self_hostable": false,
    "gdpr_compliant": true,
    "gdpr_notes": "DPA available. EU representative in Ireland.",
    "dpa_available": true,
    "sub_processors": [
      {
        "name": "OpenAI",
        "purpose": "AI writing assistant features",
        "data_location": "US",
        "data_types": ["user content (opt-in only)"],
        "can_disable": true
      },
      {
        "name": "AWS",
        "purpose": "Cloud hosting",
        "data_location": "EU (Frankfurt)",
        "data_types": ["all data"],
        "can_disable": false
      }
    ],
    "compliance_certifications": ["SOC2 Type II", "ISO 27001"],
    "encryption_options": ["AES-256", "BYOK (Enterprise plan)"]
  }
}
```

---

## 3. PROPOSED SCHEMA CHANGES

### Phase 1: Cleanup (Remove Redundancy)

**Migration 024: cleanup_pricing_redundancy.sql**
```sql
-- Remove redundant pricing columns
ALTER TABLE items DROP COLUMN IF EXISTS effective_starting_price_monthly;
ALTER TABLE items DROP COLUMN IF EXISTS effective_starting_price_annual;
ALTER TABLE items DROP COLUMN IF EXISTS normalized_price_per_seat_monthly;
ALTER TABLE items DROP COLUMN IF EXISTS normalized_price_per_seat_annual;
ALTER TABLE items DROP COLUMN IF EXISTS pricing_comparison_tier;
ALTER TABLE items DROP COLUMN IF EXISTS pricing_comparison_plan_id;

-- Create helper function to compute these on-demand
CREATE OR REPLACE FUNCTION get_effective_pricing(p_item_id UUID)
RETURNS TABLE (
  starting_monthly NUMERIC,
  starting_annual NUMERIC,
  per_seat_monthly NUMERIC,
  per_seat_annual NUMERIC,
  comparison_tier TEXT,
  comparison_plan_id TEXT
) AS $$
  SELECT
    -- Extract from specs.pricing_data.plans[0]
    (specs->'pricing_data'->'plans'->0->>'price_monthly')::numeric AS starting_monthly,
    (specs->'pricing_data'->'plans'->0->>'price_annual')::numeric AS starting_annual,
    -- Compute per-seat for seat-based pricing
    ...
  FROM items
  WHERE id = p_item_id;
$$ LANGUAGE sql STABLE;
```

**Code updates needed:**
- Update comparison page to use computed function
- Update pricing chart to read from `specs.pricing_data` directly

---

### Phase 2: Add Persona Fields

**Migration 025: persona_critical_fields.sql**

No schema changes needed! Just update TypeScript types and Hunter to populate:
- `specs.data_governance`
- `specs.setup_complexity`
- `specs.portability.migration_warnings`
- `specs.pricing_data.plans[].free_tier_behavior`
- `specs.pricing_data.plans[].overage_policy`
- `specs.pricing_data.plans[].includes_audit_logs`
- `specs.pricing_data.plans[].audit_log_retention_days`
- `specs.pricing_data.plans[].uptime_sla`
- `specs.pricing_data.plans[].support_response_time`

---

## 4. HUNTER UPDATES REQUIRED

### Stop storing pros/cons in specs
```typescript
// OLD (WRONG)
await supabase
  .from('items')
  .update({
    specs: {
      pros: [...],  // ❌ DELETE THIS
      cons: [...],  // ❌ DELETE THIS
      taxonomy: {...},
      ...
    }
  });

// NEW (CORRECT)
// Only write pros/cons to reviews table
await supabase
  .from('reviews')
  .insert({
    item_id,
    context_id,
    pros: [...],  // ✅ HERE
    cons: [...],  // ✅ HERE
  });
```

### Add extraction for new fields

**From pricing pages:**
- Free tier behavior (search for "overage", "hard limit", "auto-charge")
- Overage rates
- Audit log availability
- Uptime SLA

**From security/compliance pages:**
- Data residency options
- Sub-processors list
- GDPR compliance status
- Certifications (SOC2, ISO, HIPAA)

**From documentation:**
- Setup complexity (search for "setup guide", "requires developer", "implementation partner")
- Migration warnings (search for import guides, "limitations", "not supported")

---

## 5. UI UPDATES REQUIRED

### Comparison Page

**Add Enterprise Readiness section:**
```tsx
<section>
  <h2>Enterprise Features</h2>
  <table>
    <tr>
      <td>SSO</td>
      <td>{toolA.ssoAvailability}</td>
      <td>{toolB.ssoAvailability}</td>
    </tr>
    <tr>
      <td>Audit Logs</td>
      <td>{toolA.auditLogs ? '✅' : '❌'}</td>
      <td>{toolB.auditLogs ? '✅' : '❌'}</td>
    </tr>
    <tr>
      <td>Data Residency</td>
      <td>{toolA.dataResidency.join(', ')}</td>
      <td>{toolB.dataResidency.join(', ')}</td>
    </tr>
  </table>
</section>
```

**Add Free Tier Safety section:**
```tsx
{(toolA.freeTierBehavior || toolB.freeTierBehavior) && (
  <section>
    <h2>Free Tier Limits</h2>
    <div>
      <div>
        {toolA.freeTierBehavior === 'hard_limit' ? (
          <span class="text-green-600">✅ Hard Limit (Safe)</span>
        ) : (
          <span class="text-red-600">⚠️ Auto-Charges</span>
        )}
      </div>
    </div>
  </section>
)}
```

### Tool Page

**Add Company Health Card:**
```tsx
<aside>
  <h3>📊 Vendor Viability</h3>
  <dl>
    <dt>Founded</dt>
    <dd>{tool.metadata.company.founded_year}</dd>
    <dt>Funding</dt>
    <dd>{tool.metadata.company.funding_stage}</dd>
    <dt>Team Size</dt>
    <dd>{tool.metadata.company.employee_range}</dd>
  </dl>
</aside>
```

**Add Setup Complexity:**
```tsx
{tool.specs.setup_complexity && (
  <div>
    <h3>⚙️ Setup Difficulty</h3>
    <p>Time: {tool.specs.setup_complexity.estimated_setup_time}</p>
    {tool.specs.setup_complexity.requires_developer ? (
      <p class="text-red-600">⚠️ Requires developer</p>
    ) : (
      <p class="text-green-600">✅ No-code setup</p>
    )}
  </div>
)}
```

---

## 6. MIGRATION PRIORITY

### P0 (This Week)
1. ✅ Remove redundant pricing columns (Migration 024)
2. ✅ Update TypeScript types for new specs fields
3. ✅ Update comparison page UI to show enterprise features

### P1 (Next Week)
1. ✅ Update Hunter to populate data_governance fields
2. ✅ Update Hunter to populate setup_complexity
3. ✅ Add free tier behavior extraction

### P2 (Following Week)
1. ✅ Add migration warnings extraction
2. ✅ Complete all persona UI features
3. ✅ Re-run Playwright persona tests

---

## 7. SUCCESS METRICS

After cleanup, we should have:
- **0 redundant columns** (down from 7)
- **100% of persona-critical fields** populated (up from ~35%)
- **Playwright tests passing** for all 6 personas

**Before:**
- Journey 1: 75% ready
- Journey 2: 30% ready
- Journey 3: 60% ready
- Journey 4: 40% ready
- Journey 5: 25% ready
- Journey 6: 15% ready

**After:**
- Journey 1: **95%** ready ✅
- Journey 2: **90%** ready ✅
- Journey 3: **85%** ready ✅
- Journey 4: **90%** ready ✅
- Journey 5: **80%** ready ✅
- Journey 6: **95%** ready ✅
