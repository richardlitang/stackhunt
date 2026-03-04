# Feature: Intelligence Platform vNext (Phase 1)

Last verified: 2026-03-05

## Goal
Ship a stop-harm quality/legal pass so new hunts produce evidence-backed editorial pages, while thin or risky pages stay draft/noindex.

## Architecture Overview
We will enforce the PRD through code gates in three places: ingestion (what can influence generation), persistence (what can be published), and rendering/indexing (what can be shown/crawled). The first pass focuses on deterministic guardrails, not prompt tuning, so quality improves immediately without model changes. Community input remains optional and aggregated, but never required for a hunt.

## Tech Stack
- Astro SSR pages (`src/pages/tool/[slug].astro`, sitemap routes)
- Hunter pipeline (`src/lib/hunter/phases/*`, `src/lib/hunter/services/*`)
- TypeScript domain schemas (`src/lib/hunter/types.ts`, `src/types/database.ts`)
- Existing quality gate (`src/lib/quality-gate.ts`)

## Tasks

### Task 1: Fix frontmatter ordering bug and baseline page gates
**Files:**
- Modify: `src/pages/tool/[slug].astro`

**Action:**
- Move `knowledgeCardForSeo`/filtered FAQ computation above `generateToolFAQSchema(...)` call.
- Keep FAQ schema and visible FAQ in sync from the same filtered array.
- Replace permissive community render condition (`signalEvidenceCount >= 3 || userAdvocate || humanVerdict`) with evidence-only condition for now (`signalEvidenceCount >= 3`).

**Verify:**
```bash
npm run typecheck
# Expected: no TS errors from tool page frontmatter
```

**Commit:** `fix(tool-page): align faq schema ordering and evidence-gated community render`

---

### Task 2: Correct draft/publish behavior for contextual reviews
**Files:**
- Modify: `src/lib/hunter/phases/persistence.ts`

**Action:**
- Fix inverted logic so `isDraftMode !== false` always produces `draft`.
- Allow auto-publish only when explicit publish mode is enabled (`isDraftMode === false`) and confidence checks pass.
- Keep legal/conflict guardrails in the publish path.

**Verify:**
```bash
npm run typecheck
```

**Commit:** `fix(hunter): enforce draft-first publish policy for context reviews`

---

### Task 3: Correct draft/publish behavior for discovery reviews
**Files:**
- Modify: `src/lib/hunter/phases/persistence.ts`

**Action:**
- Apply the same publish policy to discovery reviews (`context_id = null`).
- Remove implicit auto-publish in discovery mode when draft mode is enabled.

**Verify:**
```bash
npm run typecheck
```

**Commit:** `fix(hunter): enforce draft-first publish policy for discovery reviews`

---

### Task 4: Exclude noindex-quality pages from tools sitemap
**Files:**
- Modify: `src/pages/sitemap-tools.xml.ts`
- Modify: `src/lib/quality-gate.ts` (only if helper extraction needed)

**Action:**
- Evaluate index readiness for sitemap candidates and include only `shouldIndex === true`.
- Keep lightweight fields in sitemap query, and fetch only the minimum review data needed for gate evaluation.

**Verify:**
```bash
npm run typecheck
npm run build
# Expected: sitemap route compiles and build succeeds in connected env
```

**Commit:** `fix(seo): remove non-index-ready tool pages from sitemap`

---

### Task 5: Hard-filter policy-restricted sources from extraction inputs
**Files:**
- Modify: `src/lib/hunter/services/serper.ts`
- Modify: `src/lib/hunter/utils.ts`

**Action:**
- Keep restricted domains in `raw_sources` for audit, but ensure they cannot influence:
- `curated_sources`
- `scrape_plan.selected`
- `facts.facts_ledger` evidence selection
- Validate that only `SCRAPE_ALLOWED` + ingest-permitted sources are eligible.

**Verify:**
```bash
npm run typecheck
npm run test -- --runInBand
# If test filter is needed, run only hunter/service tests
```

**Commit:** `feat(hunter): hard-exclude restricted sources from fact generation`

---

### Task 6: Remove review-aggregator assumptions from source typing and prompts
**Files:**
- Modify: `src/lib/hunter/types.ts`
- Modify: `src/lib/hunter/utils.ts`
- Modify: `src/lib/hunter/services/prompts.ts`

**Action:**
- Update source-type comments/examples that currently treat G2/Capterra/Trustpilot as trusted editorial defaults.
- Replace prompt language that asks for “reviews/sentiment” with “reported usage patterns” and evidence-backed editorial framing.

**Verify:**
```bash
npm run typecheck
rg -n "g2|capterra|trustpilot|sentiment score|reviews" src/lib/hunter
# Expected: no active prompt/type guidance endorsing blocked review aggregators
```

**Commit:** `refactor(hunter): align source semantics with editorial intelligence model`

---

### Task 7: Introduce section-level publishability gates (blank over filler)
**Files:**
- Modify: `src/lib/quality-gate.ts`
- Modify: `src/pages/tool/[slug].astro`

**Action:**
- Add explicit per-section gate helpers (pricing/specs/community/faq) with minimum evidence requirements.
- Render sections only when gate passes; do not render fallback filler text.

**Verify:**
```bash
npm run typecheck
npm run build
```

**Commit:** `feat(quality): add section-level publishability gating`

---

### Task 8: Add site-wide one-line community disclaimer (single occurrence)
**Files:**
- Modify: `src/layouts/BaseLayout.astro`

**Action:**
- Add exactly one global disclaimer sentence matching PRD intent.
- Do not duplicate this disclaimer across tool sections.

**Verify:**
```bash
npm run typecheck
npm run build
```

**Commit:** `feat(legal): add global community-signals disclaimer`

---

### Task 9: Rename UI language from “reviews/sentiment” to intelligence framing
**Files:**
- Modify: `src/pages/tool/[slug].astro`
- Modify: `src/components/SignalReportWidget.tsx`
- Modify: `src/pages/disclosure.astro`

**Action:**
- Replace user-facing terms that imply review aggregation (`reviews`, `sentiment`) with PRD-approved terms (`Community Signals`, `Observed Usage Patterns`, `Field-Reported Friction`).

**Verify:**
```bash
rg -n "Reviews|sentiment|Top reviewed|best rated|most loved" src/pages src/components
# Expected: only intentional legacy admin/internal references remain
```

**Commit:** `chore(copy): shift tool-page language to editorial intelligence framing`

---

### Task 10: Hunt readiness smoke test (limited)
**Files:**
- No code changes required (execution task)

**Action:**
- Run one controlled hunt on a known strong-source tool and verify:
- review status is draft unless publish mode is explicit
- low-evidence sections remain hidden
- page emits correct robots behavior
- sitemap includes only index-ready tools

**Verify:**
```bash
npm run hunt -- --tool="Canva" --context="Best design tool for startup teams"
npm run typecheck
npm run test
```

**Commit:** `chore(qa): validate vnext gating with controlled hunt`

## Execution Mode
Option 1 (recommended): sequential batches
1. Tasks 1-4 (stop-harm + SEO safety)
2. Tasks 5-7 (ingestion and section quality)
3. Tasks 8-10 (copy/legal alignment + hunt smoke)

## Human Checkpoints
1. After this plan: confirm scope and order.
2. After Tasks 1-4: verify we are safe to resume low-volume hunts.
3. After Task 10: decide whether to run 5-tool hunt batch.

## Notes
- Current repo is dirty; do not touch unrelated modified files.
- Prioritize minimal diffs in already-edited files to avoid merge conflicts.
- If `npm run build` fails due external network/Supabase DNS, treat as environment blocker and continue with typecheck/tests + route-level static checks.
