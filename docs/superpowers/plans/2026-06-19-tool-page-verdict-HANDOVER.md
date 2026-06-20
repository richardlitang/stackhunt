# Tool Page Verdict Redesign — Handover

_Last updated: 2026-06-20. Authoritative status doc for the tool-page redesign._

## TL;DR

The **foundation** is merged to `main` and pushed (`origin/main` @ `6e9cf24`). The
**redesign UI itself is not built yet** — only the verdict resolver and the pipeline
claim-quality fix landed. Continue on **flat `main`** (see "Structure" below).

## Plan & source of truth

- Plan (task breakdown, global constraints, approved hero composition):
  `docs/superpowers/plans/2026-06-19-tool-page-verdict-redesign.md`
- ⚠️ The plan's per-task **file paths were written for a NESTED `src/lib/tool-page/`
  layout that never reached main**. Main is FLAT. Remap paths when implementing
  (e.g. plan says `src/lib/tool-page/decision/tool-verdict.ts`; on main it is
  `src/lib/tool-page/tool-verdict.ts`). The plan's _intent and global constraints
  still hold_ — only paths differ.
- The plan's **Task 1.1/1.3 gitignore + `data/` backfill is MOOT on main** — that bug
  only existed in the nested layout. Main's `src/lib/tool-page/data.ts` is flat and
  tracked. Do not recreate a `src/lib/tool-page/data/` directory.

## Structure (IMPORTANT)

`main` uses a **FLAT** `src/lib/tool-page/` (files top-level, e.g. `data.ts`,
`verdict-content.ts`, `tool-verdict.ts`). Tests are flat too:
`tests/lib/tool-page-<name>.test.ts`. The homepage decision-instrument shipped via
PR #8 on this flat layout. (A local `feat/homepage-decision-instrument` branch had a
nested reorg that was abandoned — ignore it.)

## Done & on main (`origin/main` @ 6e9cf24)

- **Task 1.2** — `src/lib/tool-page/tool-verdict.ts` (`resolveToolVerdict`): resolves a
  0–100 score (avg of review scores, else `base_score`), `getScoreColor` label/color,
  one clean verdict line. Test: `tests/lib/tool-page-verdict.test.ts`.
- **Task 2.1** — `src/lib/hunter/content-policy/claim-shaping.ts`: `enforceDecisionUsefulClaim`
  no longer wraps a full clause in a framing prefix; `rewriteLowSpecificityClaim` returns
  `''` for generic claims; `gemini.ts` synthesis loop now DROPS such claims (keeps the rest
  of the packet) instead of throwing/canned-filler. Tests: `tests/lib/hunter/claim-shaping.test.ts`
  - rewritten cases in `tests/lib/hunter/gemini-service.test.ts`.
- **Phase 0 (identity) already satisfied on main**: `ink/signal` tokens + `grotesk/mono`
  fonts in `tailwind.config.mjs`, webfonts loaded in `BaseLayout.astro`.
- **Approved hero composition** recorded at the bottom of the plan doc — build Phase 3 to it.

## Remaining work (build on flat main, in plan order)

- **1.1** score-coverage audit — BLOCKED on Supabase auth (`supabase login` / `SUPABASE_ACCESS_TOKEN`).
  Decides whether `base_score` needs a backfill. `resolveToolVerdict` already handles null score.
- **2.2** prompt the model for decision-shaped single-sentence claims (+ eval fixture).
- **2.3** guarantee the canonical decision snapshot; deprecate the legacy verdict-narrative path.
- **3.1/3.2** `ToolVerdictInstrument.astro` (build to the approved composition: score dial
  colored by `getScoreColor` — functional, NOT brand amber; mono numerals; decision strip;
  single freshness line; demoted ghost CTA) → mount in `src/pages/tool/[slug].astro`, demote
  the affiliate CTA, delete the legacy verdict section.
- **Phase 4** collapse hedging to one freshness line; cut empty/duplicate sections; dedupe alternatives.
- **Phase 5** a11y/responsive + run gates.

## Environment gotchas (this machine)

- **Subagents cannot run Bash here** (Read/Write work; npm/git denied even when allowlisted).
  Execute implementation **inline**, with TDD (superpowers:test-driven-development) and
  verification-before-completion. Do not rely on subagents to run tests/commit.
- **Supabase MCP is not authenticated.** Task 1.1 is blocked until the human authenticates.
- **Worktree builds need `.env`**: env files are gitignored and don't copy into worktrees.
  Copy `.env` from the main checkout (`/Users/richardlitang/code/personal/stackhunt/.env`)
  into the worktree before `npm run build` / pushing, or the build fails on `SUPABASE_URL`.
- **Pre-push hook runs `npm run qa:prepush`** (format:check:changed, lint:strict, typecheck,
  build, rendered-page checks). Run it locally before pushing. Untracked artifacts (e.g.
  `.playwright-mcp/`) can trip `format:check:changed` — keep them gitignored/removed.

## Known issue (pre-existing, NOT from this work)

`main` has **7 failing tool-page route-state/runtime/orchestration tests**
(`tool-page-section-runtime-input`, `tool-page-orchestration-map`,
`tool-page-page-assembly-route-state`, `tool-page-decision-navigation-route-state`,
`tool-page-blueprint-runtime`, `tool-page-runtime-context`, `review-publish-gate`).
Verified failing on clean `origin/main` without this work. Worth a separate fix.

## Branches

- `feat/tool-page-verdict-flat` (pushed) == current `main` foundation.
- `feat/tool-page-verdict` (local only) = abandoned nested version; keep as backup or delete.
