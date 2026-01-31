# StackHunt Quick Context

Use this as context for new Claude conversations about StackHunt.

---

## What is StackHunt?

AI-powered programmatic SEO platform that:
1. Researches SaaS tools via web search (Serper API)
2. Extracts structured data via AI (Gemini 2.0 Flash)
3. Generates contextual reviews ("Best X for Y")
4. Publishes to Astro static site

**Goal:** Build affiliate revenue through high-quality, differentiated content (tribal knowledge, not just spec sheets).

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Astro 5 + React (Islands) + Tailwind |
| Database | Supabase (Postgres + pgvector) |
| AI | Gemini 2.0 Flash |
| Search | Serper API |
| Hosting | Vercel |

---

## Key Directories

```
src/lib/hunter/        # 3-phase ingestion pipeline
  ├── orchestrator.ts  # Main entry point
  ├── phases/          # research.ts, analysis.ts, persistence.ts
  ├── services/        # serper.ts, gemini.ts, queue.ts, prompts.ts
  └── types.ts         # HunterContext, HunterResult, etc.

src/pages/
  ├── tool/[slug].astro    # Tool detail pages
  ├── best/[slug].astro    # Context pages ("Best CRM for Startups")
  └── compare/[...].astro  # Comparison pages

scripts/
  ├── hunter.ts        # CLI for hunting tools
  └── queue-worker.ts  # Continuous queue processor
```

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `items` | Tools/gear with specs, Knowledge Card, embedding |
| `contexts` | Use-case contexts ("Best X for Y") |
| `reviews` | Contextual analysis linking item ↔ context |
| `categories` | Knowledge Graph (function/audience/platform) |
| `hunt_queue` | Job queue for batch processing |

---

## Hunter Pipeline

```
Input: Tool name + optional context
  ↓
Phase 1: RESEARCH
  - 12 parallel Serper searches
  - Deep scrape pricing pages via Jina.ai
  - Output: categorized snippets + sources
  ↓
Phase 2: ANALYSIS
  - Pass 1: Knowledge Card (structured facts via Gemini)
  - Pass 2: Synthesis (score, pros/cons, tribal knowledge)
  - Generate embedding, fetch logo
  ↓
Phase 3: PERSISTENCE
  - Dedupe check
  - Upsert item, context, review
  - Link categories
```

---

## Data Extraction Roles

The AI wears 3 hats when analyzing:

1. **Budget Analyst (CFO)**: Extract cost drivers, hidden fees, commitment terms
   - Output: `reviewContext.budgetAnalyst`

2. **User Advocate (Senior Engineer)**: Extract vibe, tribal knowledge, power tips
   - Output: `reviewContext.userAdvocate`

3. **Human Verdict**: 2-sentence summary in "Coffee Shop Speak"
   - Output: `reviewContext.humanVerdict`

---

## Common Commands

```bash
# Development
npm run dev              # Astro dev server (port 4321)
npm run build            # Production build
npm run typecheck        # TypeScript check

# Hunting
npm run hunt -- --tool="Notion"                    # Hunt single tool
npm run hunt -- --tool="Slack" --context="Best for Remote Teams"
npm run hunt -- --queue process                    # Process next queue item
npm run queue:worker -- --batch 5                  # Process 5 items

# Strategy (keyword import)
npm run hunt -- --strategy ahrefs --file="export.csv"
npm run hunt -- --strategy classify --limit 50
npm run hunt -- --strategy approve --priority 5
```

---

## Current Priorities (Roadmap V1)

See `.claude/docs/ROADMAP_V1.md` for full details.

1. **Institutional Trust**: Methodology page, verified badges, Organization schema
2. **Split-Brain Intelligence**: Display budget analyst + user advocate data on pages
3. **Freshness**: Stale warnings, community verification widget
4. **pSEO**: Internal linking, suite navigation
5. **Confidence Gating**: Noindex low-quality pages

---

## Environment Variables

Required:
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`, `SERPER_API_KEY`
- `ADMIN_SECRET`

Optional:
- `DISCORD_WEBHOOK_URL`, `SLACK_WEBHOOK_URL`
- `PUBLIC_BRANDFETCH_CLIENT_ID`

---

## Related Docs

- `PRODUCT_SUMMARY.md` - Full architecture documentation
- `scripts/README.md` - CLI usage guide
- `.claude/docs/ROADMAP_V1.md` - Implementation priorities
- `.claude/docs/HUNTER_EXTENSION.md` - How to extend the ingestion layer
