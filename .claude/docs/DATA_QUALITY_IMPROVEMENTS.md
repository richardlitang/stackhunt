# Data Quality & Display Improvements

**Date:** 2026-01-31

## Summary

✅ **55 items queued for re-hunting** to add missing tribal knowledge
✅ **Schema updated** to support plan audience differentiation
✅ **Fields already exist** for confidence & freshness display

---

## 1. Date & Confidence Display

### What We Have

| Field | Type | Purpose |
|-------|------|---------|
| `pricing_verified_at` | timestamp | When pricing was last checked |
| `pricing_confidence` | text | high/medium/low |
| `data_confidence` | numeric | 0-100 overall quality score |
| `updated_at` | timestamp | Last item update |

### Recommended Display (Roadmap V1 Priority)

#### A. Data Freshness Badge (Top of Pricing Section)

```astro
<!-- src/components/DataFreshnessBadge.astro -->
---
interface Props {
  confidence: 'high' | 'medium' | 'low';
  verifiedAt: Date;
}

const { confidence, verifiedAt } = Astro.props;
const daysSince = Math.floor((Date.now() - verifiedAt.getTime()) / (1000 * 60 * 60 * 24));
const isStale = daysSince > 60;
---

<div class="data-freshness-badge">
  <!-- Confidence Badge -->
  {confidence === 'high' && (
    <span class="badge badge-success">
      <svg class="icon-check">✓</svg>
      Verified from official source
    </span>
  )}
  {confidence === 'medium' && (
    <span class="badge badge-warning">
      <svg class="icon-info">ⓘ</svg>
      Verified from reviews
    </span>
  )}
  {confidence === 'low' && (
    <span class="badge badge-caution">
      <svg class="icon-warning">⚠</svg>
      Limited data available
    </span>
  )}

  <!-- Last Updated -->
  <span class="text-muted text-sm">
    Last verified: {formatRelativeDate(verifiedAt)}
  </span>

  <!-- Stale Warning -->
  {isStale && (
    <div class="stale-alert">
      ⚠️ Data last verified {daysSince} days ago.
      <a href="#corrections" class="link">Report if incorrect</a>
    </div>
  )}
</div>

<style>
  .badge-success { background: #10b981; color: white; }
  .badge-warning { background: #f59e0b; color: white; }
  .badge-caution { background: #ef4444; color: white; }
  .stale-alert {
    background: #fef3c7;
    border-left: 4px solid #f59e0b;
    padding: 0.75rem;
    margin-top: 0.5rem;
  }
</style>
```

#### B. Usage on Tool Page

```astro
<!-- src/pages/tool/[slug].astro -->
---
const tool = await getToolBySlug(slug);
const pricingData = tool.specs?.smp_pricing?.pricing_data;
---

<section id="pricing">
  <h2>Pricing</h2>

  <!-- Data Freshness Badge -->
  <DataFreshnessBadge
    confidence={tool.pricing_confidence || 'medium'}
    verifiedAt={tool.pricing_verified_at || tool.updated_at}
  />

  <!-- Pricing Plans Grid -->
  <div class="pricing-grid">
    {pricingData?.plans.map(plan => (
      <PricingCard plan={plan} />
    ))}
  </div>
</section>
```

---

## 2. Plan Audience Differentiation

### Schema Changes (Already Applied)

✅ Added `target_audience` field to `SMPPlanSchema`:
```typescript
target_audience: 'individual' | 'team' | 'business' | 'enterprise'
```

✅ Updated Gemini prompt to extract audience

### Audience Definitions

| Audience | Typical Size | Features | Examples |
|----------|--------------|----------|----------|
| **individual** | 1 user | Basic features, limited storage | Notion Personal, Canva Free |
| **team** | 2-10 users | Collaboration, shared workspaces | Slack Pro, Figma Professional |
| **business** | 10-100 users | Advanced features, some compliance | HubSpot Professional, Asana Business |
| **enterprise** | 100+ users | SSO, SLA, audit logs, custom contracts | Salesforce Enterprise, Slack Enterprise Grid |

### Display Improvements

#### A. Pricing Table with Audience Tags

```astro
<!-- src/components/PricingCard.astro -->
---
import type { SMPPlan } from '@/lib/knowledge-card';

interface Props {
  plan: SMPPlan;
}

const { plan } = Astro.props;

const audienceLabels = {
  individual: { icon: '👤', label: 'For Individuals', color: 'blue' },
  team: { icon: '👥', label: 'For Small Teams', color: 'green' },
  business: { icon: '🏢', label: 'For Businesses', color: 'purple' },
  enterprise: { icon: '🏛️', label: 'For Enterprises', color: 'gray' },
};

const audienceInfo = plan.target_audience ? audienceLabels[plan.target_audience] : null;
---

<div class="pricing-card">
  <!-- Plan Header -->
  <div class="plan-header">
    <h3>{plan.name}</h3>
    {audienceInfo && (
      <span class={`audience-tag audience-${audienceInfo.color}`}>
        {audienceInfo.icon} {audienceInfo.label}
      </span>
    )}
  </div>

  <!-- Pricing -->
  <div class="plan-price">
    {plan.price_monthly !== null && plan.price_monthly !== undefined ? (
      <>
        <span class="price">${plan.price_monthly}</span>
        <span class="period">
          {plan.scaling_unit ? `/${plan.scaling_unit}/mo` : '/mo'}
        </span>
      </>
    ) : (
      <span class="price">Contact Sales</span>
    )}
  </div>

  <!-- Annual Savings -->
  {plan.price_annual && plan.price_monthly && (
    <div class="annual-savings">
      Save ${(plan.price_monthly * 12 - plan.price_annual).toFixed(0)}/year with annual billing
    </div>
  )}

  <!-- Features -->
  <ul class="plan-features">
    {plan.max_users && (
      <li>Up to {plan.max_users} users</li>
    )}
    {plan.max_storage_gb && (
      <li>{plan.max_storage_gb} GB storage</li>
    )}
    {plan.includes_api && <li>✓ API Access</li>}
    {plan.includes_sso && <li>✓ Single Sign-On (SSO)</li>}
    {plan.includes_sla && <li>✓ SLA Guarantee</li>}
    {plan.includes_priority_support && <li>✓ Priority Support</li>}
  </ul>
</div>
```

#### B. Plan Filtering by Audience

```tsx
// src/components/PricingFilter.tsx
import { useState } from 'react';

export function PricingFilter({ plans }) {
  const [selectedAudience, setSelectedAudience] = useState('all');

  const filteredPlans = selectedAudience === 'all'
    ? plans
    : plans.filter(p => p.target_audience === selectedAudience);

  return (
    <div>
      <div className="filter-tabs">
        <button onClick={() => setSelectedAudience('all')}>
          All Plans
        </button>
        <button onClick={() => setSelectedAudience('individual')}>
          👤 Individual
        </button>
        <button onClick={() => setSelectedAudience('team')}>
          👥 Team
        </button>
        <button onClick={() => setSelectedAudience('business')}>
          🏢 Business
        </button>
        <button onClick={() => setSelectedAudience('enterprise')}>
          🏛️ Enterprise
        </button>
      </div>

      <div className="pricing-grid">
        {filteredPlans.map(plan => (
          <PricingCard key={plan.id} plan={plan} />
        ))}
      </div>
    </div>
  );
}
```

---

## 3. Plan Details Extraction

### Current Gaps

We extract basic plan info but could improve:

1. **Feature Details** - Currently boolean flags, could add feature lists
2. **Usage Limits** - Storage, API calls, users more explicitly
3. **Add-on Pricing** - Extra features, overages

### Recommended Enhancement to Gemini Prompt

```typescript
// In gemini.ts extraction prompt, add:

"For each plan, extract:
  - Core limits: max_users, max_storage_gb, max_projects, max_api_calls_per_month
  - Features included: Extract specific features as array (not just booleans)
  - Notable exclusions: What features are NOT in this plan but available in higher tiers
  - Overage pricing: Cost for exceeding limits (e.g., '$0.10/GB over limit')
"
```

### Extended Plan Schema (Optional Future Enhancement)

```typescript
export const SMPPlanSchemaExtended = SMPPlanSchema.extend({
  features_included: z.array(z.string()).default([])
    .describe("Specific features in this plan. e.g., 'Unlimited boards', '24/7 chat support'"),
  features_excluded: z.array(z.string()).default([])
    .describe("Features NOT in this plan. e.g., 'No SSO', 'No custom branding'"),
  usage_limits: z.object({
    max_api_calls: z.number().nullable().optional(),
    max_file_uploads: z.number().nullable().optional(),
    max_integrations: z.number().nullable().optional(),
  }).optional(),
  overage_pricing: z.object({
    storage_per_gb: z.number().nullable().optional(),
    users_per_seat: z.number().nullable().optional(),
  }).optional(),
});
```

---

## 4. Re-Hunt Queue Status

### What Was Queued

✅ **55 items** queued for re-hunting with `force_regenerate: true`
- All items missing `review_context` (budgetAnalyst, userAdvocate, humanVerdict)
- Priority: 50 (standard priority for all - base_score not used for prioritization)
- Source: `admin`
- Hunt type: `full`

### How to Process the Queue

#### Option A: Continuous Worker (Recommended)

```bash
# Process queue continuously with batching
npm run queue:worker -- --batch 5 --interval 6h

# This will:
# 1. Process 5 items
# 2. Wait 6 hours
# 3. Repeat

# Or single batch:
npm run queue:worker -- --batch 10 --once
```

#### Option B: Manual Processing

```bash
# Process next item in queue
npm run hunt -- --queue process

# Process specific tool
npm run hunt -- --tool="Slack"

# Check queue status
npm run hunt -- --queue status
```

### Queue Monitoring

```sql
-- Check queue status
SELECT
  status,
  COUNT(*) as count,
  MIN(priority) as min_priority,
  MAX(priority) as max_priority
FROM hunt_queue
WHERE source = 'admin'
GROUP BY status;

-- See what's pending
SELECT
  tool_name,
  priority,
  created_at
FROM hunt_queue
WHERE status = 'pending'
  AND source = 'admin'
ORDER BY priority DESC, created_at ASC
LIMIT 10;
```

---

## 5. After Re-Hunt: New Data Available

Once re-hunting completes, each tool will have:

### A. Budget Analyst Data
- `cost_drivers` - Factors that increase TCO
- `one_time_fees` - Setup, implementation costs
- `commitment_terms` - Contract constraints
- `roi_threshold` - When paid tier becomes worth it

### B. User Advocate Data
- `vibe` - 2-3 word "soul" of the tool
- `origin_story` - Brief context
- `ideal_for` - Specific personas
- `avoid_if` - Deal-breakers
- `power_tip` - Insider shortcut
- `delighters` - Features users rave about
- `frustrations` - Common UX complaints

### C. Human Verdict
- 2-sentence "Coffee Shop Speak" summary
- NO jargon words (seamless, empowers, robust)

### Display Example

```astro
<!-- src/components/TribalKnowledge.astro -->
---
const { reviewContext } = tool.specs;
const { budgetAnalyst, userAdvocate, humanVerdict } = reviewContext || {};
---

{humanVerdict && (
  <div class="human-verdict">
    <h3>The Real Story</h3>
    <p class="verdict-text">{humanVerdict}</p>
  </div>
)}

{userAdvocate && (
  <div class="tribal-knowledge">
    {userAdvocate.vibe && (
      <div class="vibe-tag">{userAdvocate.vibe}</div>
    )}

    <div class="fit-guidance">
      {userAdvocate.ideal_for?.length > 0 && (
        <div class="ideal-for">
          <h4>✓ Best For</h4>
          <ul>
            {userAdvocate.ideal_for.map(item => (
              <li class="positive">{item}</li>
            ))}
          </ul>
        </div>
      )}

      {userAdvocate.avoid_if?.length > 0 && (
        <div class="avoid-if">
          <h4>✗ Skip If</h4>
          <ul>
            {userAdvocate.avoid_if.map(item => (
              <li class="negative">{item}</li>
            ))}
          </ul>
        </div>
      )}
    </div>

    {userAdvocate.power_tip && (
      <div class="power-tip">
        <strong>💡 Pro Tip:</strong> {userAdvocate.power_tip}
      </div>
    )}
  </div>
)}

{budgetAnalyst && (
  <div class="pricing-insights">
    <h3>Price Mechanics</h3>
    {budgetAnalyst.cost_drivers?.length > 0 && (
      <ul class="cost-drivers">
        {budgetAnalyst.cost_drivers.map(driver => (
          <li>{driver}</li>
        ))}
      </ul>
    )}

    {budgetAnalyst.roi_threshold && (
      <div class="roi-threshold">
        <strong>Worth it at:</strong> {budgetAnalyst.roi_threshold}
      </div>
    )}
  </div>
)}
```

---

## Implementation Priority

### Week 1: Re-Hunt & Schema (DONE ✅)
- [x] Queue all 55 items
- [x] Add `target_audience` to plan schema
- [x] Update Gemini prompt

### Week 2: Display Components
- [ ] Create `DataFreshnessBadge.astro`
- [ ] Create `TribalKnowledge.astro`
- [ ] Create `PricingInsights.astro`
- [ ] Create enhanced `PricingCard.astro` with audience tags

### Week 3: Advanced Features
- [ ] Add plan filtering by audience
- [ ] Add stale data warnings
- [ ] Add community verification widget (from ROADMAP_V1)

---

## Next Steps

1. **Start queue processing:**
   ```bash
   npm run queue:worker -- --batch 3 --once
   ```

2. **Monitor progress:**
   ```bash
   npm run hunt -- --queue status
   ```

3. **Check first completed item:**
   ```sql
   SELECT name, specs->'review_context'
   FROM items
   WHERE specs->'review_context' IS NOT NULL
   LIMIT 1;
   ```

4. **Build display components** once re-hunt data is available
