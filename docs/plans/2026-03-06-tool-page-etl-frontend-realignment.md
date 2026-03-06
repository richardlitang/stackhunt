# Feature: Tool Page ETL + Frontend Realignment

Last verified: 2026-03-06

## Goal

Make `/tool/[slug]` pages product-specific, buyer-useful, and visibly grounded in both official evidence and real user-reported signal.

## Why This Exists

Current tool pages fail in a repeatable way:

- ETL over-extracts generic documented facts.
- user-reported pros and cons are trapped in side channels instead of primary decision surfaces.
- the frontend fills missing product-specific evidence with generic rollout, pricing, and alternative copy.
- complex products like Claude are flattened into one generic SaaS review pattern.

This plan fixes the contract from ETL through rendering, so the page stops sounding complete when the underlying evidence is not.

## Non-Goals

- No full redesign of `/best` or `/compare` in this pass.
- No change to trust, publish, or legal traceability requirements.
- No new third-party dependency unless a later task proves it is necessary.

## Architecture Overview

This work is split into four layers:

1. Research and analysis schema, so the system can store product shape and user-reported evidence explicitly.
2. Persistence and normalization, so that higher-signal fields survive guardrails and reach the route.
3. Frontend section builders and components, so weak generic sections are suppressed instead of invented.
4. QA and rollout gates, so the same template drift cannot silently return.

Cleanup is part of the feature, not a follow-up. New fields and sections should replace weaker legacy paths, not sit beside them indefinitely.

## Target UX Outcome

Above the fold, every tool page should answer these first:

1. What is this product?
2. Which buying path or product surface am I actually evaluating?
3. Who is it best for?
4. What is the primary risk or constraint?
5. What should I test first?

If the system cannot answer those with verified evidence, the page should say that directly instead of rendering polished generic copy.

## Current Frontend Weak Spots

These are the main frontend files currently producing generic fallback behavior:

- `src/lib/tool-page/decision-utility.ts`
- `src/lib/tool-page/alternatives-compare-grid.ts`
- `src/lib/tool-page/alternative-rationale.ts`
- `src/lib/tool-page/review-content.ts`
- `src/components/ProsCons.astro`
- `src/components/ToolDecisionUtilitySection.astro`
- `src/components/ToolPracticalOutcomesSection.astro`
- `src/pages/tool/[slug].astro`

## Current ETL Weak Spots

These are the current ETL and persistence files that need contract changes:

- `src/lib/knowledge-card.ts`
- `src/lib/hunter/types.ts`
- `src/lib/hunter/services/prompts.ts`
- `src/lib/hunter/phases/analysis.ts`
- `src/lib/hunter/phases/persistence.ts`
- `src/lib/tool-page/review-context.ts`

## Likely Redundancy Targets

These need explicit deprecation or cleanup as the new contract lands:

- `reviewContext.userAdvocate.delighters` and `reviewContext.userAdvocate.frustrations` as the primary home for user pros and cons
- `tool.specs.user_signal_summary` as a visible-page dependency rather than a supporting aggregate
- generic `decisionUtilityState` fields that are synthesized without product-specific evidence
- `TOOL_COMPARE_GRID_ROWS` entries that mostly resolve to `Needs confirmation` or heuristic filler
- `TribalKnowledge.astro` when it duplicates user-reported evidence already visible in the primary review body
- route-level duplicated section copy in `src/pages/tool/[slug].astro` that can move into dedicated builders
- stale persistence coverage checks against old schema fields
- any table or JSON payload that preserves only the old structure after the new explicit fields ship

## Phased Plan

### Phase 1: Add Product-Shape Fields To ETL

**Goal:** Stop flattening complex products before page rendering.

### Task 1: Extend knowledge-card schema for product shape

**Files:**

- Modify: `src/lib/knowledge-card.ts`
- Modify: `src/lib/hunter/types.ts`

**Action:**

- Add explicit fields for:
  - `product_surfaces`
  - `buying_modes`
  - `getting_started_paths`
  - `must_know_before_buying`
  - `decision_axes`
  - `plan_family_summary`
- Keep each field serializable and source-traceable.

**Verify:**

```bash
npm run typecheck
```

**Commit:** `feat(etl): add product-shape fields for tool pages`

---

### Task 2: Update analysis prompt to require product-shape output

**Files:**

- Modify: `src/lib/hunter/services/prompts.ts`
- Modify: `src/lib/hunter/services/forensic-framework.ts`

**Action:**

- Require the model to identify product shape before generating verdict language.
- For products with multiple surfaces, require separate bullets for app, API, team, or enterprise when applicable.
- Stop allowing generic fallback if product shape is unresolved.

**Verify:**

```bash
npm run typecheck
```

**Commit:** `feat(hunter): require product-shape extraction before verdict synthesis`

---

### Phase 2: Make User-Reported Pros And Cons First-Class

**Goal:** Put real user pain and delight into visible decision sections, not hidden side channels.

### Task 3: Add explicit user-reported pros and cons to schema

**Files:**

- Modify: `src/lib/knowledge-card.ts`
- Modify: `src/lib/hunter/types.ts`

**Action:**

- Add:
  - `user_reported_pros`
  - `user_reported_cons`
- Each item should carry:
  - `text`
  - `source_url`
  - `source_domain`
  - `source_type`
  - `corroborating_source_count`
  - `claim_confidence_tier`
  - `retrieved_at`

**Verify:**

```bash
npm run typecheck
```

**Commit:** `feat(etl): add user-reported pros and cons fields`

---

### Task 4: Rework prompts so user signal feeds visible review evidence

**Files:**

- Modify: `src/lib/hunter/services/prompts.ts`
- Modify: `src/lib/hunter/prompts/extraction.ts`

**Action:**

- Keep factual pros and cons, but require up to 3 corroborated user-reported pros and cons when community or editorial evidence exists.
- Remove the current rule that effectively relegates subjective signal to `reviewContext.userAdvocate` only.
- Preserve `userAdvocate` as supporting context, not the sole destination for user sentiment.

**Verify:**

```bash
npm run typecheck
```

**Commit:** `feat(hunter): require visible user-reported evidence in review output`

---

### Task 5: Feed deep community content into analysis instead of snippet-only signal

**Files:**

- Modify: `src/lib/hunter/phases/analysis.ts`
- Modify: `src/lib/hunter/phases/research.ts`

**Action:**

- Ensure `tribalDeepContent` or equivalent full-discussion content is actually passed into analysis.
- Treat it as the primary source for user frustrations and repeated workflow praise when available.
- Keep snippet-only fallbacks labeled weaker than full-thread evidence.

**Verify:**

```bash
npm run typecheck
npm run test -- --runInBand analysis
```

**Commit:** `feat(hunter): use deep discussion content for user-signal analysis`

---

### Phase 3: Preserve Signal Through Persistence

**Goal:** Stop losing nuance between analysis output and page rendering.

### Task 6: Persist new product-shape and user-signal fields without flattening

**Files:**

- Modify: `src/lib/hunter/phases/persistence.ts`

**Action:**

- Persist all new product-shape fields.
- Persist `user_reported_pros` and `user_reported_cons` alongside legacy pros and cons.
- Keep `user_signal_summary` as an aggregate, but stop treating it as a substitute for actual claims.

**Verify:**

```bash
npm run typecheck
```

**Commit:** `feat(persistence): persist product-shape and user-signal evidence`

---

### Task 7: Relax destructive filtering that drops buyer-useful user pain

**Files:**

- Modify: `src/lib/hunter/phases/persistence.ts`

**Action:**

- Remove or narrow the current logic that keeps frustrations only when they match cons too closely.
- Preserve nuanced user complaints if they are corroborated, even when they do not map cleanly to official constraints.
- Keep traceability requirements intact.

**Verify:**

```bash
npm run test -- --runInBand persistence
npm run typecheck
```

**Commit:** `fix(persistence): preserve corroborated user frustrations and delighters`

---

### Task 8: Update coverage-gap detection to match current schema and new fields

**Files:**

- Modify: `src/lib/hunter/phases/persistence.ts`

**Action:**

- Replace stale checks against old fields.
- Add missing-data detection for:
  - product shape
  - must-know-before-buying
  - start paths
  - user-reported pros/cons
- Trigger re-hunt or visible “insufficient evidence” states when these are missing.

**Verify:**

```bash
npm run test -- --runInBand persistence
npm run typecheck
```

**Commit:** `fix(persistence): align coverage-gap detection to current tool-page contract`

---

### Task 8.5: Create a deprecation map for old fields and payloads

**Files:**

- Modify: `docs/DECISIONS.md` if a durable migration rule is needed
- Add or update: this plan file during implementation

**Action:**

- Record which fields are:
  - canonical and kept
  - transitional and read-only
  - deprecated and removable after migration
- At minimum classify:
  - `reviewContext.userAdvocate.delighters`
  - `reviewContext.userAdvocate.frustrations`
  - `tool.specs.user_signal_summary`
  - legacy generic decision-utility fallback outputs

**Verify:**

```bash
rg -n "user_signal_summary|userAdvocate|decisionUtilityState" src/lib src/pages src/components
```

**Commit:** `docs(tool-page): map deprecated fields and transitional payloads`

---

### Phase 4: Rebuild Frontend Section Contracts

**Goal:** Make the page reflect product shape and evidence quality instead of generic fallbacks.

### Task 9: Add a dedicated hero/top-block builder driven by product shape

**Files:**

- Add: `src/lib/tool-page/top-block.ts`
- Modify: `src/pages/tool/[slug].astro`
- Modify: `src/lib/tool-page/index.ts`

**Action:**

- Build a single source of truth for the top block:
  - one-sentence positioning
  - which product surface is being evaluated
  - who it is best for
  - primary constraint
  - first test step
- Pull only from verified product-shape and evidence fields.
- If missing, show an explicit partial-evidence state.

**Verify:**

```bash
npm run typecheck
npm run build
```

**Commit:** `feat(tool-page): add product-shape-driven top block builder`

---

### Task 10: Split visible strengths and weaknesses into documented vs user-reported

**Files:**

- Modify: `src/components/ProsCons.astro`
- Modify: `src/lib/tool-page/review-content.ts`
- Modify: `src/pages/tool/[slug].astro`

**Action:**

- Support two visible evidence groups:
  - `Documented strengths and limits`
  - `What users like and dislike`
- Preserve source chips and evidence labels.
- Deduplicate across groups while keeping user-signal visible.
- If user-reported claims are unavailable, show a clear absence state instead of backfilling with docs-only copy.

**Verify:**

```bash
npm run typecheck
npm run build
```

**Commit:** `feat(tool-page): separate documented and user-reported pros-cons`

---

### Task 11: Replace generic decision utility fallbacks with evidence-gated builders

**Files:**

- Modify: `src/lib/tool-page/decision-utility.ts`
- Modify: `src/components/ToolDecisionUtilitySection.astro`
- Modify: `src/components/ToolPracticalOutcomesSection.astro`

**Action:**

- Stop using category-only generic fallbacks as the default.
- Build checklist items, common setups, and practical outcomes from:
  - product surfaces
  - getting started paths
  - decision axes
  - must-know-before-buying
  - lens-specific plan-family data
- If evidence is too thin, collapse the section and show a short explicit note.

**Verify:**

```bash
npm run typecheck
npm run build
```

**Commit:** `refactor(tool-page): gate decision utility on product-specific evidence`

---

### Task 12: Add product-archetype routing for frontend section behavior

**Files:**

- Add: `src/lib/tool-page/product-archetype.ts`
- Modify: `src/lib/tool-page/view-model.ts`
- Modify: `src/pages/tool/[slug].astro`

**Action:**

- Introduce at least these archetypes:
  - `single_surface_saas`
  - `product_family_platform`
  - `api_first_devtool`
  - `team_enterprise_workflow`
- Use archetype to control:
  - top-block structure
  - default section order
  - section labels
  - getting-started framing
  - pricing framing

**Verify:**

```bash
npm run typecheck
npm run build
```

**Commit:** `feat(tool-page): add product archetype rendering strategy`

---

### Task 13: Fix getting-started to support multiple entry paths

**Files:**

- Modify: `src/components/GettingStarted.astro`
- Modify: `src/pages/tool/[slug].astro`
- Modify: any supporting lib file if extraction is needed

**Action:**

- Support multiple start paths like:
  - use the app
  - install the code tool
  - start with the API
  - start a team workspace
- Show persona-appropriate paths based on lens and product shape.

**Verify:**

```bash
npm run typecheck
npm run build
```

**Commit:** `feat(tool-page): support multi-path getting-started flows`

---

### Task 14: Rebuild pricing framing around plan families and lens relevance

**Files:**

- Modify: `src/lib/tool-page/pricing-scenarios.ts`
- Modify: `src/pages/tool/[slug].astro`
- Modify: pricing-related components as needed

**Action:**

- Distinguish between:
  - individual plans
  - startup/team plans
  - enterprise plans
  - API usage pricing where relevant
- Filter and prioritize pricing mental models and plan cards by active lens and plan-family tags.
- Stop rendering generic seat/workspace heuristics when they are not product-appropriate.

**Verify:**

```bash
npm run typecheck
npm run build
```

**Commit:** `feat(pricing): align plan-family framing to lens and product shape`

---

### Task 15: Suppress low-signal alternatives instead of presenting heuristic filler

**Files:**

- Modify: `src/lib/tool-page/alternatives-compare-grid.ts`
- Modify: `src/lib/tool-page/alternative-rationale.ts`
- Modify: `src/pages/tool/[slug].astro`

**Action:**

- Require stronger evidence for compare-grid rows.
- Hide rows that are mostly `Needs confirmation` or generic heuristics.
- Keep “choose this instead if” only when there is actual comparison evidence or a high-signal curated brief.

**Verify:**

```bash
npm run typecheck
npm run build
```

**Commit:** `refactor(alternatives): suppress low-signal comparison filler`

---

### Phase 4.5: Frontend Cleanup And Removal

**Goal:** Remove UI and route code that the new builders make unnecessary.

### Task 15.5: Remove duplicated or redundant visible sections

**Files:**

- Modify: `src/pages/tool/[slug].astro`
- Modify: any affected components under `src/components/`

**Action:**

- Remove duplicated visible “What it does in practice” surfaces when the new practical outcomes section is canonical.
- Remove secondary narrative blocks that repeat top-block or verdict content without adding new evidence.
- Collapse or delete sections whose only output is generic filler.

**Verify:**

```bash
npm run build
node scripts/qa-rendered-tool-pages.mjs
```

**Commit:** `refactor(tool-page): remove redundant visible sections`

---

### Task 15.6: Simplify route wiring after builder extraction

**Files:**

- Modify: `src/pages/tool/[slug].astro`
- Modify: `src/lib/tool-page/index.ts`

**Action:**

- Remove route-local data shaping that is superseded by new builder modules.
- Keep the route orchestration-only where possible.
- Reduce duplicate props and one-off display flags that become unnecessary.

**Verify:**

```bash
npm run typecheck
npm run build
```

**Commit:** `refactor(tool-page): simplify route wiring after builder extraction`

---

### Phase 5: Data And Schema Cleanup

**Goal:** Remove stale fields, transitional payloads, and persistence branches once replacements are live.

### Task 16: Remove primary-page dependence on legacy user-advocate storage

**Files:**

- Modify: `src/lib/tool-page/review-context.ts`
- Modify: `src/lib/tool-page/tribal-knowledge-props.ts`
- Modify: any ETL or persistence files still reading legacy user-only fields for main page sections

**Action:**

- Keep `userAdvocate` only for supporting context like vibe or narrative color if still useful.
- Stop using it as the main source for visible pros and cons once `user_reported_pros` and `user_reported_cons` are live.
- Mark remaining userAdvocate-only fields as transitional or supporting.

**Verify:**

```bash
rg -n "userAdvocate" src/lib src/pages src/components
npm run typecheck
```

**Commit:** `refactor(tool-page): demote legacy userAdvocate dependence`

---

### Task 17: Remove obsolete generic decision-utility structures

**Files:**

- Modify: `src/lib/tool-page/decision-utility.ts`
- Modify: `src/components/ToolDecisionUtilitySection.astro`
- Modify: `src/components/ToolPracticalOutcomesSection.astro`

**Action:**

- Remove builder branches whose only purpose is generic fallback prose.
- Delete unused state fields once product-specific builders become canonical.
- Ensure no UI element survives only because the old state shape required it.

**Verify:**

```bash
rg -n "commonSetups|pricingMentalModelItems|practicalOutcomes" src/lib src/components src/pages
npm run typecheck
```

**Commit:** `refactor(tool-page): remove obsolete generic decision utility branches`

---

### Task 18: Retire low-value heuristic alternatives rows

**Files:**

- Modify: `src/lib/tool-page/alternatives-compare-grid.ts`
- Modify: `src/components/AlternativesCompareGrid.astro`

**Action:**

- Delete compare-grid rows that do not survive the stronger evidence threshold.
- Remove UI copy that normalizes weak heuristic rows as acceptable default content.
- Keep only rows that routinely deliver actual decision value.

**Verify:**

```bash
npm run build
node scripts/qa-rendered-tool-pages.mjs
```

**Commit:** `refactor(alternatives): remove low-value heuristic grid rows`

---

### Task 19: Remove stale persistence branches and fallback serializers

**Files:**

- Modify: `src/lib/hunter/phases/persistence.ts`
- Modify: `src/lib/hunter/services/gemini.ts`
- Modify: any test fixtures relying on removed shapes

**Action:**

- Remove compatibility branches that only exist for the old visible-page contract after migration is complete.
- Delete dead sanitization code that filtered toward obsolete shapes.
- Keep backward-compatibility only where historical published data still requires a read path.

**Verify:**

```bash
npm run test
npm run typecheck
```

**Commit:** `refactor(persistence): remove stale fallback branches`

---

### Phase 6: Add QA Gates So The Problem Does Not Return

**Goal:** Turn repeated review feedback into mechanical enforcement.

### Task 20: Add tool-page QA checks for product specificity and weak filler

**Files:**

- Modify: `src/lib/tool-page-qa-gate.ts`
- Modify: `scripts/qa-rendered-tool-pages.mjs`
- Add or modify tests under `tests/`

**Action:**

- Add blockers or warnings for:
  - generic top-block positioning
  - pros/cons with no user-reported evidence when community data exists
  - decision-utility sections built from fallback copy
  - alternatives grids dominated by heuristic or pending rows
  - pages missing product-surface differentiation when the product is multi-surface

**Verify:**

```bash
npm run test
node scripts/qa-rendered-tool-pages.mjs
```

**Commit:** `feat(qa): enforce product-specific and user-signal quality gates`

---

### Task 21: Add cleanup-oriented regression tests

**Files:**

- Add or modify tests for:
  - `src/lib/tool-page/top-block.ts`
  - `src/lib/tool-page/decision-utility.ts`
  - `src/lib/tool-page/review-content.ts`
  - `src/lib/tool-page/product-archetype.ts`
  - persistence and prompt normalization test files as needed

**Action:**

- Cover at least:
  - single-surface SaaS case
  - multi-surface platform case
  - docs-only weak-evidence case
  - user-reported evidence present case
  - lens-filtered pricing case
  - no duplicate visible sections after cleanup
  - no heuristic alternatives grid rows when evidence is below threshold

**Verify:**

```bash
npm run test
npm run typecheck
```

**Commit:** `test(tool-page): cover product-shape and user-signal rendering`

---

### Phase 7: Pilot And Rollout

**Goal:** Validate the new contract on representative pages before wider rollout.

### Task 22: Pilot on one simple SaaS page and one multi-surface page

**Files:**

- No template additions required beyond shipped code

**Action:**

- Re-run the pipeline and render QA for:
  - one simple single-surface SaaS page
  - Claude as the multi-surface stress test
- Compare pre/post:
  - top-block clarity
  - visible user signal
  - section suppression behavior
  - pricing relevance by lens

**Verify:**

```bash
npm run hunt -- --tool="Claude"
npm run build
node scripts/qa-rendered-tool-pages.mjs
```

**Commit:** `chore(tool-page): run product-shape and user-signal pilot`

---

### Task 23: Promote rollout gate for tool pages

**Files:**

- Modify: CI or policy gate scripts as needed
- Update: `docs/TOOL_PAGE_ORCHESTRATION_MAP.md` if route composition changes

**Action:**

- Make the new checks part of normal pre-push and content QA for `/tool` pages.
- Keep scope limited to tool pages in this rollout.

**Verify:**

```bash
npm run qa:prepush
```

**Commit:** `feat(ci): enforce realigned tool-page quality contract`

## Frontend Acceptance Criteria

The frontend is successful when all of these are true:

- The hero/top block explains the actual product shape in less than 10 seconds.
- The page shows documented evidence and user-reported evidence as separate, legible signals.
- Generic rollout checklists do not render unless product-specific evidence supports them.
- Pricing changes meaningfully by lens and plan family.
- Getting-started paths match the actual ways users begin with the product.
- Alternatives do not show low-signal heuristic filler.
- old duplicate sections and generic filler UI elements are removed, not merely hidden behind new ones

## ETL Acceptance Criteria

The ETL is successful when all of these are true:

- Multi-surface products retain product-shape fields through persistence.
- user-reported pros and cons are first-class fields, not just `userAdvocate` side content.
- deep community discussions inform visible user-signal claims.
- coverage-gap detection fails when core buyer fields are absent.
- transitional fields and persistence branches have a documented cleanup path

## Verification Commands

Run after each meaningful batch:

```bash
npm run typecheck
npm run build
npm run test
```

Before push:

```bash
npm run qa:prepush
```

## Recommended Execution Order

1. ETL schema and prompt changes
2. persistence and coverage-gap fixes
3. frontend top-block and pros/cons split
4. decision utility and pricing archetype work
5. cleanup of redundant sections, route wiring, and stale data paths
6. alternatives suppression and QA gates
7. pilot regeneration

## Risks

- Tight gating may initially hide too many sections on weak pages.
- Prompt/schema changes may reduce coverage before new hunts refill data.
- Existing published pages may expose how much generic filler they relied on.
- cleanup may break hidden dependencies on old fields if the deprecation map is incomplete

## Mitigation

- Roll out with explicit “insufficient verified product-specific evidence” states.
- Pilot on representative pages before broad backfill.
- Keep QA warnings visible before promoting every new rule to hard fail.
- remove old fields only after the new builders and migration read paths are verified
