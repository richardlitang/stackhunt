# Pricing Normalization Module

**Single source of truth for pricing comparison and display.**

## Problem Statement

We have structured pricing data (`specs.pricing_data` / `SMPPricingData`) with rich details:
- Per-seat vs flat-rate pricing
- Minimum seat requirements
- Multiple plans (individual, team, business, enterprise)
- Annual discounts

But we need **apples-to-apples comparison** across tools. For example:
- ClickUp: $7/user/mo (no minimum)
- Monday.com: $9/user/mo (3 seat minimum = $27/mo actual)

Without normalization, we'd compare $7 to $9 — **misleading!**

## Architecture

### Layer 1: Database Columns (Computed)
Precomputed fields on `items` table for fast queries:
- `effective_starting_price_monthly` - True minimum monthly cost
- `effective_starting_price_annual` - True minimum annual cost
- `pricing_comparison_tier` - Which plan tier (individual/team/business/enterprise)
- `pricing_comparison_plan_id` - Plan ID used for comparison
- `normalized_price_per_seat_monthly` - Per-seat price (null if flat-rate)
- `normalized_price_per_seat_annual` - Annual per-seat price

**Migration:** `038_pricing_normalization.sql`

### Layer 2: Normalization Logic (`normalize.ts`)
Core functions that compute comparable pricing from structured data:

```typescript
import { normalizePricing } from '@/lib/pricing';

const normalized = normalizePricing(tool.specs.pricing_data);
// → { effective_starting_price_monthly: 27, display: { starting_from: "$27/mo", caveat: "(3 seat minimum)" } }
```

**Functions:**
- `normalizePricing(pricingData, preferredTier?)` - Compute comparable pricing
- `comparePricing(toolA, toolB)` - Side-by-side comparison
- `getPricingForTeamSize(pricingData, teamSize)` - Cost calculator

### Layer 3: Persistence (`persist.ts`)
Syncs normalized data to database columns:

```typescript
import { updateNormalizedPricing } from '@/lib/pricing';

await updateNormalizedPricing(supabase, itemId, specs);
```

**Called by:**
- Hunter pipeline (after saving tool)
- Admin pricing updates
- Backfill script

### Layer 4: Display
Use computed columns for queries, normalization functions for display:

```typescript
// Query tools in a price range (uses computed columns)
const tools = await supabase
  .from('items')
  .select('*')
  .gte('effective_starting_price_monthly', 20)
  .lte('effective_starting_price_monthly', 50);

// Display pricing with context (uses normalization function)
const normalized = normalizePricing(tool.specs.pricing_data);
console.log(normalized.display.starting_from); // "$27/mo"
console.log(normalized.display.caveat); // "(3 seat minimum)"
```

## Backfill Existing Data

```bash
# Preview changes
npm run pricing:backfill -- --dry-run

# Update database
npm run pricing:backfill

# Custom batch size
npm run pricing:backfill -- --batch=100
```

## Comparison Strategy

When comparing tools, we:
1. Find the **lowest paid plan** (exclude free and "Contact Sales")
2. Account for **minimum seats** (e.g., 3 seat minimum × $9/seat = $27 effective)
3. Prefer **monthly pricing** for comparison (most common)
4. Show **caveats** transparently (minimums, annual-only, etc.)

## Adding New Pricing Fields

To add a new computed field:

1. **Update migration** (`038_pricing_normalization.sql`)
2. **Update `NormalizedPricing` type** (`normalize.ts`)
3. **Update `normalizePricing()` logic** (`normalize.ts`)
4. **Update `updateNormalizedPricing()` persist** (`persist.ts`)
5. **Run backfill** (`npm run pricing:backfill`)

## Testing

```bash
# Dry-run backfill (shows what would change)
npm run pricing:backfill -- --dry-run

# Run hunter on a specific tool (will auto-normalize)
npm run hunt -- --tool="ClickUp"

# Verify in database
SELECT
  name,
  effective_starting_price_monthly,
  pricing_comparison_tier,
  normalized_price_per_seat_monthly
FROM items
WHERE slug IN ('clickup', 'monday-com');
```

## Best Practices

1. **Always use `specs.pricing_data` (SMPPricingData) as source of truth**
   - Don't rely on legacy `starting_price` string field

2. **Precompute for performance**
   - Computed columns make queries fast
   - Normalization runs on write, not read

3. **Be transparent about caveats**
   - Show minimums: "(3 seat minimum)"
   - Show restrictions: "(annual only)"

4. **Compare like-for-like tiers**
   - Individual vs individual
   - Team vs team
   - Use `preferredTier` parameter when comparing

5. **Update normalized pricing after any price change**
   - Hunter does this automatically
   - Manual updates via `updateNormalizedPricing()`

## Future Extensions

- [ ] Volume tier pricing (10+ seats get discounts)
- [ ] Geographic pricing variations (USD vs EUR vs GBP)
- [ ] Add-on costs (SSO, storage, etc.)
- [ ] Contract terms (annual commitment, cancellation fees)
- [ ] Suite bundling (Google Workspace vs individual tools)
