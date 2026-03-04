# Keyword Intelligence Spec

Last verified: 2026-03-05

**Problem:** Content ideas are imported as-is without understanding keyword intent. This leads to missed opportunities and incomplete content generation.

---

## Current Behavior (Broken ❌)

### Example: "discord vs slack for work"

**What happens now:**
1. Import: `tool_name = "Discord"`, `context_query = "Discord vs Slack for Work"`
2. Queue: Creates 1 hunt_queue item for "Discord"
3. Hunt: Creates/updates Discord tool page only
4. **MISSING:** Slack tool page, comparison page, "Best for Work" context

**What SHOULD happen:**
1. Detect keyword type: **COMPARISON**
2. Create hunt plan:
   - Hunt Discord (if not exists)
   - Hunt Slack (if not exists)
   - Generate comparison page: `/compare/discord-vs-slack`
   - Create context: "Best for Work" → review both tools in this context
3. Execute all 4 steps atomically

---

## Keyword Type Detection

### Pattern Recognition

| Keyword Pattern | Type | Tools | Actions |
|----------------|------|-------|---------|
| `best X for Y` | CONTEXT | None explicit | 1. Create context "Best X for Y"<br>2. Find tools matching X category<br>3. Review all in context |
| `X review` | TOOL_REVIEW | X | 1. Hunt tool X<br>2. Create general review |
| `X vs Y` | COMPARISON | X, Y | 1. Hunt X<br>2. Hunt Y<br>3. Create comparison<br>4. Extract context from "vs Y for Z" |
| `X alternatives` | ALTERNATIVES | X + discover | 1. Hunt X<br>2. Find competitors from X.specs.competitors<br>3. Create context "X Alternatives"<br>4. Review all alternatives |
| `X vs Y vs Z` | MULTI_COMPARISON | X, Y, Z | 1. Hunt all tools<br>2. Create pairwise comparisons<br>3. Create roundup context |

---

## Detailed Examples

### 1. "best seo tools for startups"

**Current:**
```json
{
  "keyword": "best seo tools for startups",
  "tool_name": null,
  "context_query": "Best SEO Tools for Startups"
}
```

**Intelligent Handling:**
```javascript
{
  type: "CONTEXT",
  context: {
    title: "Best SEO Tools for Startups",
    slug: "best-seo-tools-for-startups",
    target_audience: "Startups"
  },
  actions: [
    { type: "discover_tools", category: "SEO", audience: "Startups" },
    { type: "create_context", ...context },
    { type: "review_tools", context_id, tool_ids: [...discovered] }
  ]
}
```

**Workflow:**
1. Create context "Best SEO Tools for Startups"
2. Query existing tools WHERE category = "SEO" OR "Analytics"
3. Generate contextual reviews for each tool in "Startups" perspective
4. No new hunts needed - use existing data!

---

### 2. "twenty crm review"

**Current:**
```json
{
  "keyword": "twenty crm review",
  "tool_name": "Twenty",
  "context_query": "Twenty CRM Review"
}
```

**Intelligent Handling:**
```javascript
{
  type: "TOOL_REVIEW",
  tool: { name: "Twenty", category: "CRM" },
  actions: [
    { type: "hunt_tool", tool_name: "Twenty" },
    { type: "create_general_review" }
  ]
}
```

**Workflow:**
1. Check if Twenty exists in DB
2. If not: Hunt Twenty (full research)
3. If exists but stale: Refresh hunt (pricing update)
4. Generate standalone review page

---

### 3. "discord vs slack for work"

**Current (BROKEN):**
```json
{
  "keyword": "discord vs slack for work",
  "tool_name": "Discord", // ❌ Only first tool!
  "context_query": "Discord vs Slack for Work"
}
```

**Intelligent Handling:**
```javascript
{
  type: "COMPARISON",
  tools: ["Discord", "Slack"],
  context: "Best for Work", // Extracted from "for work"
  actions: [
    { type: "hunt_tool", tool_name: "Discord" },
    { type: "hunt_tool", tool_name: "Slack" },
    { type: "create_comparison", slug: "discord-vs-slack" },
    { type: "create_context", title: "Best for Work" },
    { type: "review_in_context", tools: ["Discord", "Slack"], context: "Best for Work" }
  ]
}
```

**Workflow:**
1. Hunt Discord (if not exists)
2. Hunt Slack (if not exists)
3. Create comparison page: `/compare/discord-vs-slack`
4. Create context: "Best for Work"
5. Review both tools in "Work" context

**URL Homes:**
- `/tool/discord` - Tool page
- `/tool/slack` - Tool page
- `/compare/discord-vs-slack` - Comparison page
- `/best/best-for-work` - Context page listing both

---

### 4. "typeform alternatives"

**Current:**
```json
{
  "keyword": "typeform alternatives",
  "tool_name": "Typeform",
  "context_query": "Typeform Alternatives"
}
```

**Intelligent Handling:**
```javascript
{
  type: "ALTERNATIVES",
  anchor_tool: "Typeform",
  actions: [
    { type: "hunt_tool", tool_name: "Typeform" },
    { type: "discover_competitors", from: "Typeform.specs.competitors" },
    { type: "hunt_competitors", tool_names: [...discovered] },
    { type: "create_context", title: "Typeform Alternatives" },
    { type: "review_all_in_context" }
  ]
}
```

**Workflow:**
1. Hunt Typeform (if not exists)
2. Read Typeform.specs.competitors → ["Google Forms", "Tally", "Jotform"]
3. Hunt each competitor (if not exists)
4. Create context "Typeform Alternatives"
5. Review all in context

---

### 5. "convertkit vs mailchimp"

**Current (BROKEN):**
```json
{
  "keyword": "convertkit vs mailchimp",
  "tool_name": "ConvertKit", // ❌ Only first tool
  "context_query": "ConvertKit vs Mailchimp"
}
```

**Intelligent Handling:**
```javascript
{
  type: "COMPARISON",
  tools: ["ConvertKit", "Mailchimp"],
  context: null, // No "for X" context hint
  actions: [
    { type: "hunt_tool", tool_name: "ConvertKit" },
    { type: "hunt_tool", tool_name: "Mailchimp" },
    { type: "create_comparison", slug: "convertkit-vs-mailchimp" }
  ]
}
```

**Workflow:**
1. Hunt ConvertKit
2. Hunt Mailchimp
3. Create comparison page
4. No context needed (no "for X" in keyword)

---

## Graceful Failure Handling

### Scenario: "bench accounting review" (Tool Shut Down)

**Detection Points:**

1. **During Web Search (Phase 1):**
   ```
   Search results contain:
   - "Bench accounting shut down"
   - "Bench discontinues service"
   - "Bench acquired and closed"
   ```

2. **During Knowledge Extraction (Phase 2):**
   ```javascript
   {
     company: {
       status: "defunct",
       shutdown_date: "2024-03-15",
       shutdown_reason: "Acquired by Intuit, service discontinued"
     }
   }
   ```

**Graceful Handling:**

```javascript
// In orchestrator.ts
if (knowledgeCard.company?.status === 'defunct') {
  await markContentIdeaAsSkipped(contentIdeaId, {
    reason: 'tool_defunct',
    details: knowledgeCard.company.shutdown_reason,
    permanent: true // Don't retry
  });

  return {
    success: false,
    skipped: true,
    reason: `${toolName} is no longer available (${knowledgeCard.company.shutdown_reason})`
  };
}
```

**Database Schema Addition:**

```sql
ALTER TABLE content_ideas
ADD COLUMN skip_reason TEXT,
ADD COLUMN skip_details JSONB,
ADD COLUMN skip_permanent BOOLEAN DEFAULT false;
```

**Status Flow:**
- `pending` → `skipped` (if tool defunct)
- `pending` → `failed` (if temporary error, can retry)
- `pending` → `queued` → `completed` (success)

---

## Implementation Plan

### Phase 1: Keyword Parser (NEW SCRIPT)

**File:** `scripts/parse-keyword-intent.ts`

```typescript
interface KeywordIntent {
  type: 'CONTEXT' | 'TOOL_REVIEW' | 'COMPARISON' | 'ALTERNATIVES' | 'MULTI_COMPARISON';
  tools: string[];
  context?: string;
  actions: Action[];
}

function parseKeywordIntent(keyword: string): KeywordIntent {
  // Regex patterns
  const vsPattern = /^(\w+)\s+vs\s+(\w+)(?:\s+for\s+(.+))?$/i;
  const alternativesPattern = /^(\w+)\s+alternatives?$/i;
  const reviewPattern = /^(\w+)\s+review$/i;
  const bestForPattern = /^best\s+(.+)\s+for\s+(.+)$/i;

  // ... parsing logic
}
```

### Phase 2: Smart Queue Builder (MODIFY EXISTING)

**File:** `scripts/queue-content-ideas.ts`

**Current:** Dumb 1:1 mapping (1 keyword → 1 hunt_queue item)

**New:** Smart multi-step planning
```typescript
async function queueContentIdea(idea: ContentIdea) {
  const intent = parseKeywordIntent(idea.keyword);

  switch (intent.type) {
    case 'COMPARISON':
      await queueComparison(intent);
      break;
    case 'ALTERNATIVES':
      await queueAlternatives(intent);
      break;
    // ... other types
  }
}
```

### Phase 3: Defunct Tool Detection (MODIFY HUNTER)

**File:** `src/lib/hunter/phases/research.ts`

Add shutdown detection:
```typescript
// In extractKnowledgeCard()
const shutdownIndicators = [
  'shut down',
  'discontinued',
  'no longer available',
  'service ended',
  'acquired and closed'
];

if (snippets.some(s => shutdownIndicators.some(ind => s.includes(ind)))) {
  return {
    status: 'defunct',
    shutdown_detected: true
  };
}
```

### Phase 4: Status Sync (NEW SCRIPT)

**File:** `scripts/sync-content-idea-status.ts`

Update content_ideas.status based on hunt_queue completion:
```typescript
// Check hunt_queue for completion
// Update content_ideas status to 'completed' or 'skipped'
```

---

## Testing Matrix

| Keyword | Expected Outputs |
|---------|------------------|
| `best crm for startups` | 1 context, N reviews (N = existing CRM tools) |
| `notion review` | 1 tool page, 1 review |
| `notion vs obsidian` | 2 tool pages, 1 comparison |
| `notion vs obsidian vs roam` | 3 tool pages, 3 comparisons, 1 roundup context |
| `notion alternatives` | 1 tool page (Notion), N tool pages (competitors), 1 context |
| `figma vs sketch for designers` | 2 tool pages, 1 comparison, 1 context ("Best for Designers") |
| `bench accounting review` | **SKIP** (detect shutdown), mark permanent skip |

---

## Migration Strategy

### Step 1: Add New Columns
```sql
ALTER TABLE content_ideas
ADD COLUMN keyword_type TEXT,
ADD COLUMN extracted_tools TEXT[],
ADD COLUMN skip_reason TEXT,
ADD COLUMN skip_permanent BOOLEAN DEFAULT false;
```

### Step 2: Backfill Analysis
```bash
npx tsx scripts/analyze-pending-keywords.ts
# Parse all 169 pending keywords
# Populate keyword_type and extracted_tools
```

### Step 3: Implement Parser
```bash
# Build parse-keyword-intent.ts
# Test with all 10 examples from user
```

### Step 4: Update Queue Script
```bash
# Modify queue-content-ideas.ts
# Use parser to create multi-step hunt plans
```

### Step 5: Add Shutdown Detection
```bash
# Modify hunter research phase
# Add defunct tool handling
```

---

## Benefits

**Current State:**
- 1 keyword → 1 hunt → 1 page
- "discord vs slack" creates 1 tool page ❌
- "typeform alternatives" creates 1 tool page ❌
- Defunct tools waste API credits ❌

**After Implementation:**
- 1 keyword → N hunts → M pages (intelligent expansion)
- "discord vs slack" creates 2 tool pages + 1 comparison + 1 context ✅
- "typeform alternatives" creates 5+ pages (Typeform + competitors + context) ✅
- Defunct tools skipped immediately ✅

**Impact:**
- **3-5x content output** per keyword
- **0 wasted hunts** on defunct tools
- **Better SEO coverage** (more URL homes per keyword)
- **Cleaner workflow** (automated multi-step planning)

---

*Generated: 2026-01-31*
