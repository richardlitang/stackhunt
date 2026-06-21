# Baseline Test Drift Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the seven handed-over baseline tests without reverting intentional tool-page trust, visibility, or orchestration behavior.

**Architecture:** Treat the failures as contract drift. Update fixtures and assertions to the current canonical runtime and lane-output contracts, keep production modules unchanged, and regenerate the checked orchestration map only if its generator output differs.

**Tech Stack:** TypeScript, Vitest, Astro, Node.js documentation scripts

## Global Constraints

- Preserve source-backed decision-layer suppression for fields without deterministic or extractive generation modes.
- Preserve retirement of the legacy decision utility section.
- Do not change production behavior unless focused verification disproves the fixture-drift diagnosis.
- Keep the dirty root checkout untouched and work only in the existing linked worktree.

---

### Task 1: Align route-state and runtime fixtures

**Files:**

- Modify: `tests/lib/tool-page-page-assembly-route-state.test.ts`
- Modify: `tests/lib/tool-page-decision-navigation-route-state.test.ts`
- Modify: `tests/lib/tool-page-runtime-context.test.ts`
- Modify: `tests/lib/tool-page-section-runtime-input.test.ts`

**Interfaces:**

- Consumes: Current return contracts from page assembly, decision presentation, runtime params, and knowledge-card presence helpers.
- Produces: Fixtures that exercise those contracts without relying on removed fields or non-canonical schema keys.

- [x] **Step 1: Use the existing four failing tests as the RED evidence**

Run: `npx vitest run tests/lib/tool-page-page-assembly-route-state.test.ts tests/lib/tool-page-decision-navigation-route-state.test.ts tests/lib/tool-page-runtime-context.test.ts tests/lib/tool-page-section-runtime-input.test.ts`

Expected: four failures matching the full-suite baseline.

- [x] **Step 2: Apply the minimal fixture and assertion corrections**

Add the omitted `alternativeCardsView` mock output, expect the intentionally retired decision utility section to remain hidden, mark the compact runtime fixture's source-backed decision signals as present, and use canonical security and portability field names.

- [x] **Step 3: Verify the route-state and runtime tests pass**

Run the same focused Vitest command.

Expected: all tests pass.

### Task 2: Align decision-layer and publish-gate fixtures

**Files:**

- Modify: `tests/lib/tool-page-blueprint-runtime.test.ts`
- Modify: `tests/lib/review-publish-gate.test.ts`

**Interfaces:**

- Consumes: `ToolPageLaneOutputs` generation-mode contract and operational pricing-signal sanitizer.
- Produces: Source-backed fixtures that continue testing three-item truncation, lane-native rendering, and contradiction blockers.

- [x] **Step 1: Use the existing two failing tests as the RED evidence**

Run: `npx vitest run tests/lib/tool-page-blueprint-runtime.test.ts tests/lib/review-publish-gate.test.ts`

Expected: blueprint suppression and duplicate-pricing assertion failures.

- [x] **Step 2: Apply the minimal lane fixture corrections**

Declare deterministic or extractive generation modes for the blueprint fields under test. Use duplicate pricing text containing canonical operational signals so lane normalization preserves it for consistency analysis.

- [x] **Step 3: Verify the decision-layer tests pass**

Run the same focused Vitest command.

Expected: all tests pass.

### Task 3: Align orchestration-map coverage and verify integration

**Files:**

- Modify: `tests/lib/tool-page-orchestration-map.test.ts`
- Modify if generated output differs: `docs/TOOL_PAGE_ORCHESTRATION_MAP.md`
- Modify: `docs/superpowers/plans/2026-06-19-tool-page-verdict-HANDOVER.md`

**Interfaces:**

- Consumes: One-level dependency output from `generateToolPageOrchestrationMapMarkdown(rootDir)`.
- Produces: Assertions for the current route compiler boundary and an updated handover status.

- [x] **Step 1: Replace stale deep-helper expectations**

Assert the current route compiler and its one-level route-data and page-assembly dependencies instead of helpers now hidden two levels below the route.

- [x] **Step 2: Verify and regenerate the orchestration map**

Run: `npm run qa:tool-page-map`

Expected: pass. If stale, run `npm run docs:tool-page-map`, then rerun the check.

- [x] **Step 3: Run complete verification**

Run: `npm test`

Expected: 708 tests pass with zero failures.

Run: `npm run qa:prepush`

Expected: pass.

- [x] **Step 4: Update the handover and commit**

Record the green suite and cleanup commit, stage only the plan, handover, affected tests, and generated map if changed, then commit with a conventional test-fix message.
