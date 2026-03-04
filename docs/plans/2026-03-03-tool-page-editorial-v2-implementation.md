# Feature: Tool Page Editorial v2 Implementation

Last verified: 2026-03-05

## Goal

Ship a narrative-first `/tool/[slug]` page that is buyer-helpful, source-safe, and materially less template-heavy than v1.

## Non-Goals

- No full redesign of `/best` or `/compare` in this pass.
- No schema expansion beyond visible-content parity.
- No changes to legal acquisition policy in this plan.

## Architecture Overview

Enforce editorial quality in four layers:
1. Render contract (`src/pages/tool/[slug].astro`)
2. Content assembly/generation contract (`src/lib/hunter/services/prompts.ts`, `src/lib/hunter/phases/persistence.ts`)
3. Deterministic QA gates (`src/lib/tool-page-qa-gate.ts`, `scripts/qa-rendered-tool-pages.mjs`)
4. Rollout + refresh workflow (`scripts/hunter.ts`, queue jobs, draft publish flow)

## Tasks

### Task 0: Baseline Snapshot + Known Failures
**Files:**
- Update: `docs/TOOL_PAGE_EDITORIAL_BLUEPRINT_V2.md` (if needed)
- Capture QA output from: `scripts/qa-rendered-tool-pages.mjs`

**Action:**
- Freeze baseline for pilot pages (Figma/Zapier/Airtable/Asana/Discord).
- Record structural failures: duplication, contradictions, list-heavy output.

**Verify:**
```bash
node scripts/qa-rendered-tool-pages.mjs
```

**Commit:** `chore(tool-page): capture editorial-v2 baseline failures`

---

### Task 1: Remove Duplicate Verdict Surfaces
**Files:**
- Modify: `src/pages/tool/[slug].astro`

**Action:**
- Keep one primary verdict narrative surface.
- Demote secondary verdict summaries to compact support copy or remove.

**Verify:**
```bash
npm run typecheck
npm run build
```

**Commit:** `refactor(tool-page): remove duplicate verdict surfaces`

---

### Task 2: Reorder to Narrative-First Layout
**Files:**
- Modify: `src/pages/tool/[slug].astro`
- Modify: `src/components/PricingPlansGrid.astro` (only if needed for compact placement)

**Action:**
- Enforce order from blueprint:
  1) Decision hero
  2) Why choose/skip
  3) Cost reality
  4) Setup risk
  5) Alternatives
  6) Evidence/update
  7) Deep specs (collapsed)

**Verify:**
```bash
npm run build
```

**Commit:** `refactor(tool-page): enforce editorial-v2 section flow`

---

### Task 3: Add Pricing Narrative Before Matrix
**Files:**
- Modify: `src/components/PricingInsights.astro`
- Modify: `src/pages/tool/[slug].astro`

**Action:**
- Render a short buyer-facing cost takeaway before table/cards.
- Cap initial visible plan rows; keep the rest collapsible.

**Verify:**
```bash
npm run typecheck
npm run build
```

**Commit:** `feat(pricing): add buyer-facing narrative before plan matrix`

---

### Task 4: Tighten Intro/Verdict Generation Contract
**Files:**
- Modify: `src/lib/hunter/services/prompts.ts`
- Modify: `src/lib/hunter/phases/persistence.ts`
- Modify: `src/lib/tool-page-intro.ts`

**Action:**
- Force concrete `best_for`, `not_for`, `main_tradeoff`.
- Reject generic phrase outputs.
- Prefer specific, source-backed claims when selecting intro evidence.

**Verify:**
```bash
npm run test -- tests/lib/tool-page-intro.test.ts
npm run typecheck
```

**Commit:** `feat(hunter): enforce concrete editorial intro contract`

---

### Task 5: Add Contradiction + Incomplete-Phrase Blockers
**Files:**
- Modify: `src/lib/tool-page-qa-gate.ts`
- Modify: `scripts/qa-rendered-tool-pages.mjs`
- Add/modify tests under `tests/lib/tool-page-qa-gate.test.ts`

**Action:**
- Add blockers for:
  - verdict/pros/cons/pricing contradictions
  - incomplete clause artifacts
  - above-the-fold duplicate decision claims

**Verify:**
```bash
npm run test -- tests/lib/tool-page-qa-gate.test.ts
node scripts/qa-rendered-tool-pages.mjs
```

**Commit:** `feat(qa): add contradiction and phrase-integrity blockers`

---

### Task 6: Suppress Low-Value Decorative Blocks
**Files:**
- Modify: `src/components/TribalKnowledge.astro`
- Modify: `src/pages/tool/[slug].astro`

**Action:**
- Keep community insights only when they add new decision signal.
- Remove or suppress cosmetic blocks with no incremental buyer value.

**Verify:**
```bash
npm run typecheck
npm run build
```

**Commit:** `refactor(tool-page): suppress low-signal decorative blocks`

---

### Task 7: Published-vs-Draft Consistency Guard
**Files:**
- Modify: `src/pages/tool/[slug].astro`
- Optional: `src/lib/supabase.ts` if query ordering needs alignment

**Action:**
- Ensure public page never mixes published review body with newer draft-only narrative context.
- Keep freshness labels coherent by source.

**Verify:**
```bash
npm run typecheck
npm run build
```

**Commit:** `fix(tool-page): harden published-draft consistency rules`

---

### Task 8: Pilot Regeneration + Editorial QA
**Files:**
- No template additions required; operate through queue/hunt workflow

**Action:**
- Re-hunt pilot set and render-check pages.
- Compare pre/post against blueprint acceptance criteria.

**Verify:**
```bash
npm run hunt -- --tool="Figma"
npm run hunt -- --tool="Zapier"
npm run hunt -- --tool="Airtable"
npm run hunt -- --tool="Asana"
npm run hunt -- --tool="Discord"
node scripts/qa-rendered-tool-pages.mjs
```

**Commit:** `chore(content): run editorial-v2 pilot refresh and qa`

---

### Task 9: Rollout Gate
**Files:**
- Modify: `scripts/ci-content-policy-gates.mjs`
- Modify: `docs/TOOL_PAGE_QA_GATE_V1.md` (or promote v2 counterpart)

**Action:**
- Promote new blockers from warning to fail for `/tool` pages.
- Keep rollout scoped to tool pages only.

**Verify:**
```bash
npm run typecheck
npm run build
npm run test
```

**Commit:** `feat(ci): enforce editorial-v2 gates for tool pages`

## Risks

- Over-suppressing sections may hide useful data; mitigation: warnings before hard fail.
- Prompt hardening can reduce output coverage; mitigation: fallback constrained copy with explicit unknown states.
- Legacy published content may still look old; mitigation: pilot re-hunt + republish queue.

## Done Criteria

- Pilot pages pass rendered QA with no critical blockers.
- No duplicated verdict surfaces above the fold.
- Pricing starts with buyer guidance before dense matrix.
- No contradictions in verdict/pros/cons/pricing.
- Tool pages show measurable readability/scannability improvement in QA notes.
