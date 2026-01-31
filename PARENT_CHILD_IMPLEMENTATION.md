# Parent/Child Relationship Implementation

## Overview

Implemented parent/child relationship for bundled tools (e.g., Google Meet → Google Workspace).This enables:
- Single source of truth for suite pricing
- Ecosystem navigation (sibling tools)
- Inherited compliance/security specs
- "Already paid for" calculator logic

## Changes Made

### 1. **Schema Migration** (`supabase/migrations/030_add_parent_child_relationship.sql`)
```sql
ALTER TABLE items
ADD COLUMN parent_id UUID REFERENCES items(id) ON DELETE SET NULL;

CREATE INDEX idx_items_parent_id ON items(parent_id);
```

### 2. **TypeScript Types** (`src/types/database.ts`)
- Added `parent_id: string | null` to `Item` interface
- Added `parent_id?: string | null` to `ItemInsert` interface

### 3. **Knowledge Card Schema** (`src/lib/knowledge-card.ts`)
- Added `is_standalone: boolean` to `SMPPricingDataSchema`
- Added `bundled_in: string | null` to `SMPPricingDataSchema`

### 4. **Suite Manager** (`src/lib/hunter/utils/suite-manager.ts`)
New utility module with:
- `ensureParentSuite()` - Find or create suite stub
- `getSiblings()` - Get all sibling tools

### 5. **Persistence Phase** (`src/lib/hunter/phases/persistence.ts`)
- Import `ensureParentSuite`
- Check for `bundled_in` in knowledge card
- Create parent suite stub if needed
- Set `parent_id` when saving bundled tools

### 6. **Embedding Logic** (`src/lib/hunter/phases/analysis.ts`)
- Added "Part of [Suite]" to embedding text
- Improves semantic search: "Google Workspace video tool" → finds Meet

### 7. **Gemini Prompt** (`src/lib/hunter/services/gemini.ts`)
- Enhanced bundle detection with clear criteria
- Instructs AI to set `is_standalone` and `bundled_in`
- Logs bundle detection in `pricing_analysis_log`

## How It Works

### Data Flow

1. **Research Phase**: Scrapes pricing pages
2. **Analysis Phase**:
   - Gemini detects bundle: "Google Calendar is bundled in Google Workspace"
   - Sets `is_standalone: false`, `bundled_in: "Google Workspace"`
   - Embedding includes: "Part of the Google Workspace suite"
3. **Persistence Phase**:
   - Calls `ensureParentSuite("Google Workspace")`
   - Creates stub if doesn't exist, or returns existing ID
   - Sets `parent_id` on Google Calendar item

### Suite Stub

When a bundled tool is hunted before its parent suite, a "stub" is created:

```json
{
  "name": "Google Workspace",
  "slug": "google-workspace",
  "short_description": "Google Workspace - Suite pricing placeholder",
  "specs": {
    "taxonomy": {
      "primary_function": "Suite"
    }
  }
}
```

The stub can be filled in later when the suite is hunted.

## Testing

### Test Case 1: Bundle Detection

```bash
npm run hunt -- --tool="Google Calendar"
```

**Expected**:
```
[Pricing CoT] BUNDLE DETECTED: Google Calendar is bundled in Google Workspace...
[Suite] Tool is bundled in: Google Workspace
[Suite] Linked to parent suite (ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
```

### Test Case 2: Embedding Includes Suite

Check logs:
```
[Embedding] Anchored text: Tool: Google Calendar | Part of the Google Workspace suite | Category: Scheduling | ...
```

### Test Case 3: Sibling Query

```javascript
import { getSiblings } from '@/lib/hunter/utils/suite-manager';

const siblings = await getSiblings(supabase, googleMeetId);
// Returns: [{id, name: "Google Calendar", slug}, {id, name: "Google Drive", slug}, ...]
```

## Future Features Enabled

### 1. **Ecosystem Navigation Sidebar**

```tsx
const siblings = await supabase.rpc('get_siblings', { item_id: currentItemId });

<aside>
  <h3>Also in {parentSuite.name}</h3>
  <ul>
    {siblings.map(sibling => (
      <li key={sibling.id}>
        <Link href={`/tool/${sibling.slug}`}>{sibling.name}</Link>
      </li>
    ))}
  </ul>
</aside>
```

### 2. **Inherited Compliance**

```tsx
const compliance = tool.specs.security || tool.parent.specs.security;

{compliance && (
  <p>Security: {compliance.join(', ')}
    {tool.parent_id && ' (Inherited from ' + parentName + ')'}
  </p>
)}
```

### 3. **"Already Paid For" Calculator**

```tsx
if (tool.parent_id && userStack.includes(tool.parent_id)) {
  return {
    price: 0,
    note: `Included in your ${parentName} subscription`
  };
}
```

## Migration Instructions

### Option A: Supabase Dashboard

1. Go to https://supabase.com/dashboard/project/yjtsyvzhplcwvfbkzcjt/sql/new
2. Paste:
   ```sql
   ALTER TABLE items
   ADD COLUMN parent_id UUID REFERENCES items(id) ON DELETE SET NULL;

   CREATE INDEX idx_items_parent_id ON items(parent_id);

   COMMENT ON COLUMN items.parent_id IS 'References parent suite for bundled tools. NULL for standalone tools.';
   ```
3. Click "Run"

### Option B: Local Supabase CLI

```bash
npx supabase db push
```

## Verification

After migration, verify:

1. **Column exists**:
   ```sql
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'items' AND column_name = 'parent_id';
   ```

2. **Index exists**:
   ```sql
   SELECT indexname
   FROM pg_indexes
   WHERE tablename = 'items' AND indexname = 'idx_items_parent_id';
   ```

3. **Hunt a bundled tool**:
   ```bash
   npm run hunt -- --tool="Google Calendar"
   ```

4. **Check parent_id is set**:
   ```sql
   SELECT name, parent_id
   FROM items
   WHERE name = 'Google Calendar';
   ```
