# Pricing Comparison Implementation

## What We Built

A complete pricing normalization system that ensures **apples-to-apples** comparison across all tools.

### Problem Solved

**Before:**
- ClickUp showing "$7/mo" (1 user)
- Monday showing "$90/mo" (10 users)
- Users think Monday is 13x more expensive → MISLEADING!

**After:**
- ClickUp: "$7/mo ($7/user, no minimum)"
- Monday: "$27/mo ($9/user, 3 seat minimum)"
- For team of 10: ClickUp $70/mo vs Monday $90/mo → ACCURATE!

## Architecture

### 1. Database Layer (Computed Columns)
**Migration:** `038_pricing_normalization.sql`

New columns on `items` table:
- `effective_starting_price_monthly` - True minimum cost (accounts for min_seats)
- `effective_starting_price_annual` - Annual minimum cost
- `pricing_comparison_tier` - Which plan tier (individual/team/business/enterprise)
- `pricing_comparison_plan_id` - Plan ID used for comparison
- `normalized_price_per_seat_monthly` - Per-seat monthly price
- `normalized_price_per_seat_annual` - Per-seat annual price

**Example:**
```sql
SELECT
  name,
  effective_starting_price_monthly,  -- $27 (3 × $9)
  normalized_price_per_seat_monthly   -- $9
FROM items WHERE slug = 'monday-com';
```

### 2. Normalization Logic
**Module:** `src/lib/pricing/`

```typescript
import { normalizePricing, comparePricing, getPricingForTeamSize } from '@/lib/pricing';

// Get normalized pricing for a tool
const normalized = normalizePricing(tool.specs.pricing_data);
// → { effective_starting_price_monthly: 27, display: { starting_from: "$27/mo", caveat: "(3 seat minimum)" } }

// Compare two tools
const comparison = comparePricing(
  { name: 'ClickUp', pricing: normalizedA },
  { name: 'Monday', pricing: normalizedB }
);
// → { cheaper: 'ClickUp', difference: 20, summary: 'ClickUp is $20/mo cheaper' }

// Calculate for specific team size
const cost = getPricingForTeamSize(pricingData, 10);
// → { monthly: 90, annual: 1080, plan_name: 'Basic', caveats: ['Minimum 3 seats required'] }
```

### 3. UI Components

#### TeamSizeSelector
**File:** `src/components/TeamSizeSelector.tsx`

Remembers user's team size in localStorage, updates all pricing displays.

```tsx
import TeamSizeSelector, { useTeamSize } from '@/components/TeamSizeSelector';

// Full selector
<TeamSizeSelector onChange={(size) => console.log(size)} />

// Compact version (for headers)
<TeamSizeSelector compact />

// Hook to get current team size in any component
const teamSize = useTeamSize();
```

#### SmartPricingCard
**File:** `src/components/SmartPricingCard.tsx`

Shows normalized pricing with automatic team size calculations.

```tsx
import SmartPricingCard from '@/components/SmartPricingCard';

<SmartPricingCard
  item={tool}
  showCalculator={true}
/>
```

Features:
- Shows effective starting price
- Displays per-seat cost
- Calculates cost for user's team size
- Shows caveats (minimum seats, annual-only, etc.)

#### PricingComparison
**File:** `src/components/PricingComparison.tsx`

Side-by-side comparison for multiple tools.

```tsx
import PricingComparison from '@/components/PricingComparison';

<PricingComparison tools={[clickup, monday, asana]} />
```

Features:
- Compares at user's team size
- Highlights best value
- Shows cost differences
- Displays caveats

### 4. Hunter Integration

**Automatic:** Every time the hunter saves a tool, normalized pricing is computed.

**File:** `src/lib/hunter/phases/persistence.ts` (line ~310)

```typescript
// After saving tool to database
const pricingResult = await updateNormalizedPricing(deps.supabase, item.id, specs);
```

## Usage Examples

### Example 1: Tool Detail Page

```astro
---
import TeamSizeSelector from '@/components/TeamSizeSelector';
import SmartPricingCard from '@/components/SmartPricingCard';

const tool = await getToolBySlug(slug);
---

<div class="space-y-6">
  <!-- Let user set team size -->
  <TeamSizeSelector />

  <!-- Show pricing for their team -->
  <SmartPricingCard item={tool} />
</div>
```

### Example 2: Comparison Page

```astro
---
import TeamSizeSelector from '@/components/TeamSizeSelector';
import PricingComparison from '@/components/PricingComparison';

const tools = await getTools(['clickup', 'monday-com', 'asana']);
---

<div class="space-y-6">
  <TeamSizeSelector />
  <PricingComparison tools={tools} client:load />
</div>
```

### Example 3: Tool Listing with Price Filter

```typescript
// Query tools in a price range (uses computed columns)
const { data: affordableTools } = await supabase
  .from('items')
  .select('*')
  .gte('effective_starting_price_monthly', 0)
  .lte('effective_starting_price_monthly', 50)
  .order('effective_starting_price_monthly');
```

## Backfill Existing Data

Already ran successfully! All 94 tools updated.

To re-run or update:
```bash
# Preview changes
npm run pricing:backfill -- --dry-run

# Update database
npm run pricing:backfill
```

## Data Flow

```
1. Hunter extracts pricing data → SMPPricingData (structured)
                                   ↓
2. Persistence phase → updateNormalizedPricing() → Computed DB columns
                                   ↓
3. Frontend components → Use computed columns + normalizePricing() → Display
                                   ↓
4. User sets team size → localStorage → All components update
```

## Key Benefits

### For Users
- ✅ Accurate pricing comparisons
- ✅ See cost for THEIR team size
- ✅ Clear caveats (minimums, restrictions)
- ✅ Persistent preferences

### For Maintainers
- ✅ Single source of truth (SMPPricingData)
- ✅ Type-safe utilities
- ✅ Precomputed for performance
- ✅ Self-healing (auto-updates on save)
- ✅ Easy to extend

## Testing

```bash
# Verify normalized pricing
npm run pricing:backfill -- --dry-run

# Check computed columns
npm run hunt -- --tool="ClickUp"

# Query in database
SELECT name, effective_starting_price_monthly, normalized_price_per_seat_monthly
FROM items WHERE slug IN ('clickup', 'monday-com');
```

## Next Steps (Optional Enhancements)

- [ ] Add pricing trend charts (show if price increased/decreased)
- [ ] Volume tier pricing (show discounts for larger teams)
- [ ] Geographic pricing variations (USD/EUR/GBP)
- [ ] Contract calculator (annual commitment savings)
- [ ] Suite bundling calculator (Google Workspace vs individual tools)
- [ ] Add-on cost calculator (SSO, storage, etc.)

## Files Created

```
src/lib/pricing/
├── normalize.ts           # Core normalization logic
├── persist.ts             # Database sync utilities
├── index.ts               # Public API
└── README.md              # Architecture docs

src/components/
├── TeamSizeSelector.tsx   # User preference selector
├── SmartPricingCard.tsx   # Single-tool pricing display
└── PricingComparison.tsx  # Multi-tool comparison

scripts/
└── pricing-backfill.ts    # Backfill script

supabase/migrations/
└── 038_pricing_normalization.sql  # Database schema
```

## Summary

✅ **Normalized pricing data** - Computed and stored in DB
✅ **Smart UI components** - Show accurate comparisons
✅ **User preferences** - Team size remembered
✅ **Type-safe utilities** - Easy to maintain
✅ **Auto-updating** - Hunter keeps it fresh

**Result:** Users now see accurate, apples-to-apples pricing comparisons that account for minimum seats, per-user pricing, and their specific team size!
