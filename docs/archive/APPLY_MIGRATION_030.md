# Apply Migration 030: Parent/Child Relationship

## Quick Apply (Supabase Dashboard)

1. Go to: https://supabase.com/dashboard/project/yjtsyvzhplcwvfbkzcjt/sql/new

2. Copy and paste this SQL:

```sql
-- Migration 030: Add parent/child relationship for bundled tools
-- Description: Allows items to reference other items (e.g., Google Meet → Google Workspace)

-- Add parent_id column with foreign key to self
ALTER TABLE items
ADD COLUMN parent_id UUID REFERENCES items(id) ON DELETE SET NULL;

-- Add index for performance when querying siblings
CREATE INDEX idx_items_parent_id ON items(parent_id);

-- Add comment for documentation
COMMENT ON COLUMN items.parent_id IS 'References parent suite for bundled tools (e.g., Google Meet → Google Workspace). NULL for standalone tools.';
```

3. Click **Run** (or press Cmd+Enter)

4. You should see: ✅ **Success. No rows returned**

## Verification

Run this query to verify the migration worked:

```sql
-- Check column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'items' AND column_name = 'parent_id';

-- Expected output:
-- column_name | data_type | is_nullable
-- parent_id   | uuid      | YES

-- Check index exists
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'items' AND indexname = 'idx_items_parent_id';

-- Expected output:
-- indexname              | indexdef
-- idx_items_parent_id    | CREATE INDEX idx_items_parent_id ON public.items USING btree (parent_id)
```

## Test the Implementation

After applying the migration, test bundle detection:

```bash
# Hunt a bundled tool
npm run hunt -- --tool="Google Calendar"
```

**Expected logs:**

```
[Pricing CoT] BUNDLE DETECTED: Google Calendar is bundled in Google Workspace...
[Suite] Tool is bundled in: Google Workspace
[Suite] Linked to parent suite (ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
[Embedding] Anchored text: Tool: Google Calendar | Part of the Google Workspace suite | ...
```

**Verify in database:**

```sql
SELECT
  name,
  parent_id,
  specs->'smp'->'pricing'->>'bundled_in' as bundled_in
FROM items
WHERE name = 'Google Calendar';

-- Expected:
-- name             | parent_id                              | bundled_in
-- Google Calendar  | xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx  | Google Workspace
```

## Rollback (if needed)

If something goes wrong, rollback with:

```sql
DROP INDEX IF EXISTS idx_items_parent_id;
ALTER TABLE items DROP COLUMN IF EXISTS parent_id;
```

## What This Enables

✅ Single source of truth for suite pricing
✅ Ecosystem navigation ("Also in Google Workspace")
✅ Inherited compliance/security specs
✅ "Already paid for" calculator logic
✅ Better vector search (includes suite context)
