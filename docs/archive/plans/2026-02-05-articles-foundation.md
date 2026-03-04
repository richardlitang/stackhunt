# Feature: Articles Foundation + Insight Capture

Last verified: 2026-03-05

## Goal
Create a clean, scalable foundation for `/articles` without polluting `/tool` data, while capturing reusable insight points during hunts for future semi-auto articles.

## Architecture Overview
Add two new tables: `articles` (draft/published longform content) and `article_insights` (small, reusable insight units tied to tools/contexts). Capture insights during hunts from existing analysis outputs and store them separately. Add minimal public `/articles` pages and a basic admin API to create drafts.

## Tech Stack
- Astro pages (`src/pages/articles/*`)
- Supabase (new tables + RLS policies)
- Hunter persistence (insight capture)
- Admin API route

## Tasks

### Task 1: Add DB tables for articles + insights
**Files:**
- Add: `supabase/migrations/20260205120000_articles_foundation.sql`

**Action:** Create tables, indexes, RLS policies.

**SQL (migration):**
```sql
create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  summary_markdown text,
  content_markdown text,
  outline jsonb,
  tags text[] not null default '{}',
  source_tool_ids uuid[] not null default '{}',
  source_context_ids uuid[] not null default '{}',
  source_data jsonb,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.article_insights (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references public.items(id) on delete set null,
  context_id uuid references public.contexts(id) on delete set null,
  insight_type text not null,
  insight text not null,
  source_url text,
  source_type text check (source_type in ('official','editorial','community')),
  claim_type text check (claim_type in ('fact','opinion')),
  tags text[] not null default '{}',
  confidence numeric,
  created_at timestamptz not null default now()
);

create index if not exists article_insights_item_id_idx on public.article_insights(item_id);
create index if not exists article_insights_context_id_idx on public.article_insights(context_id);
create index if not exists article_insights_type_idx on public.article_insights(insight_type);

alter table public.articles enable row level security;
alter table public.article_insights enable row level security;

create policy "public_read_articles" on public.articles
  for select
  using (status = 'published');

create policy "public_read_article_insights" on public.article_insights
  for select
  using (true);
```

**Verify:**
```bash
# Apply via Supabase MCP (not shell)
```

**Commit:** `feat(db): add articles and article_insights tables`

---

### Task 2: Update types for new tables
**Files:**
- Modify: `src/types/database.ts`

**Action:** Add `articles` and `article_insights` to the Database type with Insert/Update/Row definitions.

**Verify:**
```bash
npm run typecheck
```

**Commit:** `chore(types): add article tables`

---

### Task 3: Capture insights during hunts
**Files:**
- Modify: `src/lib/hunter/phases/persistence.ts`

**Action:** After analysis succeeds, insert a small set of `article_insights` derived from:
- `analysis.vetoLogic`
- `analysis.realityChecks`
- `analysis.dealbreakers`
- `analysis.standoutFeatures`
- `analysis.verdict`
Each entry includes `insight_type`, `insight`, and `source_url` if present.

**Verify:**
```bash
npm run typecheck
```

**Commit:** `feat(hunter): store article insights per hunt`

---

### Task 4: Add minimal /articles pages
**Files:**
- Add: `src/pages/articles/index.astro`
- Add: `src/pages/articles/[slug].astro`

**Action:**
- `/articles` lists published articles (title + summary) with a limit.
- `/articles/[slug]` renders article content if published.
- Use `supabase` public client with `.limit()`.

**Verify:**
```bash
npm run typecheck
```

**Commit:** `feat(articles): add public article pages`

---

### Task 5: Add admin API to create draft articles
**Files:**
- Add: `src/pages/api/admin/articles.ts`

**Action:**
- POST creates draft article (title, slug, tags, optional tool/context refs)
- Uses `getAdminClient`
- Basic validation, returns created row

**Verify:**
```bash
npm run typecheck
```

**Commit:** `feat(api): add admin article create endpoint`

---

## Checkpoints
1. Review plan
2. After Task 2 (types updated)
3. After Task 3 (insight capture)
4. After Task 5 (API ready)

## Notes
- RLS: public read only for published articles; insights are readable for now (can tighten later).
- Keep all article data separate from tool data.
