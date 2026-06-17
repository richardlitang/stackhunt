# Orchestrator + Escalation Hardening Plan

Last verified: 2026-06-16

**Goal:** After the interview-readiness-hardening plan landed (Phases 1–5, commits `cd7362c`→`d6a7958`), address the highest-value architecture debt that plan did _not_ cover: the `hunt()` god-method's boolean choreography + duplicated preflight logic, and the dead `ESCALATION` model tier that leaves synthesis with no quality-escalation path. Close out the finished plan first.

**Non-goal:** No change to hunt _semantics_ or published content. P1 is behavior-preserving (characterization-tested). P2 adds a new escalation path gated behind weak-quality signals only.

**Tech Stack:** TypeScript, Astro 5, Supabase, Vitest, Gemini via `@google/genai`.

**Validation gate:** `npm run typecheck && npm run test` per task; `npm run qa:prepush` once at the end. Smoke: `npm run queue:worker -- --once` after P1+P2.

---

## P0 — Close out the finished plan (housekeeping)

The 2026-06-10 interview-readiness plan is fully implemented but parked in `active/` with a stale handoff.

- [ ] **Confirm green baseline:** `npm run typecheck && npm run test` pass on current `main` before touching anything.
- [ ] **Correct the handoff** `2026-06-10-interview-readiness-hardening-handoff.md`: update "Current Status" to reflect all 13 tasks landed (cite commits `cd7362c`, `bc4e14e`, `134a86c`, `d6a7958`).
- [ ] **Move the plan** to `docs/plans/completed/` per `docs/plans/README.md`.
- [ ] **Commit** the move + handoff correction (the two files are currently untracked).

---

## P1 — Refactor `hunt()` into a tested phase state machine

`src/lib/hunter/orchestrator.ts` `hunt()` is ~480 lines. Two concrete smells (both banned by `CLAUDE.md`):

1. **Duplicated preflight scoring** — the source-counting block (`reviewCount`/`tribalCount`/`officialCount`/`pricingCount`/`eligibleCount` + `passesPreflight`) appears twice, near-verbatim (orchestrator.ts ~584-682), once for the initial check and once for the fresh-research re-check.
2. **Boolean choreography** — `skipAnalysis` / `skipSynthesis` / `skipPersistence` / `insufficientSources` mutated across deeply nested branches.

### Task 1: Extract preflight scoring into a pure, tested function

- [ ] Create `src/lib/hunter/preflight-sources.ts` exporting:
  - `scoutSourceCounts(scoutResult)` → `{ eligible, review, tribal, official, pricing }` (verbatim of the existing `.filter(...).length` logic + `isLlmEligibleScoutSource`).
  - `passesSourcePreflight(counts, { hasContext })` → `{ passed, minEligible, minOfficial }` (verbatim of the adaptive-threshold logic at ~574-581).
- [ ] Replace both inline blocks in `hunt()` with calls to these. Behavior identical.
- [ ] Test `tests/lib/hunter/preflight-sources.test.ts`: pin the adaptive threshold (2 eligible allowed when ≥2 official; else 3 w/ context, 4 without) and the count derivation. Characterization — assert what the code does today.
- [ ] `npm run typecheck && npm run test`; commit.

### Task 2: Model phase-skip flags as named transitions

- [ ] Add a small `HuntPlan` state helper (new `src/lib/hunter/hunt-plan.ts` or inline reducer) with named events: `markDuplicate`, `markDefunct`, `markInsufficientSources`, `markBudgetExceeded`, `markPriceOnly`, `markBatchTwoStage`. Each sets the appropriate `skip*` flags in one place instead of scattered assignments.
- [ ] Thread it through `hunt()` so the skip-flag intent is readable at each decision point. No new behavior.
- [ ] Existing tests + a focused unit test for the transition helper. `npm run typecheck && npm run test`; commit.

---

## P2 — Wire the dead `ESCALATION` tier for synthesis

`model-router.ts` defines `ESCALATION: 'gemini-2.5-pro'` but **no stage maps to it and no call site requests it**. The highest-stakes node (`analysis_synthesis`, QUALITY tier) cannot escalate. `synthesize()` already returns `generationQuality` with `meanConfidence`, `lowConfidenceRatio`, `actionabilityScore`, `readerUtilityScore`, `abstainedFields` — real signals to gate on.

### Task 3: Add an escalation path to the analysis phase

- [ ] Give `GeminiService.synthesize` an optional `modelStageOverride?: HunterModelStage` (default `'analysis_synthesis'`) so the model isn't hardcoded at gemini.ts:855.
- [ ] In `analysis.ts`, after the first synthesize, compute a `needsEscalation` boolean from `generationQuality` (e.g. `meanConfidence < T1` OR `lowConfidenceRatio > T2` OR `abstainedFields.length >= T3`). Encode thresholds in a named config map (`ESCALATION_TRIGGERS`), not inline numbers — per `CLAUDE.md`.
- [ ] If triggered AND not already at escalation: re-run synthesize once at the `ESCALATION` tier (add a `STAGE_TIERS` entry or pass a tier override), keep whichever result has the better quality signals, accumulate `tokensUsed`. Hard cap: one escalation attempt.
- [ ] Log `[Escalation] …` with the trigger reason and the before/after quality deltas.
- [ ] Tests: unit-test the trigger predicate against synthetic `generationQuality` objects. Optionally extend the existing eval harness (`npm run eval:hunter`) to confirm no regression on current fixtures.
- [ ] `npm run typecheck && npm run test`; commit.

---

## Hunt (smoke test, after P1+P2)

- [ ] `npm run qa:prepush` green.
- [ ] `npm run queue:worker -- --once` (or `npm run hunt -- --tool="<small tool>" --context="Best for X"`). Confirm: completes, control flow logs read cleanly, `[Escalation]` fires only on weak synthesis, `hunt_telemetry` row written.

---

## Exit Criteria

- Finished plan moved to `completed/`; handoff status accurate.
- Preflight scoring exists once, in a tested pure module; `hunt()` no longer duplicates it.
- Phase-skip flags set via named transitions, not scattered booleans.
- `ESCALATION` tier is reachable: weak synthesis triggers exactly one escalation retry; thresholds live in a named config map; logged and token-accounted.
- `npm run qa:prepush` green; one real hunt completes end-to-end.

## Decision Log

- 2026-06-16: Scope confirmed with Richard as P0 + P1 + P2 before the hunt smoke test. Sentry (observability-vendor-gap) and the persistence `createReview` split deferred — Sentry blocked on a DSN/account decision; persistence split tracked in `docs/plans/tech-debt.md`.
