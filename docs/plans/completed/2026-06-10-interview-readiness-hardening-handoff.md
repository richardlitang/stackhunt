# Interview-Readiness Hardening Handoff

Last verified: 2026-06-10

## Purpose

This is the operator handoff for the interview-readiness hardening workstream. Use it when continuing in another thread, another agent session, or after context reset.

The execution plan lives in [2026-06-10-interview-readiness-hardening.md](./2026-06-10-interview-readiness-hardening.md).

## What This Work Is Actually Solving

The repo currently has a credibility mismatch between what it claims and what the codebase proves:

- top-level docs are stale
- `src/lib/hunter/phases/persistence.ts` is still a 5,334-line coordination hotspot
- prompt changes are not versioned or drift-checked
- there is no frozen-fixture eval harness for LLM output quality
- research gaps are detected too late, after spend, instead of during research
- hunt cost telemetry is computed but not persisted

This plan closes those gaps without changing product behavior unnecessarily.

## The Execution Shape

The plan is deliberately split into five shippable phases and 13 tasks:

1. Phase 0, docs hygiene
2. Phase 1, extract pure modules out of `persistence.ts`
3. Phase 2, add prompt registry + fingerprint drift enforcement
4. Phase 3, add fixture capture, golden files, and replay scoring
5. Phase 4, add adaptive follow-up research queries
6. Phase 5, persist per-hunt telemetry and add cost reporting

The plan itself already tells the executing agent how to work:

- use `superpowers:subagent-driven-development` if available
- otherwise use `superpowers:executing-plans`
- run `npm run typecheck && npm run test` per task unless the task specifies a narrower check
- run `npm run qa:prepush` at the end of each phase
- do verbatim moves only in Phase 1, no opportunistic cleanup during extraction

## Current Status

- **COMPLETE (2026-06-16).** All 5 phases / 13 tasks landed. Plan moved to `docs/plans/completed/`.
- Landing commits: Phase 1 persistence split + Phase 2 prompt registry (persistence.ts 5,334 → 4,527 lines; `claim-language.ts`, `coverage-gaps.ts`, `text-similarity.ts`, `prompts/registry.ts` all present), Phase 3 eval harness (`cd7362c`), Phase 4 adaptive research (`bc4e14e`), Phase 5 telemetry + cost report (`134a86c`, `d6a7958`).
- Follow-on work (orchestrator state-machine refactor + ESCALATION wiring) tracked in `docs/plans/active/2026-06-16-orchestrator-escalation-hardening.md`.

Latest commit when this handoff was created:

- `4d852f7` (plan authored). Implementation completed through `d6a7958`.

## First Slice To Execute

Start with Phase 0, not Phase 1.

The first implementation slice should be:

1. Task 1, fix `README.md` drift against `PRODUCT_SUMMARY.md`
2. Task 2, move one-off scratch docs into `docs/archive/`

Reason:

- it immediately improves first impressions
- it is low-risk
- it validates repo conventions before touching hunter internals

After that, move straight into Task 3. Do not skip ahead to prompt registry or eval harness before Phase 1 extracts land.

## The Most Important Constraints

- Do not invent new architecture beyond the written plan.
- In Phase 1, extracted functions/constants move verbatim. Let `tsc` tell you what else must move.
- Do not broaden scope into `gemini.ts`, `serper.ts`, or extra persistence splits beyond what Task 6 records in tech debt.
- Do not hand-edit generated Supabase types.
- If a migration is applied in Phase 5, regenerate DB types and check advisors.
- Keep published behavior stable. This plan is about hardening and observability, not rewriting hunt semantics.

## Files The Next Agent Should Read First

- [2026-06-10-interview-readiness-hardening.md](/Users/richardlitang/code/personal/stackhunt/docs/plans/active/2026-06-10-interview-readiness-hardening.md)
- [README.md](/Users/richardlitang/code/personal/stackhunt/README.md)
- [PRODUCT_SUMMARY.md](/Users/richardlitang/code/personal/stackhunt/PRODUCT_SUMMARY.md)
- [src/lib/hunter/phases/persistence.ts](/Users/richardlitang/code/personal/stackhunt/src/lib/hunter/phases/persistence.ts)
- [src/lib/hunter/phases/analysis.ts](/Users/richardlitang/code/personal/stackhunt/src/lib/hunter/phases/analysis.ts)
- [src/lib/hunter/phases/research.ts](/Users/richardlitang/code/personal/stackhunt/src/lib/hunter/phases/research.ts)
- [src/lib/hunter/orchestrator.ts](/Users/richardlitang/code/personal/stackhunt/src/lib/hunter/orchestrator.ts)
- [docs/plans/tech-debt.md](/Users/richardlitang/code/personal/stackhunt/docs/plans/tech-debt.md)
- [docs/plans/README.md](/Users/richardlitang/code/personal/stackhunt/docs/plans/README.md)

## Verification Standard

Minimum during execution:

- `npm run typecheck`
- `npm run test`

Per phase:

- `npm run qa:prepush`

Targeted checks called out in the plan are part of the contract, especially:

- characterization tests for Phase 1 extractions
- prompt fingerprint drift test in Phase 2
- `npm run eval:hunter` baseline green in Phase 3
- real hunt smoke checks in Phases 1, 4, and 5

## Likely Failure Modes

- Phase 1 turns into "cleanup while moving". That would create review noise and invalidate the characterization-test strategy.
- The eval harness may fail on real fixture shape, because the draft script skeleton assumes `phase_checkpoint.research.scoutResult` and `knowledgeCard`. Verify against real rows before locking the fixture format.
- The analysis replay script may guess the wrong `AnalysisOutput` shape. Read the actual return type and `ClaimWithSource` fields before wiring metrics.
- Adaptive research follow-up may need token/query accounting merged from the second `serper.scout` call. Confirm with the real `SerperService.scout` signature.
- Phase 5 touches schema and runtime. If DB types or advisors are skipped, the implementation is incomplete.

## Done Means

Use the plan's Exit Criteria as the source of truth. In practical terms, the work is not done until:

- the docs are accurate
- `persistence.ts` is materially smaller and its extracted logic has characterization coverage
- prompt edits are versioned and drift-enforced
- analysis replay is measurable against frozen fixtures
- research can fill lane gaps before extraction
- hunt telemetry is persisted and reportable

Use this handoff to start the next execution thread. The first slice should be README/doc cleanup, then the Phase 1 extractions in plan order.
