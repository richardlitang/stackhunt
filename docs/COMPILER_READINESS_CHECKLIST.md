# Compiler Readiness Checklist

Purpose: hard Go/No-Go gate before enabling `/best` and `/compare` snapshot serving.

## Go/No-Go Rule

All sections must be green before public cutover.

---

## 1) Policy Lock

- [ ] `compiler_policy_version` is active and documented
- [ ] Volatility-tier freshness policy is locked
- [ ] Evidence tier policy (A/B/C) is locked
- [ ] Critical conflict behavior is locked (`disputed`, never silent overwrite)
- [ ] Public count semantics are locked (`all_reviews_count`, `published_reviews_count`, `snapshot_ranked_count`)

Evidence:
- `docs/DECISIONS.md`
- `docs/ARCHITECTURE.md`
- `supabase/migrations/20260221001000_add_policy_version_tracking.sql`

---

## 2) Data Model Hardening

- [ ] `/compare` route reads `items`, not legacy `tools`
- [ ] `item_aliases` table exists and is queryable
- [ ] Context count semantics columns exist
- [ ] Backfill script completes successfully
- [ ] Consistency check script reports zero mismatches

Evidence:
- `src/pages/compare/[...slugs].astro`
- `supabase/migrations/20260221003000_add_item_aliases.sql`
- `supabase/migrations/20260221004500_add_context_count_semantics.sql`
- `scripts/backfill-context-counts.ts`
- `scripts/check-context-count-consistency.ts`

---

## 3) Public Trust Path

- [ ] Provisional picks are admin-preview only
- [ ] Public `/best` does not require service-role data fetches
- [ ] Public `/compare` does not require service-role data fetches
- [ ] Draft content is not shown on public routes

Evidence:
- `src/pages/best/[slug].astro`
- `src/pages/compare/[...slugs].astro`
- `src/lib/supabase.ts`

---

## 4) Queue Safety

- [ ] Compiler-driven refresh enqueue has per-run budget cap
- [ ] Per-context refresh cap is enforced
- [ ] Queue fairness rotation is implemented
- [ ] Starvation metrics are visible in admin/ops

Evidence:
- `src/lib/hunter/services/queue.ts`
- `scripts/queue-worker.ts`
- `src/pages/admin/hunt-queue.astro`

---

## 5) Parity and Quality Verification

- [ ] Golden fixtures exist for top contexts and compare pairs
- [ ] Runtime-vs-snapshot diff harness exists
- [ ] Parity delta thresholds are defined and accepted
- [ ] Snapshot publish gate criteria are codified and tested

Evidence:
- `tests/fixtures/best_compare_golden/`
- `scripts/diff-runtime-vs-snapshot.ts`
- `tests/lib/compiler/`
- `src/lib/compiler/best/publish-gate.ts`
- `src/lib/compiler/compare/publish-gate.ts`

---

## 6) Build and Test Health

Run and pass:

```bash
npm run typecheck
npm run build
npm run test
```

---

## 7) Cutover Readiness

- [ ] Feature flags for snapshot reads are in place
- [ ] Shadow mode has run long enough with acceptable parity
- [ ] Rollback path to runtime rendering is documented
- [ ] Stakeholder approval recorded

---

## Final Approval

- Date:
- Reviewer:
- Decision: `GO` / `NO-GO`
- Notes:
