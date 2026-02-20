# Feature: Best/Compare Snapshot Compiler

## Goal
Build deterministic, evidence-backed `/best` and `/compare` pages that scale to large page counts while improving trust, maintainability, and operational control.

## Architecture Overview
Keep Hunter as the canonical extraction system and introduce offline compilers that read existing item/review/claim data, apply deterministic specs, and publish snapshot artifacts. Public routes read published snapshots only after shadow-mode parity is proven. Policy decisions (staleness, confidence, conflict handling, evidence class) are formalized first, then enforced in compiler gating and UI messaging.

## Tech Stack
- Astro SSR routes (`src/pages/best`, `src/pages/compare`)
- Supabase Postgres + migrations (`supabase/migrations`)
- Existing Hunter pipeline (`src/lib/hunter/*`)
- Existing quality gate (`src/lib/quality-gate.ts`)
- Queue worker/cron (`scripts/queue-worker.ts`, `src/pages/api/cron/hunt.ts`)

## Task Batches

### Batch 0: Policy Contracts (must complete before schema/code)

#### Task 0.1: Define confidence + staleness policy contract
**Files:**
- Add: `docs/DECISIONS.md` (new section)
- Add: `docs/ARCHITECTURE.md` (policy section)
**Action:** Modify

Specify:
- Volatility tiers by field class (`pricing`, `plan_gating`, `core_features`, `integrations`, `security`)
- Stale thresholds per tier
- Confidence downgrade rules
- Disagreement behavior for critical fields (`disputed` state)

**Verify:**
```bash
rg -n "confidence|staleness|disputed|volatility" docs/DECISIONS.md docs/ARCHITECTURE.md
```

**Commit:** `docs(policy): define confidence and staleness contract for compilers`

---

#### Task 0.2: Define evidence tier policy
**Files:**
- Modify: `docs/DECISIONS.md`
- Modify: `docs/methodology.md` (or `src/pages/methodology.astro` if docs page is code-first)
**Action:** Modify

Define allowed evidence classes and usage:
- Tier A: official/docs/support/legal
- Tier B: editorial
- Tier C: community/opinion

Define what field classes require Tier A.

**Verify:**
```bash
rg -n "Tier A|Tier B|Tier C|critical fields" docs/DECISIONS.md src/pages/methodology.astro docs/methodology.md
```

**Commit:** `docs(policy): formalize evidence tier usage by claim type`

---

#### Task 0.3: Define public count semantics
**Files:**
- Modify: `docs/DECISIONS.md`
- Modify: `docs/data_model_fields.md`
**Action:** Modify

Lock definitions:
- `all_reviews_count`
- `published_reviews_count`
- `snapshot_ranked_count`

**Verify:**
```bash
rg -n "published_reviews_count|snapshot_ranked_count|count semantics" docs/DECISIONS.md docs/data_model_fields.md
```

**Commit:** `docs(policy): standardize list and review count semantics`

---

#### Task 0.4: Define compare compile policy
**Files:**
- Modify: `docs/DECISIONS.md`
- Modify: `docs/ARCHITECTURE.md`
**Action:** Modify

Decide:
- On-demand compile + cache for compare pairs
- Refresh priority by traffic and staleness
- No full pair precompute

**Verify:**
```bash
rg -n "on-demand|pair explosion|compare cache" docs/DECISIONS.md docs/ARCHITECTURE.md
```

**Commit:** `docs(policy): adopt on-demand compare compilation strategy`

---

### Batch 1: Schema Foundations

#### Task 1.1: Add snapshot/spec tables
**Files:**
- Add: `supabase/migrations/20260220_create_snapshot_compiler_tables.sql`
- Modify: `src/types/database.ts` (after type generation)
**Action:** Create/Modify

Create:
- `best_snapshots`
- `compare_snapshots`
- `context_specs` (thin overrides)
- `compiler_jobs` (optional queue metadata)

Include status fields (`draft|published`), versioning, `computed_at`, `published_at`.

**Verify:**
```bash
npm run types:db
npm run typecheck
```

**Commit:** `feat(db): add snapshot compiler tables for best and compare`

---

#### Task 1.2: Add publish-safe views
**Files:**
- Modify: `supabase/migrations/20260220_create_snapshot_compiler_tables.sql`
**Action:** Modify

Create views:
- `best_snapshots_published_v`
- `compare_snapshots_published_v`

Index for route lookup:
- `best_snapshots(context_slug, status, published_at desc)`
- `compare_snapshots(tool_a_slug, tool_b_slug, spec_key, status, published_at desc)`

**Verify:**
```bash
npm run types:db
```

**Commit:** `feat(db): add published snapshot views and lookup indexes`

---

#### Task 1.3: Add deterministic count support
**Files:**
- Modify: `supabase/migrations/20260220_create_snapshot_compiler_tables.sql`
**Action:** Modify

Add materialized support or computed fields for:
- `published_reviews_count` by context
- `snapshot_ranked_count` from latest published snapshot

**Verify:**
```bash
npm run types:db
```

**Commit:** `feat(db): add published and snapshot count support`

---

### Batch 2: Compiler Domain Layer

#### Task 2.1: Add compiler policy module
**Files:**
- Add: `src/lib/compiler/policy.ts`
- Add: `src/lib/compiler/types.ts`
**Action:** Create

Implement pure policy helpers:
- freshness checks by volatility tier
- conflict classification
- evidence tier acceptance
- confidence calculation

**Verify:**
```bash
npm run typecheck
```

**Commit:** `feat(compiler): add policy primitives for freshness and confidence`

---

#### Task 2.2: Add scoring ontology and schema adapters
**Files:**
- Add: `src/lib/compiler/ontology.ts`
- Add: `src/lib/compiler/adapters/crm.ts`
- Add: `src/lib/compiler/adapters/index.ts`
**Action:** Create

Start with one category (`crm_sales`) and 6-10 deterministic dimensions.

**Verify:**
```bash
npm run typecheck
```

**Commit:** `feat(compiler): add scoring ontology and initial category adapter`

---

#### Task 2.3: Add spec derivation engine
**Files:**
- Add: `src/lib/compiler/spec/defaults/crm_sales.default.json`
- Add: `src/lib/compiler/spec/modifiers.json`
- Add: `src/lib/compiler/spec/derive.ts`
**Action:** Create

Implement:
- `category default + modifiers + context override`
- weight normalization
- validation guards

**Verify:**
```bash
npm run typecheck
```

**Commit:** `feat(compiler): add deterministic spec derivation engine`

---

#### Task 2.4: Add tests for policy/spec/scoring
**Files:**
- Add: `tests/lib/compiler/policy.test.ts`
- Add: `tests/lib/compiler/spec.test.ts`
- Add: `tests/lib/compiler/scoring.test.ts`
**Action:** Create

Cover:
- unknown handling
- tie-break rules
- modifier composition
- staleness/conflict behavior

**Verify:**
```bash
npm run test -- tests/lib/compiler/policy.test.ts tests/lib/compiler/spec.test.ts tests/lib/compiler/scoring.test.ts
```

**Commit:** `test(compiler): cover policy, spec derivation, and scoring rules`

---

### Batch 3: Best Snapshot Compiler

#### Task 3.1: Add best compiler service
**Files:**
- Add: `src/lib/compiler/best/compile-best-snapshot.ts`
- Add: `src/lib/compiler/best/select-candidates.ts`
- Add: `src/lib/compiler/best/explanations.ts`
**Action:** Create

Compiler inputs:
- context slug
- current item/review/claims data
- derived spec

Compiler outputs:
- ranked candidates
- evidence refs
- gating metadata
- draft snapshot row

**Verify:**
```bash
npm run typecheck
```

**Commit:** `feat(best): implement deterministic best snapshot compiler`

---

#### Task 3.2: Add best publish gate
**Files:**
- Add: `src/lib/compiler/best/publish-gate.ts`
- Add: `tests/lib/compiler/best-publish-gate.test.ts`
**Action:** Create

Gate checks:
- min publishable candidates
- top-k coverage threshold
- critical conflicts threshold
- freshness threshold

**Verify:**
```bash
npm run test -- tests/lib/compiler/best-publish-gate.test.ts
```

**Commit:** `feat(best): add snapshot publish gate for best pages`

---

#### Task 3.3: Add admin compile endpoints
**Files:**
- Add: `src/pages/api/admin/best/compile.ts`
- Add: `src/pages/api/admin/best/publish.ts`
**Action:** Create

Support:
- compile draft
- publish latest draft if gate passes

**Verify:**
```bash
npm run typecheck
npm run build
```

**Commit:** `feat(api): add admin endpoints for best snapshot compile and publish`

---

### Batch 4: Compare Snapshot Compiler

#### Task 4.1: Add compare compiler service
**Files:**
- Add: `src/lib/compiler/compare/compile-compare-snapshot.ts`
- Add: `src/lib/compiler/compare/section-winners.ts`
- Add: `src/lib/compiler/compare/incomparable.ts`
**Action:** Create

Implement:
- side-by-side deterministic fact table
- per-section winners
- overall verdict threshold logic (`winner` vs `depends`)
- incomparability handling

**Verify:**
```bash
npm run typecheck
```

**Commit:** `feat(compare): implement snapshot compiler for compare pages`

---

#### Task 4.2: Add compare publish gate
**Files:**
- Add: `src/lib/compiler/compare/publish-gate.ts`
- Add: `tests/lib/compiler/compare-publish-gate.test.ts`
**Action:** Create

Gate checks:
- both tools meet required coverage
- critical fields not unresolved (or explicitly marked disputed)

**Verify:**
```bash
npm run test -- tests/lib/compiler/compare-publish-gate.test.ts
```

**Commit:** `feat(compare): add publish gate for compare snapshots`

---

#### Task 4.3: Add compare compile endpoint
**Files:**
- Add: `src/pages/api/admin/compare/compile.ts`
- Add: `src/pages/api/admin/compare/publish.ts`
**Action:** Create

Compile behavior:
- on-demand for pair
- refresh only when stale/policy-triggered

**Verify:**
```bash
npm run typecheck
npm run build
```

**Commit:** `feat(api): add admin compare compile and publish endpoints`

---

### Batch 5: Queue and Refresh Orchestration

#### Task 5.1: Add compiler refresh enqueue logic
**Files:**
- Add: `src/lib/compiler/refresh-enqueue.ts`
- Modify: `src/lib/hunter/services/queue.ts`
**Action:** Create/Modify

Enqueue refresh hunts only when:
- required fields missing
- high-volatility facts stale
- critical conflict unresolved

**Verify:**
```bash
npm run typecheck
```

**Commit:** `feat(queue): enqueue targeted refresh hunts from compiler checks`

---

#### Task 5.2: Add queue fairness guardrails
**Files:**
- Modify: `src/lib/hunter/services/queue.ts`
- Modify: `scripts/queue-worker.ts`
**Action:** Modify

Add:
- per-context enqueue cap
- per-run compiler enqueue budget
- fairness rotation across contexts

**Verify:**
```bash
npm run typecheck
```

**Commit:** `feat(queue): add fairness and budget limits for compiler-driven refreshes`

---

### Batch 6: Serving Migration (shadow -> public)

#### Task 6.1: Add snapshot read path for best
**Files:**
- Add: `src/lib/compiler/read-best-snapshot.ts`
- Modify: `src/pages/best/[slug].astro`
**Action:** Create/Modify

Behavior:
- read latest published snapshot first
- keep existing runtime path behind admin-only preview fallback

**Verify:**
```bash
npm run typecheck
npm run build
```

**Commit:** `feat(best): read published snapshot with admin preview fallback`

---

#### Task 6.2: Add snapshot read path for compare
**Files:**
- Add: `src/lib/compiler/read-compare-snapshot.ts`
- Modify: `src/pages/compare/[...slugs].astro`
**Action:** Create/Modify

Behavior:
- read published compare snapshot first
- if absent, show stable "comparison not ready" public state
- compile trigger remains admin-only

**Verify:**
```bash
npm run typecheck
npm run build
```

**Commit:** `feat(compare): serve published compare snapshots with stable fallback`

---

#### Task 6.3: Remove public provisional picks
**Files:**
- Modify: `src/pages/best/[slug].astro`
- Modify: `src/lib/supabase.ts`
**Action:** Modify

Move provisional/draft surfacing to admin preview only.

**Verify:**
```bash
npm run typecheck
npm run build
```

**Commit:** `refactor(best): restrict provisional picks to admin preview mode`

---

### Batch 7: Observability and Governance

#### Task 7.1: Add snapshot audit metadata
**Files:**
- Modify: `src/lib/compiler/best/compile-best-snapshot.ts`
- Modify: `src/lib/compiler/compare/compile-compare-snapshot.ts`
**Action:** Modify

Store:
- compile reasons
- tie-break notes
- unresolved fields
- policy version used

**Verify:**
```bash
npm run typecheck
```

**Commit:** `feat(compiler): persist audit metadata for snapshot decisions`

---

#### Task 7.2: Add override audit trail
**Files:**
- Add: `supabase/migrations/20260220_add_snapshot_override_log.sql`
- Add: `src/pages/api/admin/snapshots/override.ts`
**Action:** Create

Require:
- override reason
- editor identity
- previous/new values

**Verify:**
```bash
npm run types:db
npm run typecheck
```

**Commit:** `feat(governance): add audited editorial override workflow`

---

#### Task 7.3: Add health dashboards
**Files:**
- Add: `src/pages/admin/snapshots.astro`
- Add: `src/lib/compiler/health.ts`
**Action:** Create

Track:
- stale snapshot count
- unpublished drafts blocked by gate reason
- conflict/disputed rates

**Verify:**
```bash
npm run typecheck
npm run build
```

**Commit:** `feat(admin): add snapshot health dashboard`

---

## Cutover Milestones

### Milestone A: Policy lock
Done when Batch 0 is merged and accepted.

### Milestone B: Shadow compiler
Done when Batches 1-4 compile snapshots without public serving changes.

### Milestone C: Public best cutover
Done when Batch 6.1 and 6.3 are merged and snapshot parity is accepted.

### Milestone D: Public compare cutover
Done when Batch 6.2 is merged and pair fallback behavior is validated.

### Milestone E: Operational hardening
Done when Batch 5 and Batch 7 are merged.

## Global Verification Gate (run before each merge batch)
```bash
npm run typecheck
npm run build
npm run test
```

## Human Checkpoints
1. After Batch 0: confirm policy language and thresholds.
2. After Batch 2: confirm ontology + modifier model.
3. After Batch 4: confirm compiler output shape and gate criteria.
4. After Batch 6: approve public cutover.
5. After Batch 7: approve governance and ops metrics.
