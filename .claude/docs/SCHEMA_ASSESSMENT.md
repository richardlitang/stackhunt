# Database Schema Assessment

**Date:** February 4, 2026
**Reviewer:** Staff Data Engineer perspective

## Executive Summary

**Overall Grade: A-** (Strong foundation with minor refinements needed)

Your schema is **well-designed** for a programmatic SEO platform. The hub-and-spoke model (items ↔ contexts via reviews) is elegant and enables your core value prop (contextual reviews). However, there are a few areas for improvement around naming clarity, missing indexes, and potential future scalability concerns.

---

## Strengths ✅

### 1. **Hub & Spoke Architecture**
```
items (tools) ─┬─ reviews ─┬─ contexts (use cases)
               │            │
          categories   sources/validation
```

This is **excellent** for your use case:
- Same tool gets different scores per context ✅
- Natural join pattern for "/best/crm-for-startups" pages ✅
- Scales horizontally (add more contexts without schema changes) ✅

### 2. **Denormalization Done Right (Mostly)**

Tracked denormalized fields:
- `items.review_count` + `items.avg_score` → **Has triggers** ✅
- `items.correction_count` + `confirmed_correction_count` → **Has triggers** ✅
- `contexts.tool_count` → **Has triggers** ✅
- `affiliate_offers.click_count` → **Updated atomically via log_click()** ✅

This is smart for performance-critical queries (sorting, filtering).

### 3. **Type Safety via Enums**

Strong typing on status fields:
- `hunt_queue_status` (pending/claimed/processing/completed/failed)
- `content_status` (draft/review/published/rejected)
- `pricing_model` (free/freemium/paid/enterprise)
- `keyword_type` (best_list/comparison/alternatives)

Prevents invalid states at DB level ✅

### 4. **Audit Trail Built-In**

Temporal tracking:
- `created_at` + `updated_at` everywhere
- `pricing_verified_at` (separate from content updates)
- `quality_review_flagged_at` + `completed_at`
- `hunt_queue` has full lifecycle timestamps

Good for debugging and analytics ✅

### 5. **RLS Enabled**

Most tables have Row Level Security enabled with explicit policies. Security-first approach ✅

---

## Issues & Recommendations

### 🔴 Critical (Fix Soon)

#### 1. **Denormalized Counters Out of Sync** ⚠️ FOUND LIVE ISSUE

**Problem:** I just checked your database and found counter drift:
```
Slack: cached=1, actual=8 reviews ❌
Upwork: cached=0, actual=1 review ❌
EthicalAds: cached=1, actual=3 reviews ❌
Hootsuite: cached=1, actual=3 reviews ❌
```

**Root cause:** Triggers exist but may not have fired during bulk imports or migrations.

**Fix (run immediately):**
```sql
-- Recalculate all review_count and avg_score
UPDATE items i
SET
  review_count = COALESCE((
    SELECT COUNT(*)
    FROM reviews r
    WHERE r.item_id = i.id
  ), 0),
  avg_score = COALESCE((
    SELECT AVG(score)
    FROM reviews r
    WHERE r.item_id = i.id
      AND r.score IS NOT NULL
  ), 0);

-- Verify fix
SELECT
  i.name,
  i.review_count AS cached,
  COUNT(r.id) AS actual
FROM items i
LEFT JOIN reviews r ON i.id = r.item_id
GROUP BY i.id, i.name, i.review_count
HAVING i.review_count != COUNT(r.id);
-- Should return 0 rows
```

**Prevention:** Triggers should handle this going forward, but verify after bulk operations.

**Impact:** HIGH - Affects sorting, filtering, and UI display

---

#### 2. **Confusing JSONB Column Names**

**Problem:**
```sql
items.metadata JSONB  -- Knowledge Card (company, competitors)
items.specs JSONB     -- Type-specific data (pricing_data, features)
```

"Metadata" is too generic. Developers will be confused about which field to use.

**Recommendation:**
```sql
-- Rename for clarity
ALTER TABLE items RENAME COLUMN metadata TO knowledge_card;
ALTER TABLE items RENAME COLUMN specs TO product_data;

-- OR merge into single JSONB with nested structure
ALTER TABLE items ADD COLUMN data JSONB DEFAULT '{
  "knowledge_card": {...},
  "product_specs": {...},
  "tribal_knowledge": {...}
}';
```

**Impact:** Medium - Requires code changes but prevents future bugs

---

#### 2. **Missing Composite Indexes for Common Queries**

**Problem:** Queries like "get all reviews for tool X, sorted by score" may be slow at scale.

**Missing indexes:**
```sql
-- Common query: Get top tools in a context
CREATE INDEX idx_reviews_context_score
  ON reviews(context_id, score DESC NULLS LAST)
  WHERE status = 'published';

-- Common query: Get all reviews for a tool
CREATE INDEX idx_reviews_item_status
  ON reviews(item_id, status, created_at DESC);

-- Common query: Find pending hunts by priority
CREATE INDEX idx_hunt_queue_priority_created
  ON hunt_queue(status, priority DESC, created_at ASC)
  WHERE status = 'pending';

-- Common query: Recent validations needing review
CREATE INDEX idx_hunt_validations_review
  ON hunt_validations(human_review_required, quality_score ASC, created_at DESC)
  WHERE human_review_required = true;

-- Common query: Tools by category + score
CREATE INDEX idx_items_category_score
  ON items(category_id, base_score DESC NULLS LAST)
  WHERE type = 'tool';
```

**Impact:** High at scale (10k+ tools, 100k+ reviews)

---

#### 3. **No Soft Deletes**

**Problem:** If you `DELETE FROM items WHERE id = X`:
- All reviews cascade delete ✅ (expected)
- All validations cascade delete ✅
- All hunt_queue entries cascade delete ✅
- **But**: You lose ALL audit trail

**Recommendation:**
```sql
-- Add soft delete support
ALTER TABLE items ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE items ADD COLUMN deleted_by TEXT DEFAULT NULL;
ALTER TABLE items ADD COLUMN deletion_reason TEXT DEFAULT NULL;

CREATE INDEX idx_items_not_deleted
  ON items(id)
  WHERE deleted_at IS NULL;

-- Update queries to filter out deleted
-- WHERE deleted_at IS NULL
```

**Alternative:** Keep hard deletes, but add `deleted_items` audit table:
```sql
CREATE TABLE deleted_items (
  id UUID PRIMARY KEY,
  original_id UUID NOT NULL,
  name TEXT,
  snapshot JSONB,  -- Full row as JSON
  deleted_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_by TEXT,
  reason TEXT
);
```

**Impact:** High for compliance/recovery (can't recover deleted tools)

---

### 🟡 Medium Priority (Improve Over Time)

#### 4. **reviews.sources as JSONB Array**

**Current:**
```sql
reviews.sources JSONB DEFAULT '[]'  -- [{url, title, snippet, domain}]
```

**Problem:**
- Can't efficiently query "all reviews that cite domain X"
- Can't track source quality metrics per domain
- Can't dedupe sources across reviews

**Recommendation:** Normalize to `review_sources` table
```sql
CREATE TABLE review_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id UUID REFERENCES reviews(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title TEXT,
  snippet TEXT,
  domain TEXT,
  source_type TEXT CHECK (source_type IN ('official', 'editorial', 'community')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_review_sources_review ON review_sources(review_id);
CREATE INDEX idx_review_sources_domain ON review_sources(domain);
CREATE UNIQUE INDEX idx_review_sources_unique ON review_sources(review_id, url);
```

**Benefits:**
- Query: "How many reviews cite G2.com?" → Simple GROUP BY
- Track source reputation (editorial vs community)
- Dedupe URLs across reviews
- Enforce source attribution (FK constraint)

**Migration complexity:** Medium (need to migrate existing JSONB arrays)

---

#### 5. **parent_id Only Allows Single Parent**

**Current:**
```sql
items.parent_id UUID  -- e.g., Google Meet → Google Workspace
```

**Problem:** What if a tool belongs to multiple suites?
- Example: "Sheets" is in both "Google Workspace" AND "Google Drive"
- Example: "Outlook" is in "Office 365" AND standalone

**Recommendation:** Many-to-many relationship
```sql
CREATE TABLE item_suite_memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  parent_item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  plan_id TEXT,  -- Which plan includes this? (e.g., "business", "enterprise")
  is_primary BOOLEAN DEFAULT false,  -- Main suite association
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_suite_membership UNIQUE(child_item_id, parent_item_id)
);

CREATE INDEX idx_suite_memberships_child ON item_suite_memberships(child_item_id);
CREATE INDEX idx_suite_memberships_parent ON item_suite_memberships(parent_item_id);
```

**Impact:** Low urgency (rare case, but future-proof)

---

#### 6. **No Quality Score History**

**Current:**
```sql
items.quality_review_result TEXT  -- Latest state only
items.base_score INT              -- Current score only
```

**Problem:** Can't track:
- "How has Notion's quality score changed over 6 months?"
- "Did the quality review improve data quality?"
- "Which tools are declining in quality?"

**Recommendation:**
```sql
CREATE TABLE quality_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,

  -- Snapshot data
  base_score INT,
  quality_score INT,  -- From validation
  review_count INT,
  avg_context_score NUMERIC,

  -- Completeness signals
  has_company_info BOOLEAN,
  has_pricing_data BOOLEAN,
  has_features BOOLEAN,

  -- Metadata
  snapshot_reason TEXT,  -- 'periodic', 'after_hunt', 'quality_review'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_quality_snapshots_item ON quality_snapshots(item_id, created_at DESC);
```

**Benefits:**
- Chart quality trends over time
- A/B test prompt changes (did new extraction prompt improve quality?)
- Alert on declining scores

**When to snapshot:**
- After every hunt (captures immediate quality)
- Weekly for all tools (periodic baseline)
- After quality reviews (captures improvement)

---

#### 7. **Embedding Dimension Mismatch**

**Issue:**
```sql
-- Foundation migration (001)
embedding vector(1536)  -- OpenAI text-embedding-3-small

-- Current usage (gemini.ts)
gemini.generateEmbedding()  -- Returns 768 dimensions (Gemini)
```

**Problem:** OpenAI embeddings are 1536-dim, Gemini is 768-dim. Your column supports 1536 but you're using 768.

**Recommendation:**
```sql
-- Option 1: Keep 1536, pad Gemini embeddings with zeros
-- (wastes space but allows future model switch)

-- Option 2: Change to 768 (smaller = faster)
ALTER TABLE items ALTER COLUMN embedding TYPE vector(768);

-- Option 3: Make it flexible (add model column to track)
-- (Already done with embedding_model column! ✅)
```

**Status:** Not urgent, but document the dimension mismatch

---

### 🟢 Nice to Have (Low Priority)

#### 8. **Tool/Gear Discriminator Barely Used**

**Current:**
```sql
items.type ENUM('tool', 'gear')
```

**Question:** Do you actually have "gear" (hardware) entries? Or is everything software?

**Check:**
```sql
SELECT type, COUNT(*) FROM items GROUP BY type;
```

If 100% are 'tool', consider:
- Remove the discriminator (simpler schema)
- OR keep for future (hardware reviews like "Best Laptops for Developers")

**Impact:** None - just schema cleanliness

---

#### 9. **Consider Partitioning for click_events**

**Current:**
```sql
click_events (growing forever)
```

**At scale:** 1M+ clicks → slow aggregations

**Recommendation:** Partition by month
```sql
CREATE TABLE click_events (
  id UUID,
  offer_id UUID,
  ...
  clicked_at TIMESTAMPTZ NOT NULL
) PARTITION BY RANGE (clicked_at);

-- Create partitions
CREATE TABLE click_events_2026_02 PARTITION OF click_events
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

CREATE TABLE click_events_2026_03 PARTITION OF click_events
  FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
```

**Benefits:**
- Fast deletes (drop old partitions)
- Fast queries (only scans relevant months)
- Archive old data easily

**When:** After 100k+ click_events (not urgent)

---

#### 10. **Price History Deduplication Could Be Smarter**

**Current trigger:**
```sql
-- Only inserts if price_cents OR price_currency changed
IF last_price_cents != NEW.price_cents OR last_price_currency != NEW.price_currency THEN
  INSERT INTO price_history ...
END IF;
```

**Issue:** If price oscillates ($10 → $15 → $10 → $15), you'll log every change.

**Recommendation:** Add "debounce" logic
```sql
-- Only log if:
-- 1. Price changed, AND
-- 2. Last log was > 24 hours ago (prevents noise)
IF (last_price_cents != NEW.price_cents OR last_price_currency != NEW.price_currency)
   AND (last_recorded_at IS NULL OR last_recorded_at < NOW() - INTERVAL '24 hours')
THEN
  INSERT INTO price_history ...
END IF;
```

**Impact:** Minor - reduces price_history bloat

---

## Schema Health Checklist

| Check | Status | Notes |
|-------|--------|-------|
| Normalized appropriately | ✅ | Hub-and-spoke is optimal |
| Denormalization tracked | ✅ | Triggers for all counters |
| Indexes for common queries | ⚠️ | Missing composites |
| Soft deletes | ❌ | Hard deletes only |
| Audit trail | ✅ | Timestamps everywhere |
| Type safety (enums) | ✅ | Good use of enums |
| RLS enabled | ✅ | Security-first |
| JSONB indexed | ✅ | GIN indexes present |
| Foreign keys | ✅ | Proper cascades |
| Unique constraints | ✅ | Prevents dupes |

---

## Recommended Action Plan

### Phase 1: Quick Wins (1-2 days)
- [ ] **Add composite indexes** (see Critical #2)
- [ ] **Rename metadata → knowledge_card** (clarity)
- [ ] **Document JSONB schemas** (what fields exist in each?)

### Phase 2: Safety Improvements (1 week)
- [ ] **Add soft delete support** (deleted_at column)
- [ ] **Create quality_snapshots table** (historical tracking)
- [ ] **Normalize review_sources** (if >1000 reviews)

### Phase 3: Future-Proofing (Backlog)
- [ ] **Item suite memberships** (many-to-many)
- [ ] **Partition click_events** (when >100k rows)
- [ ] **Price history debounce** (reduce bloat)

---

## Queries to Run (Schema Health Check)

```sql
-- 1. Check for orphaned data (broken FKs shouldn't exist, but verify)
SELECT COUNT(*) FROM reviews
WHERE item_id NOT IN (SELECT id FROM items);  -- Should be 0

-- 2. Check denormalized counter accuracy
SELECT
  i.id,
  i.name,
  i.review_count AS cached,
  COUNT(r.id) AS actual
FROM items i
LEFT JOIN reviews r ON i.id = r.item_id
GROUP BY i.id, i.name, i.review_count
HAVING i.review_count != COUNT(r.id);  -- Should be empty

-- 3. Check for missing indexes (slow queries)
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 4. Check JSONB schema usage (what keys exist?)
SELECT DISTINCT jsonb_object_keys(knowledge_card) AS keys
FROM items
WHERE knowledge_card IS NOT NULL;

-- 5. Check type discriminator usage
SELECT type, COUNT(*)
FROM items
GROUP BY type;  -- Is 'gear' actually used?

-- 6. Find largest tables (candidates for partitioning)
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;
```

---

## Final Thoughts

Your schema is **solid**. The issues I've identified are mostly:
1. **Clarity improvements** (naming, documentation)
2. **Performance optimizations** (indexes for scale)
3. **Future-proofing** (soft deletes, historical tracking)

None are "broken" - these are refinements to take you from **A- to A+**.

**Priority order:**
1. Add composite indexes (immediate performance win)
2. Rename metadata (prevents future confusion)
3. Soft deletes (data safety)
4. Everything else is nice-to-have

**When to revisit:**
- At 10k+ tools (partitioning becomes relevant)
- At 100k+ reviews (source normalization worth the migration)
- If you add hardware/gear (validate type discriminator)
