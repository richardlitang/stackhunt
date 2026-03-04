# StackHunt Content Strategy Guide

Last verified: 2026-03-05

## The Content Strategy Brief (CSB)

A CSB is the input that drives the Hunter agent. It's a structured way to tell the system what content to create.

### CSV Format

```csv
keyword,tool_name,context_query,search_volume,keyword_difficulty,cpc,pillar,priority,notes
```

| Column | Required | Description |
|--------|----------|-------------|
| `keyword` | Yes | The search term (e.g., "best invoicing software for freelancers") |
| `tool_name` | No | Specific tool if this is a single-tool or vs page |
| `context_query` | No | The context/list title (e.g., "Best X for Y") |
| `search_volume` | No | Monthly search volume (from Ahrefs/SEMrush) |
| `keyword_difficulty` | No | KD score 0-100 (lower = easier) |
| `cpc` | No | Cost-per-click (higher = more commercial intent) |
| `pillar` | No | Category pillar: `builder`, `creative`, `growth`, `operations` |
| `priority` | No | `high`, `medium`, `low` |
| `notes` | No | Editorial guidance for the Hunter |

### Content Types

The Hunter automatically detects the content type from the keyword:

| Type | Example Keyword | What Gets Created |
|------|-----------------|-------------------|
| `best_list` | "best crm for startups" | Context page with ranked tool list |
| `alternatives` | "slack alternatives" | Context page: "Slack Alternatives" |
| `comparison` | "notion vs obsidian" | Comparison page with side-by-side |
| `single_tool` | "supabase review" | Tool hub page |

---

## The Hunter Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│  CSV Import → Strategy Gatekeeper → Hunt Queue → CLI Worker     │
└─────────────────────────────────────────────────────────────────┘
```

### Step 1: Import Keywords

**Option A: Simple CSV**
```bash
npm run hunt -- --strategy import --file="keywords.csv"
```

**Option B: Ahrefs Export (with filtering)**
```bash
npm run hunt -- --strategy ahrefs --file="ahrefs-export.csv"
```

The Ahrefs import applies quality thresholds:
- Min search volume: 50 (configurable)
- Max keyword difficulty: 70 (configurable)
- Min CPC: $0.10 (filters out non-commercial)

### Step 2: Classify Keywords (AI)

```bash
npm run hunt -- --strategy classify --limit 50
```

Uses Gemini to:
- Determine content type (best_list, alternatives, comparison, single_tool)
- Extract tool names from keywords
- Suggest context titles

### Step 3: Analyze ROI

```bash
npm run hunt -- --strategy analyze
```

Calculates ROI score based on:
- Search volume × CPC = Traffic value
- Keyword difficulty = Competition
- Checks for duplicates (existing tools/contexts)

### Step 4: Approve to Queue

```bash
npm run hunt -- --strategy approve --priority 5 --limit 20
```

Moves high-ROI ideas to the hunt queue for processing.

### Step 5: Process Queue

```bash
# Process one item
npm run hunt -- --queue process

# Batch process
npm run hunt -- --queue batch --priority 10

# Check status
npm run hunt -- --queue status
```

### Direct Hunt (Bypass Queue)

For quick one-off content:
```bash
# Tool only
npm run hunt -- --tool="Supabase"

# Tool + Context
npm run hunt -- --tool="Slack" --context="Best for Remote Teams"

# Publish immediately (skip review)
npm run hunt -- --tool="Linear" --publish
```

---

## Quality Gates

### The Gatekeeper Rules

1. **Duplicate Prevention**: Won't create content for tools/contexts that exist
2. **ROI Threshold**: Low-value keywords get rejected
3. **Draft Mode**: All queue items create drafts (requires manual review)
4. **Source Attribution**: Every claim links to a source (Reddit, G2, official docs)

### The Review Queue

All Hunter-generated content goes to `/admin/review`:
- Verify factual accuracy
- Check hedging language ("Users report that...")
- Approve/reject with notes

---

## Pillar Strategy

When importing, tag keywords by pillar to maintain focus:

| Pillar | Categories | Priority |
|--------|------------|----------|
| **Builder** | Dev Tools, No-Code, AI/Automation | Core (our origin) |
| **Creative** | Design, Video/Audio, Writing | Expansion |
| **Growth** | Marketing, Sales/CRM, SEO | High commercial value |
| **Operations** | Freelance Ops, Collaboration, Finance | High freelancer appeal |

### The "Freelancer Filter"

When writing for Operations/Creative pillars, emphasize:
- Free tiers and one-time pricing
- "Overkill for solos" warnings (e.g., Salesforce)
- Open Source alternatives (our wedge)

---

## Environment Setup

Required for hunting:
```bash
# .env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# For AI hunting
GEMINI_API_KEY=xxx
SERPER_API_KEY=xxx
```

---

## Quick Reference

```bash
# Import & classify
npm run hunt -- --strategy import --file="csb.csv"
npm run hunt -- --strategy classify

# Analyze & approve
npm run hunt -- --strategy analyze
npm run hunt -- --strategy approve --priority 5

# Process queue
npm run hunt -- --queue process
npm run hunt -- --queue status

# Direct hunt
npm run hunt -- --tool="Notion" --context="Best for Students"

# War room dashboard
npm run hunt -- --strategy status
```

---

## Template File

See `docs/content-strategy-brief-template.csv` for a ready-to-use example with 15 high-value topics across all pillars.
