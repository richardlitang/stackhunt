# StackHunt (Agent Operating Guide)

AI-powered programmatic SEO platform. StackHunt researches software tools via web search, generates contextual reviews using Gemini, and publishes buyer-oriented content to an Astro site.

This file is the repo-level operating contract for AI coding agents. Follow it as the source of truth for architecture, code quality, maintainability, and scalability.

## Core Objective

Optimize for the following, in this order:

1. Correctness
2. Trustworthiness of content and data
3. Maintainability
4. Simplicity
5. Performance
6. Speed of implementation

Prefer boring, explicit, testable code over clever code.

## Quick Reference

| Doc                      | Location                                             |
| ------------------------ | ---------------------------------------------------- |
| Full architecture        | `PRODUCT_SUMMARY.md`                                 |
| Hunter CLI usage         | `scripts/README.md`                                  |
| DB schema                | `supabase/migrations/001_foundation.sql`             |
| Queue system             | `supabase/migrations/010_strategic_architecture.sql` |
| Domain types             | `src/types/database.ts`                              |
| Generated Supabase types | `src/types/supabase.ts`                              |
| Docs knowledge index     | `docs/index.md`                                      |
| Roadmap V1               | `.claude/docs/ROADMAP_V1.md`                         |
| Hunter Extension         | `.claude/docs/HUNTER_EXTENSION.md`                   |
| Quick Context            | `.claude/docs/QUICK_CONTEXT.md`                      |
| Supabase Project ID      | `.claude/SUPABASE_PROJECT_ID.md`                     |
| Legal Compliance         | `.claude/docs/LEGAL_COMPLIANCE.md`                   |
| Durable decisions        | `docs/DECISIONS.md`                                  |
| Test quickstart          | `docs/TESTING_QUICKSTART.md`                         |

**Supabase Project ID:** `vhelpqzbtzwiddoebnyy`

## Tech Stack

Astro 5 (Islands) | React 18 | Tailwind | Supabase (Postgres + pgvector) | Gemini 2.0 Flash | Serper API | Vercel

## Current Hotspots (Do Not Worsen)

These files are currently large and should not grow without extraction:

- `src/pages/tool/[slug].astro` (~3381 lines)
- `src/pages/compare/[...slugs].astro` (~1352 lines)
- `src/pages/best/[slug].astro` (~981 lines)
- `src/lib/hunter/phases/persistence.ts` (~4452 lines)
- `src/lib/supabase.ts` (~701 lines)

When touching these files, leave them better than found.

## Non-Negotiable Rules

- Do not break published behavior unless the task explicitly requires it.
- Do not bypass trust, review, or publish gates.
- Do not duplicate business rules across pages, components, scripts, and APIs.
- Do not put core business logic in page templates when it can live in `src/lib/`.
- Do not put data fetching and policy logic inside presentational components.
- Do not introduce new dependencies unless explicitly requested or clearly justified.
- Do not hand-edit generated files.
- Do not edit or move `.claude/` artifacts unless explicitly requested.
- If tests, typecheck, or build are not run, say so explicitly.
- For all rewriting in this repository, do not use em dashes. Use commas, periods, or parentheses instead.
- When remaining context is 30% or lower, run `/compact` before continuing substantial work.

## Agent-First Harness Rules

Apply these rules to keep agent throughput high without quality drift.

- Keep `AGENTS.md` short and navigational, not encyclopedic. Put durable detail in versioned docs.
- Treat repository artifacts as source of truth. If guidance lives in chat or memory, move it into repo docs.
- Use progressive disclosure for context. Start from index docs, then follow links to specific domains.
- Treat plans as first-class artifacts. Keep active/completed execution plans and technical debt logs in-repo.
- Enforce architecture and style mechanically through linters, structural tests, and CI, not prompt-only reminders.
- Encode recurring review feedback into rules, checks, or scripts so the same issue is auto-prevented next time.
- Prefer strict boundaries with local implementation freedom. Enforce dependency direction, not stylistic micromanagement.
- Keep PRs small and short-lived. Favor fast correction loops over long-lived blocked branches when risk is controlled.
- Run recurring cleanup passes for drift and duplication. Open small targeted fix PRs instead of periodic large rewrites.

## Project Structure

```text
src/
├── components/       # UI only, Astro or React islands
├── layouts/          # Page shells only
├── lib/
│   ├── hunter/       # Pipeline logic (research → analysis → persistence)
│   ├── supabase.ts   # DB clients + query helpers
│   └── auth.ts       # Auth helpers
├── pages/
│   ├── api/cron/     # Cron/API entry points
│   ├── admin/        # Admin pages
│   ├── best/         # Context pages
│   ├── tool/         # Tool pages
│   └── compare/      # Comparison pages
└── types/            # TypeScript types

scripts/              # CLI tools
supabase/migrations/  # SQL migrations
```

## Architecture Principles

### 1) Keep Layer Boundaries Clear

- Pages: route params, request context, composition, SEO wiring.
- Components: rendering and minimal view behavior.
- `src/lib`: domain logic, policy, scoring, validation, transformations.
- Services: Supabase, Gemini, Serper, scraping, queue mechanics.
- Scripts/workers: operational entry points, not canonical business rule owners.

If logic is reused or non-trivial, it belongs in `src/lib`, not in a route template.

### 2) One Canonical Home per Rule

Each important rule has one owner module.

Examples:

- Publish gate in one gate module.
- Index/noindex policy in one policy module.
- Freshness policy in one freshness module.
- Query shape in one data access function.

Do not re-implement the same policy in multiple files.

### 3) Keep Routes Thin

Astro route files should orchestrate and render, not become policy engines.

For complex pages, use dedicated builders:

- `buildToolPageViewModel(...)`
- `buildComparePageViewModel(...)`
- `buildContextPageViewModel(...)`

### 4) Reduce Complexity Early

Avoid adding one more conditional to overloaded files.

If a touched file crosses a trigger, extract before adding logic:

- Route file > 1200 lines.
- Domain/service file > 800 lines.
- More than 12 top-level derived booleans in one route.
- More than 3 policy decisions inlined in one route.

When triggers fire, extract at least one cohesive helper/module in the same change.

### 5) No Silent Policy Drift

- Prefer one `policyResult` object over mutable boolean chains.
- Avoid reassignment-based precedence (`x = x || ...` repeatedly).
- Encode precedence once in a named policy function and unit test it.

## Repo Invariants

- Draft-first workflow is mandatory for generated reviews.
- Human approval is required before publish.
- Queue operations must be atomic and idempotent.
- Public-facing code must not use service-role credentials.
- Generated Supabase types must be regenerated after schema changes.
- Brandfetch assets must only be hotlinked, never downloaded, cached, or proxied.
- External claims must remain traceable to sources.
- Trust and review gates are product features, not optional implementation details.

## TypeScript Standards

- Prefer strict explicit types.
- Avoid `any`. If unavoidable, isolate and narrow immediately.
- Avoid `as any` unless no practical alternative exists.
- Avoid non-null assertions unless invariant is guaranteed.
- Add explicit return types for exported functions.
- Prefer discriminated unions over boolean soup.

### Supabase Types Rule

- `src/types/supabase.ts` is generated, never hand-edit it.
- `src/types/database.ts` is for domain-level types, not a fallback for `Database = any`.
- New Supabase client typing should prefer `@/types/supabase`.
- Do not introduce new code that depends on `Database = any`.

## Database Rules

### Query Safety and Performance

- Every list query must include `.limit(...)` unless the data set is intentionally bounded.
- If intentionally unbounded, add a one-line comment stating why.
- Add explicit `.order(...)` whenever order matters.
- Never rely on frontend slicing as primary protection.
- Use foreign table limits where supported.
- Avoid `select('*')` on hot paths.
- Prefer dedicated data access functions for repeated query shapes.

### Security

- Public queries use the RLS-safe client.
- Admin operations use `supabaseAdmin`.
- No raw SQL with unsanitized user input.
- No service-role use in browser-exposed code.
- After DDL changes, run Supabase advisors.

### Migrations and Types

- Migrations are forward-only, do not rewrite historical migrations.
- Add indexes when new query patterns are introduced.
- After schema or RPC changes, run `npm run types:db`.

## Frontend Rules

### General

- Default to server-rendered Astro.
- Use React islands only when interactivity is required.
- Keep components presentational by default.
- Do not fetch primary page data in leaf components without strong reason.
- When a Tailwind-heavy markup block is repeated 2 or more times across route files, extract it into a reusable component in `src/components/` before adding more variants.
- Prefer section-level reuse first (for example shared cards, checklists, evidence panels), then smaller primitives only when reuse is proven.

### Client Scripts

- Avoid inline scripts except for small isolated behavior.
- Do not use TypeScript syntax inside browser-delivered inline scripts.
- If behavior grows beyond a small utility, move it into a dedicated client module/component.

### UX Bias

Prefer:

- Fast comprehension.
- Clear decision support.
- Trust signals that help the reader.

Avoid:

- Excessive meta-UI.
- Overexposing internal editorial machinery.
- Clutter above the fold.

## Hunter Pipeline Standards

Three phases:

1. Research
2. Analysis
3. Persistence

Rules:

- Keep strict phase boundaries.
- Keep phase outputs serializable and inspectable.
- Avoid hidden coupling between phases.
- Preserve source traceability from research to final artifacts.
- Keep queue/worker operations retry-safe and observable.

## Error Handling and Observability

- Classify expected operational failures.
- Do not swallow errors silently.
- Include context in logs when relevant:
  - tool slug / tool ID
  - context ID
  - review ID
  - queue job ID
  - phase name
  - retry count
  - duration
- Never log secrets or tokens.

## Testing and Verification

Run after changes unless environment prevents it:

1. `npm run typecheck`
2. `npm run build`
3. `npm run test`

Before push:

- `npm run qa:prepush` (required)
- Do not push if `qa:prepush` fails.
- `prepare` auto-installs git hooks on dependency install, and running `npm run hooks:install` remains available for manual re-install.
- `qa:prepush` enforces:
  - `qa:rpc`
  - `qa:tool-page-imports` (fails on missing imports or unbound calls for `build/derive/apply/get/is/has ToolPage*` helpers in `src/pages/tool/[slug].astro`)
  - `qa:tool-page-call-shapes` (fails on malformed `buildToolPage*FromRoute({ buildToolPage*... })` wrapper calls in `src/pages/tool/[slug].astro`)
  - `qa:tool-page-tdz` (fails when `buildToolPagePrepReviewEvidenceStateFromDecisionContext(...)` receives late-bound runtime identifiers in `reviewEvidence.evidenceContext`)
  - `qa:tool-page-map` (fails if `docs/TOOL_PAGE_ORCHESTRATION_MAP.md` is stale versus route composition)
  - `format:check:changed` (Prettier check for files changed in the branch, working tree, or index)
  - `lint:strict` (`eslint src --max-warnings=0`)
  - `typecheck`
  - `build`
  - rendered tool-page QA sample

### Critical Modules Require Regression Tests

Any change in these areas must include or update tests:

- Trust/evidence logic
- Publish/review/index gates
- Scoring and confidence policy
- Queue claim/retry/idempotency behavior
- View-model builders for complex pages

## Refactoring Policy

Refactor when it materially improves:

- Correctness
- Maintainability
- Testability
- Architecture clarity
- Known hot-path performance

Do not do broad drive-by rewrites. Prefer targeted extraction with behavior parity.

If a file is clearly overloaded, extraction is preferred over adding more branching.

## Documentation Policy

Use `docs/DECISIONS.md` for durable decisions when:

- Introducing a new architectural pattern.
- Changing canonical workflows.
- Changing queue semantics.
- Changing trust/review/publish policy.
- Adding a major integration boundary.

Keep docs concise and durable.

## MCP and External Service Notes

- Prefer `mcp__supabase__*` tools for DB operations when available (`execute_sql`, `apply_migration`, `list_tables`, `get_advisors`).
- Verify MCP setup when needed with `codex mcp list`.
- Brandfetch: hotlink only via `https://cdn.brandfetch.io/{domain}?c={clientId}`.

## Environment Variables

Required:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`
- `SERPER_API_KEY`
- `ADMIN_SECRET`

Optional:

- `DISCORD_WEBHOOK_URL`
- `SLACK_WEBHOOK_URL`
- `REPLICATE_API_TOKEN`
- `PUBLIC_BRANDFETCH_CLIENT_ID`

CLI scripts load `.env` via `dotenv`. Check `.env` before assuming missing keys.

## Common Commands

```bash
npm run dev
npm run build
npm run hunt -- [args]
npm run queue:worker
npm run queue:worker -- --once
npm run queue:worker -- --batch 5
npm run types:db
npm run typecheck
npm run test
npm run qa:prepush
```

Add a tool manually:

```bash
npm run hunt -- --tool="ToolName" --context="Best for X"
```

## Autonomy Mode

Default behavior in personal projects is autonomous execution.

- Execute tasks end-to-end without waiting for step-by-step confirmation.
- Continue through implementation, verification, and cleanup by default.
- Do not pause after each small extraction or commit.
- On a user `go` instruction, execute multiple consecutive work slices in the same turn before replying.
- Minimum autonomous batch target per `go` turn:
  - 10 logical code slices
- If the user explicitly requests a larger batch (for example `go x20`), increase the same-turn target up to 20 slices when checks remain green.
- Intermediate updates should be brief and only when they materially affect direction, risk, or blocker status.
- Stop only for critical blockers:
  - missing or conflicting requirements that materially change behavior
  - destructive actions not explicitly requested
  - security/privacy risk
  - permissions/escalation required
  - reproducible failing checks that cannot be resolved safely
  - unexpected repo state that risks overwriting unrelated work

### Turn Boundary Reality

The coding interface is turn-based.

- Agent rules cannot force infinite continuation across turns without any assistant reply.
- Therefore, the agent should maximize useful autonomous work within each turn, then send one concise checkpoint.
- That checkpoint should include completed slices, verification status, push status, and the next slice already queued.
- Do not wait for user confirmation unless a critical blocker from the list above is hit.

### Batch Trigger Keyword

Use `go` as the default autonomy trigger in this repository.

- When the user says `go`, execute a 10-slice autonomous batch.
- If the user asks for a larger batch, run up to 20 slices in the turn.
- A slice is one logical, shippable unit, for example extract one cohesive policy module plus route wiring plus tests.
- For each slice: implement, verify (`typecheck`, relevant tests, build as needed), commit, and push.
- After 10 slices, send one concise checkpoint and immediately queue the next batch unless a critical blocker is hit.

### Production Push Safety

If a push could affect production behavior, pause and ask before pushing.

- Do not auto-push risky changes to `main`/production branches without explicit confirmation.
- For low-risk or clearly requested pushes, proceed normally.
- When unsure about production risk, ask.

## Definition of Done

A change is done when all are true:

- Behavior is correct and understandable.
- Architectural boundaries are preserved or improved.
- Trust and query-safety constraints are preserved.
- Types are sound for touched code.
- Verification commands were run, or explicitly skipped with reason.
- No unnecessary complexity was added.
- Durable architectural decisions are documented when needed.

## Final Bias

When in doubt, choose the option that makes the system easier to reason about six months from now.
