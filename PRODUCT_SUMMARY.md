# StackHunt Product Summary

**Last Updated:** January 31, 2026

## Overview

StackHunt is an AI-powered programmatic SEO platform that automatically researches, analyzes, and generates contextual software reviews. The platform targets SEO-rich "best X for Y" queries with data-driven content generation.

## Core Value Proposition

1. **Automated Content Generation** - Hunter agent researches tools via web search and generates reviews using AI
2. **Contextual Reviews** - Tools reviewed in specific use-case contexts (e.g., "Best CRM for Startups")
3. **Strategy Gatekeeper** - Data-driven keyword selection with ROI scoring before spending API credits
4. **Knowledge Graph** - Multi-dimensional categorization (Function + Audience + Platform)
5. **Draft-First Workflow** - AI generates drafts, humans review and publish

---

## Architecture

### Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Astro v5 + React (Islands Architecture) + Tailwind CSS |
| Database | Supabase (PostgreSQL + pgvector + RLS) |
| AI Analysis | Google Gemini 2.0 Flash |
| Web Search | Serper API |
| Logo Service | Brandfetch (hotlinked) |
| Anti-Spam | Cloudflare Turnstile (invisible captcha) |
| Hosting | Vercel (serverless) |
| Notifications | Discord webhooks, Slack webhooks |

### Directory Structure

```
stackhunt/
├── src/
│   ├── components/           # React/Astro UI components
│   │   ├── *.astro          # Static/SSR components
│   │   └── *.tsx            # Interactive React islands
│   ├── layouts/             # BaseLayout, AdminLayout
│   ├── lib/
│   │   ├── hunter/          # Modular Hunter system
│   │   │   ├── orchestrator.ts   # Main 3-phase coordinator
│   │   │   ├── phases/           # Research, Analysis, Persistence
│   │   │   ├── services/         # Gemini, Serper, Logo, Queue
│   │   │   ├── types.ts          # TypeScript interfaces
│   │   │   └── errors.ts         # Error classification
│   │   ├── notifications/   # Discord, Slack webhooks
│   │   ├── verification/    # AI correction verification
│   │   ├── supabase.ts      # Database client
│   │   ├── auth.ts          # Admin authentication
│   │   └── rate-limit.ts    # API rate limiting
│   ├── pages/
│   │   ├── admin/           # Admin dashboard pages
│   │   ├── api/             # REST endpoints + cron handlers
│   │   │   ├── cron/        # Vercel cron endpoints
│   │   │   └── admin/       # Protected admin APIs
│   │   ├── best/            # Context pages (/best/[slug])
│   │   ├── tools/           # Tool pages (/tools/[slug])
│   │   ├── categories/      # Category pages
│   │   ├── compare/         # Comparison pages
│   │   └── go/              # Affiliate redirect
│   └── types/               # TypeScript definitions
│
├── scripts/                  # CLI tools for batch operations
│   ├── hunter.ts            # Main CLI (hunt, strategy, queue)
│   ├── queue-worker.ts      # Continuous queue processor
│   ├── hunt-worker.ts       # Alternative worker
│   ├── import-content-ideas.ts
│   ├── queue-content-ideas.ts
│   ├── verify-corrections.ts
│   ├── verify-affiliate-links.ts
│   └── discover-topics.ts
│
├── supabase/
│   └── migrations/          # 30 SQL migration files
│
└── vercel.json              # Deployment + cron config
```

---

## Database Schema

### Hub & Spoke Model

```
ITEMS (Hub)                    CONTEXTS (Spoke)
    │                              │
    └──────── REVIEWS ─────────────┘
          │           │
    CATEGORIES    PARENT_ID
 (Knowledge Graph)  (Suites)
```

### Core Tables

| Table | Purpose |
|-------|---------|
| `items` | Software products (tools/gear) with metadata, Knowledge Card, embeddings, parent/child relationships |
| `contexts` | Use-case contexts ("Best X for Y") with title templates |
| `reviews` | Contextual tool analysis with score, pros, cons, sources, review_context |
| `categories` | Multi-dimensional taxonomy (function/audience/platform) |
| `item_category_links` | Many-to-many item-category relationships |

### Content Pipeline Tables

| Table | Purpose |
|-------|---------|
| `hunt_queue` | Job queue with priority, status, worker tracking, heartbeat |
| `content_ideas` | Strategy gatekeeper staging area (pre-hunt) |
| `import_batches` | CSV import batch tracking and audit |

### Intelligence Tables

| Table | Purpose |
|-------|---------|
| `keyword_performance` | Track rankings over time (GSC/Ahrefs) |
| `competitors` | Competitor domains for gap analysis |
| `competitor_pages` | Competitor top pages with traffic data |
| `system_settings` | Configurable thresholds and weights |

### Monetization Tables (Future-Ready)

| Table | Purpose |
|-------|---------|
| `affiliate_offers` | Affiliate links with network tier, verification status |
| `click_events` | Click tracking with attribution |
| `market_state` | Current pricing state |
| `price_history` | Price changes over time |

### User Feedback Tables

| Table | Purpose |
|-------|---------|
| `votes` | Review upvotes/downvotes with anti-gaming (IP hash, fingerprint, Turnstile) |
| `corrections` | User-submitted corrections with AI verification |
| `verification_batches` | Tracks AI verification runs |

### Admin Tables

| Table | Purpose |
|-------|---------|
| `admin_sessions` | Token-based auth with expiry |
| `admin_users` | Admin accounts (future multi-user) |
| `rate_limits` | API rate limiting |
| `prompts` | Editable prompts (fallbacks in code) |

---

## System Flows

### 1. Strategy Gatekeeper Flow

Controls what content gets created before spending API credits.

```
┌─────────────────────────────────────────────────────────────────┐
│                    STRATEGY GATEKEEPER                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Ahrefs/SEMrush CSV                                            │
│         │                                                       │
│         ▼                                                       │
│  ┌─────────────┐     ┌──────────────┐     ┌───────────────┐   │
│  │   Import    │────▶│   Filter     │────▶│  AI Classify  │   │
│  │  (staging)  │     │ (thresholds) │     │ (keyword type)│   │
│  └─────────────┘     └──────────────┘     └───────────────┘   │
│                                                   │             │
│                                                   ▼             │
│  ┌─────────────┐     ┌──────────────┐     ┌───────────────┐   │
│  │ Hunt Queue  │◀────│   Approve    │◀────│ Calculate ROI │   │
│  │  (ready)    │     │  (manual/    │     │    Score      │   │
│  └─────────────┘     │   auto)      │     └───────────────┘   │
│                      └──────────────┘                          │
└─────────────────────────────────────────────────────────────────┘

Thresholds (configurable):
  - Min Volume: 50
  - Max Difficulty: 70
  - Min CPC: $0.10

ROI Formula:
  (Volume × CPC_weight) / (Difficulty + 10) × Type_multiplier

Type Multipliers:
  - best_list: 1.5x
  - comparison: 1.3x
  - alternatives: 1.2x
  - single_tool: 1.0x
  - informational: skip
```

**CLI Commands:**
```bash
npm run hunt -- --strategy ahrefs --file="export.csv"   # Import Ahrefs CSV
npm run hunt -- --strategy classify --limit 50          # AI classify keywords
npm run hunt -- --strategy analyze                      # Calculate ROI scores
npm run hunt -- --strategy approve --priority 5         # Auto-approve high ROI
npm run hunt -- --strategy status                       # View dashboard
```

### 2. Hunter Pipeline Flow

3-phase AI pipeline with cost optimization, early exits, and tribal knowledge extraction.

```
┌─────────────────────────────────────────────────────────────────┐
│                      HUNTER PIPELINE                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  PHASE 1: RESEARCH (12 Parallel Searches)                      │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Serper API (3 groups)                                 │    │
│  │                                                        │    │
│  │  Factual Queries (6):                                  │    │
│  │    ├─ [tool] reviews                                   │    │
│  │    ├─ [tool] pricing plans features                    │    │
│  │    ├─ [tool] pricing annual vs monthly cost            │    │
│  │    ├─ [tool] alternatives competitors vs               │    │
│  │    ├─ [tool] company founded funding headquarters      │    │
│  │    └─ [tool] API integrations data export import       │    │
│  │                                                        │    │
│  │  Budget Analyst Queries (2):                           │    │
│  │    ├─ [tool] hidden costs billing logic                │    │
│  │    └─ [tool] implementation fees setup cost minimums   │    │
│  │                                                        │    │
│  │  Tribal Knowledge Queries (4):                         │    │
│  │    ├─ [tool] reddit review pros cons                   │    │
│  │    ├─ [tool] what I wish I knew before using           │    │
│  │    ├─ [tool] advanced tips tricks shortcuts power user │    │
│  │    └─ is [tool] worth it reddit honest review          │    │
│  │                                                        │    │
│  │  Pass 1: Knowledge Card (The Librarian)                │    │
│  │    - Gemini extracts structured facts                  │    │
│  │    - Pricing logic (not just strings)                  │    │
│  │    - Bundle detection (Google Meet → Workspace)        │    │
│  │    - Company info, competitors, technical capabilities │    │
│  │                                                        │    │
│  │  Outputs: Search results, Knowledge Card extraction    │    │
│  │  Early Exit: Hard duplicate detected → skip analysis   │    │
│  └────────────────────────────────────────────────────────┘    │
│                           │                                     │
│                           ▼                                     │
│  PHASE 2: ANALYSIS                                             │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Pass 2: Full Synthesis (The Architect + Human Roles)  │    │
│  │                                                        │    │
│  │  The Architect:                                        │    │
│  │    - Score (0-100)                                     │    │
│  │    - Pros/Cons with source attribution                 │    │
│  │    - Summary markdown                                  │    │
│  │    - Sentiment tags                                    │    │
│  │    - Knowledge Graph tags (function, audience, platform)│   │
│  │                                                        │    │
│  │  The Budget Analyst (CFO):                             │    │
│  │    - Cost drivers (factual TCO)                        │    │
│  │    - One-time fees                                     │    │
│  │    - Commitment terms                                  │    │
│  │    - ROI threshold                                     │    │
│  │                                                        │    │
│  │  The User Advocate (Senior Engineer):                  │    │
│  │    - Vibe (2-3 words on the soul)                      │    │
│  │    - Origin story                                      │    │
│  │    - Ideal for / Avoid if                              │    │
│  │    - Power tip (insider shortcut)                      │    │
│  │    - Delighters / Frustrations                         │    │
│  │                                                        │    │
│  │  The Human Verdict:                                    │    │
│  │    - 2-sentence "Coffee Shop Speak" summary            │    │
│  │    - NO jargon: "seamless", "empowers", "robust" banned│   │
│  │                                                        │    │
│  │  + Vector embedding (Functional Anchor strategy)       │    │
│  │    - Embeds SPEC not VIBE                              │    │
│  │    - Includes "Part of [Suite]" for bundled tools      │    │
│  │  + Logo fetch (Brandfetch)                             │    │
│  └────────────────────────────────────────────────────────┘    │
│                           │                                     │
│                           ▼                                     │
│  PHASE 3: PERSISTENCE                                          │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Database Operations                                   │    │
│  │    ├─ Check for bundling (suite relationship)          │    │
│  │    ├─ Create parent suite stub if needed               │    │
│  │    ├─ Upsert item (fuzzy dedup by name)                │    │
│  │    ├─ Set parent_id for bundled tools                  │    │
│  │    ├─ Upsert context (fuzzy dedup by title)            │    │
│  │    ├─ Create review (draft or published)               │    │
│  │    ├─ Link categories (function, audience, platform)   │    │
│  │    └─ Create default affiliate offer                   │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3. Queue Worker Flow

Continuous processing with heartbeat monitoring and failure handling.

```
┌─────────────────────────────────────────────────────────────────┐
│                      QUEUE WORKER                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐                                          │
│  │  Claim Item      │  (Atomic via RPC: claim_hunt_queue_item) │
│  │  (pending→claimed)│                                          │
│  └────────┬─────────┘                                          │
│           │                                                     │
│           ▼                                                     │
│  ┌──────────────────┐     ┌──────────────────┐                 │
│  │  Start Heartbeat │────▶│  Execute Hunt    │                 │
│  │  (every 30s)     │     │  (3-phase)       │                 │
│  └──────────────────┘     └────────┬─────────┘                 │
│                                    │                            │
│           ┌────────────────────────┼────────────────────────┐  │
│           │                        │                        │  │
│           ▼                        ▼                        ▼  │
│  ┌──────────────┐        ┌──────────────┐        ┌──────────┐ │
│  │   Success    │        │   Failure    │        │  Stale   │ │
│  │  (completed) │        │   (failed)   │        │ (>5 min) │ │
│  └──────────────┘        └──────────────┘        └──────────┘ │
│                                    │                        │  │
│                                    │     Retry Logic:       │  │
│                                    │     - Max 3 attempts   │  │
│                                    │     - Exponential      │  │
│                                    │       backoff          │  │
│                                    │     - Released by      │  │
│                                    │       cleanup job      │  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

Worker Modes:
  Continuous:  npm run queue:worker -- --interval 6h --batch 5
  Single run:  npm run queue:worker -- --once
  With topics: npm run queue:worker -- --discover
```

### 4. V3.1: Review Context ("The Human Touch")

Tribal knowledge extraction from Reddit, forums, and honest user reviews.

```
┌─────────────────────────────────────────────────────────────────┐
│                    REVIEW CONTEXT EXTRACTION                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Input: Tribal Knowledge Snippets                              │
│    ├─ Reddit reviews: "What I wish I knew before..."           │
│    ├─ HackerNews discussions: Honest pros/cons                 │
│    ├─ Forum posts: Power tips, hidden features                 │
│    └─ "Is it worth it?" discussions                            │
│                                                                 │
│  ┌───────────────────────────────────────────────────────┐     │
│  │  ROLE 1: THE BUDGET ANALYST (The CFO)                │     │
│  │  ────────────────────────────────────────────────     │     │
│  │  Goal: Explain "How the Bill Works" without judgment  │     │
│  │                                                       │     │
│  │  Extracts:                                            │     │
│  │    • Cost drivers: "SSO requires Enterprise tier"    │     │
│  │    • One-time fees: "$2,000 implementation fee"      │     │
│  │    • Commitment terms: "Annual contract only"        │     │
│  │    • ROI threshold: "Worth it for teams of 20+"     │     │
│  │                                                       │     │
│  │  RULES:                                               │     │
│  │    ✓ Factual statements only                         │     │
│  │    ✗ NO words like "trap", "scam", "gotcha"          │     │
│  └───────────────────────────────────────────────────────┘     │
│                                                                 │
│  ┌───────────────────────────────────────────────────────┐     │
│  │  ROLE 2: THE USER ADVOCATE (Senior Engineer)         │     │
│  │  ────────────────────────────────────────────────     │     │
│  │  Goal: Capture tribal knowledge and vibe              │     │
│  │                                                       │     │
│  │  Extracts:                                            │     │
│  │    • Vibe: "Enterprise Grey", "Hacker Chic"          │     │
│  │    • Origin story: "Started as game dev tool"        │     │
│  │    • Ideal for: "Async-first remote teams"           │     │
│  │    • Avoid if: "Need offline access"                 │     │
│  │    • Power tip: "Use /collapse to hide gifs"         │     │
│  │    • Delighters: Specific features users rave about  │     │
│  │    • Frustrations: UX complaints (NOT pricing)       │     │
│  └───────────────────────────────────────────────────────┘     │
│                                                                 │
│  ┌───────────────────────────────────────────────────────┐     │
│  │  ROLE 3: THE HUMAN VERDICT                           │     │
│  │  ────────────────────────────────────────────────     │     │
│  │  Goal: 2-sentence "Coffee Shop Speak" summary         │     │
│  │                                                       │     │
│  │  Tone: Candid, Expert, Casual                        │     │
│  │  BANNED: "seamless", "empowers", "robust",           │     │
│  │          "game-changer", "intuitive"                 │     │
│  │                                                       │     │
│  │  Example:                                             │     │
│  │  "It's basically a glorified spreadsheet, but the    │     │
│  │   automation engine is so good you won't care.       │     │
│  │   Great for small teams, but gets messy at scale."   │     │
│  └───────────────────────────────────────────────────────┘     │
│                                                                 │
│  Output: review_context JSONB                                  │
│    Stored on items table (universal, not contextual)           │
│    Enables differentiation from commodity spec sheets          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Why This Matters:**
- Differentiation: Can't be scraped from feature lists
- SEO Value: Answers "is [tool] worth it" queries
- User Trust: Honest, opinionated guidance
- Content Moat: Tribal knowledge is time-intensive to replicate

### 5. V3.2: Parent/Child Relationship (Suite Bundling)

Handles tools sold as part of larger suites (Google Meet → Workspace).

```
┌─────────────────────────────────────────────────────────────────┐
│                  SUITE BUNDLING ARCHITECTURE                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Detection (Forensic Accountant in Phase 1):                   │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Criteria:                                             │    │
│  │    • Pricing pages say "Included in [Suite]"          │    │
│  │    • No standalone pricing page exists                │    │
│  │    • Only parent suite prices found                   │    │
│  │                                                       │    │
│  │  Known bundles:                                        │    │
│  │    • Google Meet/Calendar/Drive → Google Workspace    │    │
│  │    • Microsoft Teams/OneDrive → Microsoft 365         │    │
│  │                                                       │    │
│  │  Output:                                               │    │
│  │    is_standalone: false                                │    │
│  │    bundled_in: "Google Workspace"                      │    │
│  └────────────────────────────────────────────────────────┘    │
│                           │                                     │
│                           ▼                                     │
│  Persistence (Phase 3):                                        │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  1. Call: ensureParentSuite("Google Workspace")       │    │
│  │                                                       │    │
│  │  2. If suite doesn't exist, create stub:              │    │
│  │     {                                                  │    │
│  │       name: "Google Workspace",                        │    │
│  │       slug: "google-workspace",                        │    │
│  │       short_description: "Suite pricing placeholder",  │    │
│  │       specs: { taxonomy: { primary_function: "Suite" }}│   │
│  │     }                                                  │    │
│  │                                                       │    │
│  │  3. Return parent UUID                                 │    │
│  │                                                       │    │
│  │  4. Set parent_id on child item:                      │    │
│  │     items.parent_id = workspace_uuid                   │    │
│  └────────────────────────────────────────────────────────┘    │
│                           │                                     │
│                           ▼                                     │
│  Embedding Strategy (Phase 2):                                 │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Include suite context in embedding:                   │    │
│  │                                                       │    │
│  │  "Tool: Google Calendar                                │    │
│  │   Part of the Google Workspace suite                   │    │
│  │   Category: Scheduling                                 │    │
│  │   Features: Event scheduling, shared calendars..."     │    │
│  │                                                       │    │
│  │  Why: Enables search for "Google Workspace calendar"  │    │
│  │       without re-embedding on price changes            │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Benefits Enabled:**

1. **Single Source of Truth**
   - Update Google Workspace pricing once
   - All child tools (Meet, Calendar, Drive) automatically updated

2. **Ecosystem Navigation**
   ```sql
   SELECT name, slug FROM items WHERE parent_id = :workspace_id
   -- Returns: Calendar, Meet, Drive, Docs, Gmail
   ```

3. **Inherited Compliance**
   - SOC2, HIPAA compliance set on parent
   - All children inherit security certifications

4. **"Already Paid For" Calculator**
   ```typescript
   if (tool.parent_id && userStack.includes(tool.parent_id)) {
     return { price: 0, note: "Included in your Workspace subscription" };
   }
   ```

5. **Sibling Discovery**
   - "Also in Google Workspace" sidebar
   - Keeps users clicking through site (SEO + engagement)

### 6. Review Workflow

Draft-first workflow with human review gate.

```
┌─────────────────────────────────────────────────────────────────┐
│                    REVIEW WORKFLOW                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Hunt Complete                                                  │
│       │                                                         │
│       ▼                                                         │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────────┐  │
│  │   Draft     │────▶│   Review    │────▶│    Published    │  │
│  │  (created)  │     │  (in admin) │     │   (live site)   │  │
│  └─────────────┘     └─────────────┘     └─────────────────┘  │
│                            │                                    │
│                            │ or                                 │
│                            ▼                                    │
│                      ┌─────────────┐                           │
│                      │  Rejected   │                           │
│                      │  (archived) │                           │
│                      └─────────────┘                           │
│                                                                 │
│  Admin Actions:                                                 │
│    - Inline edit (score, pros, cons, summary)                  │
│    - Bulk approve (high confidence threshold)                  │
│    - Keyboard shortcuts (planned)                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5. Corrections Verification Flow

Weekly batch verification of user-submitted corrections.

```
┌─────────────────────────────────────────────────────────────────┐
│               CORRECTIONS VERIFICATION                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  User Submits Correction                                        │
│       │                                                         │
│       ▼                                                         │
│  ┌─────────────┐                                               │
│  │  Pending    │  (stored in corrections table)                │
│  └─────────────┘                                               │
│       │                                                         │
│       │  Weekly Check (verify-corrections script):              │
│       │    IF pending >= 50 OR oldest > 30 days                │
│       │    THEN run AI verification                            │
│       ▼                                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  AI Verification (per tool, per field type)             │   │
│  │    1. Search for current data (Serper)                  │   │
│  │    2. Compare claim vs search results (Gemini)          │   │
│  │    3. Mark as: confirmed / rejected / inconclusive      │   │
│  └─────────────────────────────────────────────────────────┘   │
│       │                                                         │
│       ▼                                                         │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────────┐  │
│  │  Confirmed  │     │  Rejected   │     │  Inconclusive   │  │
│  │ (apply fix) │     │  (discard)  │     │ (manual review) │  │
│  └─────────────┘     └─────────────┘     └─────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Scripts & CLI

### npm Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Start Astro dev server (port 4321) |
| `npm run build` | Production build |
| `npm run hunt -- [args]` | Main Hunter CLI |
| `npm run queue:worker` | Continuous queue processor |
| `npm run hunt:worker` | Alternative queue worker |
| `npm run import-ideas -- <csv>` | Import content ideas from CSV |
| `npm run queue-ideas` | Auto-queue high-priority ideas |
| `npm run verify-corrections` | Run AI correction verification |
| `npm run verify-affiliates` | Check affiliate link health |

### Hunter CLI Commands

```bash
# Direct hunt (bypass queue)
npm run hunt -- --tool="Notion"
npm run hunt -- --tool="Slack" --context="Best for Remote Teams"
npm run hunt -- --tool="Figma" --publish  # Skip draft, publish immediately

# Queue operations
npm run hunt -- --queue add --tool="Airtable" --priority 80
npm run hunt -- --queue process            # Process next item
npm run hunt -- --queue batch --priority 5 # Process multiple
npm run hunt -- --queue cleanup            # Release stale claims
npm run hunt -- --queue status             # View queue dashboard

# Strategy gatekeeper
npm run hunt -- --strategy import --file="keywords.csv"
npm run hunt -- --strategy ahrefs --file="ahrefs-export.csv"
npm run hunt -- --strategy classify --limit 50
npm run hunt -- --strategy analyze
npm run hunt -- --strategy approve --priority 5
npm run hunt -- --strategy thresholds --min-volume 100
npm run hunt -- --strategy competitors --file="pages.csv" --domain="competitor.com"
npm run hunt -- --strategy gaps
npm run hunt -- --strategy status
```

---

## Cron Jobs & Scheduled Tasks

### Vercel Crons (vercel.json)

| Schedule | Endpoint | Purpose |
|----------|----------|---------|
| `0 0 * * *` (daily midnight) | `/api/cron/cleanup-rate-limits` | Clean expired rate limit entries |

### Available Cron Endpoints

| Endpoint | Purpose | Trigger |
|----------|---------|---------|
| `/api/cron/hunt` | Process hunt queue (max 3 items) | Protected by CRON_SECRET |
| `/api/cron/discover-topics` | Discover new content topics | Manual or scheduled |
| `/api/cron/verify-corrections` | Batch verify user corrections | Manual or scheduled |
| `/api/cron/cleanup-rate-limits` | Clean rate limit table | Daily via Vercel cron |

### Local Worker (Alternative to Vercel Cron)

For VPS or always-on servers:

```bash
# Continuous processing (recommended for VPS)
npm run queue:worker -- --interval 6h --batch 5

# With topic discovery
npm run queue:worker -- --interval 6h --batch 5 --discover

# Single run (for external cron like GitHub Actions)
npm run queue:worker -- --once
```

**VPS Crontab Example:**
```cron
*/5 * * * *  cd /app && npm run hunt -- --queue process
0 * * * *    cd /app && npm run hunt -- --queue cleanup
```

---

## Notifications

### Discord Webhooks

Used for critical alerts and queue summaries.

| Alert Type | Trigger |
|------------|---------|
| `alertCritical` | API key failures, quota exceeded, authentication errors |
| `alertQueueSummary` | After batch processing (success/failure counts) |
| `alertApiError` | Service-specific errors (Serper, Gemini) |

### Slack Webhooks

Used for weekly summaries and correction verification results.

**Environment Variables:**
```bash
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

---

## Environment Variables

```bash
# Supabase (required)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# AI Services (required for hunting)
GEMINI_API_KEY=AIza...
SERPER_API_KEY=...

# Logos (optional, falls back to favicon)
PUBLIC_BRANDFETCH_CLIENT_ID=...

# Anti-spam (optional)
PUBLIC_TURNSTILE_SITE_KEY=...
TURNSTILE_SECRET_KEY=...

# Admin (required)
ADMIN_SECRET=your-secret-for-login

# Notifications (optional)
DISCORD_WEBHOOK_URL=...
SLACK_WEBHOOK_URL=...

# Vercel Cron (auto-set by Vercel)
CRON_SECRET=...

# Optional services
REPLICATE_API_TOKEN=...  # OG image generation
PUBLIC_SITE_URL=https://stackhunt.co
```

---

## Key Services

### Hunter Services (`src/lib/hunter/services/`)

| Service | Responsibility |
|---------|----------------|
| `SerperService` | Web search API with rate limiting |
| `GeminiService` | AI analysis with structured output, retry logic |
| `LogoService` | Logo fetching (Brandfetch → favicon fallback) |
| `QueueService` | Atomic claiming, heartbeat, status management |

### Database RPCs

| Function | Purpose |
|----------|---------|
| `claim_hunt_queue_item(p_worker_id)` | Atomically claim next pending item |
| `start_hunt(p_queue_id)` | Mark item as processing |
| `complete_hunt(...)` | Mark success with results |
| `fail_hunt(...)` | Mark failure with error |
| `heartbeat_hunt(p_queue_id)` | Update heartbeat timestamp |
| `release_stale_hunt_claims(p_stale_minutes)` | Release stale items |
| `analyze_content_ideas(p_limit)` | Calculate ROI, check duplicates |
| `bulk_approve_ideas(...)` | Move ideas to hunt queue |
| `import_ahrefs_keywords(...)` | Bulk import with filtering |
| `get_verification_stats()` | Get correction verification stats |

---

## Public Routes

| Route | Purpose |
|-------|---------|
| `/` | Homepage with featured contexts |
| `/best/[slug]` | Context page (e.g., /best/crm-for-startups) |
| `/tools` | All tools listing |
| `/tools/[slug]` | Tool detail page |
| `/categories` | All categories |
| `/categories/[slug]` | Category page |
| `/compare` | Comparison tool selection |
| `/compare/[...slugs]` | Side-by-side comparison |
| `/go/[slug]` | Affiliate redirect with click tracking |

## Admin Routes

| Route | Purpose |
|-------|---------|
| `/admin` | Dashboard with stats |
| `/admin/strategy` | Import & manage content ideas |
| `/admin/hunt-queue` | Monitor queue, view errors |
| `/admin/create` | Single tool hunt interface |
| `/admin/review` | Review drafts queue |
| `/admin/review/[id]` | Edit individual review |
| `/admin/corrections` | Manage user corrections |
| `/admin/affiliate-links` | Manage affiliate offers |

---

## Migration History

1. `001_foundation.sql` - Core tables (tools, contexts, reviews, categories)
2. `002_affiliate_audit_view.sql` - Affiliate offer views
3. `003_content_pipeline.sql` - Initial queue system
4. `004_knowledge_graph.sql` - Multi-dimensional categories
5. `005_prompts.sql` - Editable prompts
6. `006_review_sources.sql` - Source tracking
7. `007_security.sql` - Admin sessions, rate limiting
8. `008_editorial_brain.sql` - Editorial guidelines
9. `009_og_images.sql` - OG image generation
10. `010_strategic_architecture.sql` - Hunt queue, market state, click tracking
11. `011_intelligence_engine.sql` - Content ideas, import batches
12. `012_keyword_intelligence.sql` - Ahrefs data, keyword types, performance
13. `013_affiliate_network_tiers.sql` - Network tier classification
14. `014_category_expansion.sql` - Category pillar field
15. `014_corrections_ai_verification.sql` - AI verification for corrections
16. `015_content_ideas_format.sql` - Source format field
17. `015_hunt_queue.sql` - Queue enhancements
18. `016_expand_target_audiences.sql` - More audience types
19. `017_security_hardening.sql` - Security improvements

---

## Future-Ready Infrastructure

The following features have database tables and basic infrastructure but are not yet fully integrated:

- **Price Monitoring** - `market_state`, `price_history` tables ready
- **Affiliate Analytics** - `click_events` table ready, tracking partial
- **Semantic Search** - pgvector embeddings stored, `match_tools()` RPC exists
- **Keyword Performance** - `keyword_performance` table ready for GSC/Ahrefs data
- **Competitor Gap Analysis** - `competitors`, `competitor_pages` tables populated via CLI
