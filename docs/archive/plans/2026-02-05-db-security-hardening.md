# Feature: DB Security Hardening

Last verified: 2026-03-05

## Goal
Eliminate high‑risk security lints (SECURITY DEFINER views, mutable search_path) and reduce exposure in public schema while preserving app behavior.

## Architecture Overview
- Recreate flagged views as SECURITY INVOKER (default) to respect caller RLS.
- Set explicit `search_path` on public functions to prevent search path injection.
- Leave extensions in `public` for now unless you want a heavier migration.

## Tech Stack
- Supabase Postgres migrations
- Supabase MCP (apply_migration + execute_sql)

## Tasks

### Task 1: Inventory flagged views + functions
**Files:** none
**Action:** Query view definitions and function signatures for targeted changes.

**Verify:**
```bash
# Use Supabase MCP queries
```

**Commit:** none

---

### Task 2: Recreate SECURITY DEFINER views as SECURITY INVOKER
**Files:**
- Add: `supabase/migrations/20260205123000_security_invoker_views.sql`

**Action:**
- `DROP VIEW` and `CREATE VIEW` with original definitions.
- Ensure `SECURITY INVOKER` (default) or `ALTER VIEW ... SET (security_invoker=true)` if supported.

**Verify:**
```bash
# Use Supabase MCP to query pg_class/pg_views for security_invoker
```

**Commit:** `fix(db): remove security definer views`

---

### Task 3: Set explicit search_path on public functions
**Files:**
- Add: `supabase/migrations/20260205124500_function_search_path.sql`

**Action:**
- `ALTER FUNCTION ... SET search_path = public, pg_catalog;` for flagged functions.

**Verify:**
```bash
# Use Supabase MCP to check pg_proc.proconfig for search_path
```

**Commit:** `fix(db): set search_path on functions`

---

### Task 4: Re-run security advisor to confirm lints reduced
**Files:** none

**Verify:**
```bash
# Use Supabase MCP get_advisors(security)
```

**Commit:** none

## Notes
- If any view is admin‑only by design, we can move it to a private schema or keep as security definer with explicit rationale.
- Extensions in public are a warning; moving them is a bigger migration and not required immediately.
