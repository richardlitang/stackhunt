# Feature: Snapshot Readiness Hardening (Prereq Program)

Last verified: 2026-03-05

## Goal
Remove key technical debt and operational risk before implementing `/best` and `/compare` snapshot compilers.

## Why This Exists
The snapshot architecture is sound, but current production paths still have mixed data models, runtime provisional behavior, and ambiguous count semantics. This plan takes the slower, safer path: harden first, then build.

## Success Criteria (Go/No-Go)
- `tools` vs `items` usage is unified for compare-serving logic.
- Public pages do not require service-role fallback behavior.
- Count semantics are explicit and implemented (`all`, `published`, `snapshot-ranked`).
- Queue fairness guardrails are in place before compiler-driven refresh enqueue.
- Policy contracts are versioned and enforced in code.

If any item above is red, snapshot compiler build does not start.

## Track 1: Policy Lock and Versioning

### Task 1.1: Lock policy contracts in docs
**Files:**
- Modify: `docs/DECISIONS.md`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `src/pages/methodology.astro` (if policy is surfaced publicly)
**Action:** Modify

Lock:
- confidence/staleness policy by field volatility tier
- conflict handling policy (`disputed`, `resolved`, `unknown`)
- evidence tier policy (A/B/C) and critical-field requirements

**Verify:**
```bash
rg -n "staleness|confidence|disputed|evidence tier|critical field" docs/DECISIONS.md docs/ARCHITECTURE.md src/pages/methodology.astro
```

**Commit:** `docs(policy): lock compiler trust contracts`

---

### Task 1.2: Add policy version primitive
**Files:**
- Add: `src/lib/compiler/policy-version.ts`
- Add: `supabase/migrations/20260220_add_policy_version_tracking.sql`
**Action:** Create

Add `policy_version` support so every future snapshot can record which policy evaluated it.

**Verify:**
```bash
npm run types:db
npm run typecheck
```

**Commit:** `feat(policy): add policy version tracking primitives`

---

## Track 2: Data Model Debt Paydown

### Task 2.1: Remove legacy `tools` dependency from compare route
**Files:**
- Modify: `src/pages/compare/[...slugs].astro`
- Modify: `src/lib/supabase.ts` (comparison helpers if needed)
**Action:** Modify

Migrate compare page query path to `items` consistently. Keep compatibility behavior only in controlled helper layer if required.

**Verify:**
```bash
rg -n "from\\('tools'\\)" src/pages/compare/[...slugs].astro src/lib/supabase.ts
npm run typecheck
npm run build
```

**Commit:** `refactor(compare): unify compare serving on items data model`

---

### Task 2.2: Add canonical alias support (identity stability)
**Files:**
- Add: `supabase/migrations/20260220_add_item_aliases.sql`
- Add: `src/lib/items/aliases.ts`
**Action:** Create

Introduce `item_aliases` table to handle rebrands/synonyms/domain drift, preventing split identity in best/compare compile inputs.

**Verify:**
```bash
npm run types:db
npm run typecheck
```

**Commit:** `feat(identity): add item alias mapping for canonical tool identity`

---

### Task 2.3: Formalize count semantics in schema
**Files:**
- Add: `supabase/migrations/20260220_add_context_count_semantics.sql`
- Modify: `src/types/database.ts` (generated after migration)
**Action:** Create/Modify

Add explicit fields or derived structures for:
- `all_reviews_count`
- `published_reviews_count`
- `snapshot_ranked_count` (later populated by snapshots)

Do not overload `contexts.tool_count`.

**Verify:**
```bash
npm run types:db
npm run typecheck
```

**Commit:** `feat(metrics): add explicit count semantics for contexts`

---

### Task 2.4: Backfill and consistency check for counts
**Files:**
- Add: `scripts/backfill-context-counts.ts`
- Add: `scripts/check-context-count-consistency.ts`
**Action:** Create

Backfill new count fields and add an integrity checker to catch drift.

**Verify:**
```bash
npx tsx scripts/backfill-context-counts.ts
npx tsx scripts/check-context-count-consistency.ts
```

**Commit:** `chore(metrics): backfill and verify context count consistency`

---

## Track 3: Public Trust Path Hardening

### Task 3.1: Feature flag provisional picks to admin-only
**Files:**
- Modify: `src/pages/best/[slug].astro`
- Modify: `src/lib/supabase.ts`
**Action:** Modify

Move provisional review surfacing behind explicit admin preview mode and keep public path published-only behavior.

**Verify:**
```bash
rg -n "_isProvisional|getProvisionalReviewsForContext|Early Pick" src/pages/best/[slug].astro src/lib/supabase.ts
npm run build
```

**Commit:** `refactor(best): restrict provisional ranking to admin preview`

---

### Task 3.2: Remove service-role requirements from public routes
**Files:**
- Modify: `src/pages/best/[slug].astro`
- Modify: `src/pages/compare/[...slugs].astro`
- Modify: `src/lib/supabase.ts`
**Action:** Modify

Public routes should rely on public-safe data paths only; service-role reads stay in admin/compiler jobs.

**Verify:**
```bash
rg -n "getAdminClient|supabaseAdmin" src/pages/best/[slug].astro src/pages/compare/[...slugs].astro src/lib/supabase.ts
npm run typecheck
npm run build
```

**Commit:** `security(routes): enforce public-safe data paths for best and compare`

---

## Track 4: Queue and Ops Guardrails (Before Compiler Enqueue)

### Task 4.1: Add enqueue budgets and fairness controls
**Files:**
- Modify: `src/lib/hunter/services/queue.ts`
- Modify: `scripts/queue-worker.ts`
**Action:** Modify

Add:
- max refresh-enqueue per run
- per-context cap
- fairness rotation by context

**Verify:**
```bash
npm run typecheck
```

**Commit:** `feat(queue): add fairness and enqueue budget guardrails`

---

### Task 4.2: Add queue starvation observability
**Files:**
- Add: `src/lib/queue/health.ts`
- Modify: `src/pages/admin/hunt-queue.astro`
**Action:** Create/Modify

Expose metrics:
- pending age p95 by context
- starvation alerts
- refresh enqueue share vs new-hunt share

**Verify:**
```bash
npm run typecheck
npm run build
```

**Commit:** `feat(queue): add starvation and fairness telemetry`

---

## Track 5: Test and Parity Harness

### Task 5.1: Build golden fixture set for top contexts
**Files:**
- Add: `tests/fixtures/best_compare_golden/*.json`
- Add: `tests/lib/compiler/golden-fixture.test.ts`
**Action:** Create

Create deterministic fixtures for 10-20 high-traffic contexts/pairs and expected ranking/winner outcomes.

**Verify:**
```bash
npm run test -- tests/lib/compiler/golden-fixture.test.ts
```

**Commit:** `test(golden): add deterministic fixtures for best and compare`

---

### Task 5.2: Add runtime-vs-shadow diff harness
**Files:**
- Add: `scripts/diff-runtime-vs-snapshot.ts`
- Add: `src/lib/compiler/diff-report.ts`
**Action:** Create

Generate parity reports:
- rank deltas
- winner deltas
- missing evidence/conflict deltas

**Verify:**
```bash
npx tsx scripts/diff-runtime-vs-snapshot.ts --sample 50
```

**Commit:** `chore(parity): add runtime vs snapshot diff harness`

---

## Track 6: Documentation Debt Cleanup

### Task 6.1: Refresh architecture docs to items-first reality
**Files:**
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/PRODUCT_SUMMARY.md`
**Action:** Modify

Remove stale `tools`-first language where current runtime is `items`-centric.

**Verify:**
```bash
rg -n "\\btools\\b|\\bitems\\b" docs/ARCHITECTURE.md docs/PRODUCT_SUMMARY.md
```

**Commit:** `docs(architecture): align docs with items-first data model`

---

### Task 6.2: Add compiler readiness checklist
**Files:**
- Add: `docs/COMPILER_READINESS_CHECKLIST.md`
**Action:** Create

Checklist must include:
- policy lock complete
- data model debt resolved
- public trust path hardened
- queue fairness live
- parity report within agreed tolerance

**Verify:**
```bash
rg -n "Go/No-Go|policy|parity|fairness" docs/COMPILER_READINESS_CHECKLIST.md
```

**Commit:** `docs(checklist): add compiler go-no-go readiness checklist`

---

## Exit Criteria For Starting Snapshot Compiler Build
- Track 1 complete
- Track 2 complete
- Track 3 complete
- Track 4 complete
- Track 5 complete with acceptable parity tolerance
- Track 6 complete

Then start `docs/plans/2026-02-20-best-compare-snapshot-compiler.md`.

## Global Verification Commands (per batch)
```bash
npm run typecheck
npm run build
npm run test
```
