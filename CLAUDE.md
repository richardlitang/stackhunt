# StackHunt

AI-powered programmatic SEO platform. Researches tools via web search, generates contextual reviews using Gemini, publishes to Astro site.

## Quick Reference

| Doc | Location |
|-----|----------|
| Full architecture | `PRODUCT_SUMMARY.md` |
| Hunter CLI usage | `scripts/README.md` |
| DB schema | `supabase/migrations/001_foundation.sql` |
| Queue system | `supabase/migrations/010_strategic_architecture.sql` |
| Type definitions | `src/types/database.ts` |
| **Roadmap V1** | `.claude/docs/ROADMAP_V1.md` |
| **Hunter Extension** | `.claude/docs/HUNTER_EXTENSION.md` |
| **Quick Context** | `.claude/docs/QUICK_CONTEXT.md` |
| **Supabase Project ID** | `.claude/SUPABASE_PROJECT_ID.md` |
| **Legal Compliance** | `.claude/docs/LEGAL_COMPLIANCE.md` |

## Tech Stack

Astro 5 (Islands) | React 18 | Tailwind | Supabase (Postgres + pgvector) | Gemini 2.0 Flash | Serper API | Vercel

**Supabase Project ID:** `vhelpqzbtzwiddoebnyy` (see `.claude/SUPABASE_PROJECT_ID.md`)

## Project Structure

```
src/
├── components/     # *.astro (static) | *.tsx (React islands)
├── layouts/        # BaseLayout, AdminLayout
├── lib/
│   ├── hunter/     # 3-phase pipeline (research→analysis→persistence)
│   │   ├── orchestrator.ts    # Main coordinator
│   │   ├── phases/            # Research, Analysis, Persistence
│   │   └── services/          # Gemini, Serper, Logo, Queue
│   ├── supabase.ts            # DB client
│   └── auth.ts                # Admin auth
├── pages/
│   ├── api/cron/   # Vercel cron endpoints
│   ├── admin/      # Dashboard pages
│   ├── best/       # Context pages (/best/[slug])
│   ├── tool/       # Tool pages (/tool/[slug])
│   └── compare/    # Comparison pages
└── types/          # TypeScript definitions

scripts/            # CLI tools (hunter.ts, queue-worker.ts, etc.)
supabase/migrations/ # 21 SQL migration files
```

## Commands

```bash
npm run dev          # Astro dev (port 4321)
npm run build        # Production build
npm run hunt -- [args]  # Hunter CLI (see scripts/README.md)
npm run queue:worker    # Continuous queue processor
npm run types:db        # Regenerate Supabase types -> src/types/supabase.ts
npm run typecheck    # TypeScript check
npm run test         # Vitest tests
```

## Database Core Tables

| Table | Purpose |
|-------|---------|
| tools | Software products with metadata, Knowledge Card |
| contexts | Use-case contexts ("Best X for Y") |
| reviews | Contextual analysis with score, pros, cons |
| categories | Taxonomy (function/audience/platform) |
| hunt_queue | Job queue with priority, status, heartbeat |
| content_ideas | Strategy staging (pre-hunt ROI gating) |

## Hunter Pipeline (3-Phase)

1. **Research** - Serper search (12 parallel queries + deep scrape) → Knowledge Card extraction
2. **Analysis** - Gemini (two-pass: facts → synthesis) → Score, Pros/Cons, Tribal Knowledge
3. **Persistence** - Upsert tool → Upsert context → Create review (draft)

The 12 queries cover: reviews, pricing, alternatives, company info, technical/API, hidden costs, Reddit opinions, power tips, and "is it worth it" discussions.

## Patterns & Conventions

### Prefer
- Read files before modifying (understand existing patterns)
- Use existing components in `src/components/`
- Draft-first workflow (reviews created as drafts, human approves)
- Atomic queue operations via Supabase RPCs
- Error classification in hunter (`src/lib/hunter/errors.ts`)

### Avoid
- Skipping the strategy gatekeeper (ROI scoring) for bulk content
- Direct publish without review gate
- Hardcoding IDs in migrations (use references)
- Adding dependencies without checking `package.json` first

## Backend/Frontend Best Practices

### Database Query Limits (Security & Performance)

**ALWAYS enforce limits at the backend, not just frontend.**

✅ **Good:**
```typescript
// Backend: Limit at source
export async function getItemContexts(itemId: string, limit = 50) {
  return await supabase
    .from('reviews')
    .select('...')
    .limit(limit);  // ✅ Backend protection
}

// Frontend: Display subset if needed
const contexts = await getItemContexts(tool.id);
const displayed = contexts.slice(0, 3);
```

❌ **Bad:**
```typescript
// Backend: No limit (fetches everything!)
export async function getItemContexts(itemId: string) {
  return await supabase
    .from('reviews')
    .select('...');  // ⚠️ Could fetch 1000+ rows
}

// Frontend: Slice wastes bandwidth/memory
const contexts = await getItemContexts(tool.id);
const displayed = contexts.slice(0, 3);  // Too late!
```

### Query Pattern Rules

1. **All Supabase queries MUST have `.limit()`** unless fetching a single item
2. **Use parameters for configurable limits** (e.g., `limit = 50`)
3. **Nested queries need `foreignTable` limits:**
   ```typescript
   .limit(10, { foreignTable: 'reviews' })
   ```
4. **Frontend `.slice()` is OK** for display logic, but backend must limit first
5. **Default limits should be conservative** (10-50 rows)

### When to Use What

| Scenario | Backend | Frontend |
|----------|---------|----------|
| Fetch all contexts | `.limit(50)` | Display all |
| Show top 3 contexts | `.limit(50)` | `.slice(0, 3)` |
| Paginated lists | `.limit(20)` per page | Show current page |
| Single tool | `.maybeSingle()` | Display it |
| User input search | `.limit(10)` | Display all results |

### Security Checklist

- [ ] All public queries use `supabase` client (RLS enforced)
- [ ] Admin operations use `supabaseAdmin` (service role)
- [ ] Every list query has `.limit()`
- [ ] Nested queries use `foreignTable` limits
- [ ] User input is sanitized (Supabase client handles this)
- [ ] No raw SQL with user input

### Supabase MCP
Use `mcp__supabase__*` tools for database operations:
- `execute_sql` for queries
- `apply_migration` for DDL changes
- `list_tables` to explore schema
- `get_advisors` after DDL to check for security issues

### Supabase Types Sync
- `src/types/supabase.ts` is generated (do not hand-edit).
- After any DB migration or RPC change, run `npm run types:db`.
- Requires `SUPABASE_ACCESS_TOKEN` to be set (or `supabase login`).

### Testing Changes
After code changes:
1. `npm run typecheck` - Type errors
2. `npm run build` - Build succeeds
3. `npm run test` - Tests pass

## Environment Variables

Required: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `SERPER_API_KEY`, `ADMIN_SECRET`

Optional: `DISCORD_WEBHOOK_URL`, `SLACK_WEBHOOK_URL`, `REPLICATE_API_TOKEN`, `PUBLIC_BRANDFETCH_CLIENT_ID`

## Common Tasks

### Add a new tool manually
```bash
npm run hunt -- --tool="ToolName" --context="Best for X"
```

### Process queue
```bash
npm run queue:worker -- --once           # Single item
npm run queue:worker -- --batch 5        # 5 items
```

### Import keywords (Strategy Gatekeeper)
```bash
npm run hunt -- --strategy ahrefs --file="export.csv"
npm run hunt -- --strategy classify --limit 50
npm run hunt -- --strategy analyze
npm run hunt -- --strategy approve --priority 5
```

### Add migration
Use `mcp__supabase__apply_migration` with snake_case name and SQL query.
