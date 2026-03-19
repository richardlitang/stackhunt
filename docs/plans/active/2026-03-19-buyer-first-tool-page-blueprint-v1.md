# Feature: Buyer-First Tool Page Blueprint v1

Last verified: 2026-03-19

## Goal

Refactor `/tool/[slug]` into a buyer-first review layout that answers the main decision questions in the first screen, demotes trust chrome, keeps weak-evidence sections suppressed, and uses structured render contracts instead of route-level prose assembly.

## Architecture Overview

This should not be implemented as one more large `tool_page` JSON blob. The repo already has `subject_profile`, `fact_sheet`, `user_signal_sheet`, and `editorial_decision` lane outputs plus a page compiler. The correct path is to extend those lanes only where needed, then compile them into a narrower buyer-facing render contract for the route and components.

The implementation should proceed in four layers:

1. Lock the blueprint and render contract.
2. Extend lane outputs and typed readers for missing buyer-first fields.
3. Recompose the route around a decision layer and a quieter reference layer.
4. Add regression coverage and QA checks so the layout cannot drift back toward generic directory behavior.

## Tech Stack

- Route: `src/pages/tool/[slug].astro`
- Tool-page compiler/runtime: `src/lib/tool-page/*`
- Hunter ETL and persistence: `src/lib/hunter/types.ts`, `src/lib/hunter/evidence-lanes.ts`, `src/lib/hunter/phases/persistence.ts`
- Domain typing: `src/types/database.ts`
- Existing standard docs: `docs/TOOL_PAGE_STANDARD_V1.md`, `docs/TOOL_PAGE_ORCHESTRATION_MAP.md`
- Tests: `tests/lib/*`, `tests/pages/*`, existing `npm run qa:prepush` checks

## Pushback Before Building

Do not mirror the proposed `tool_page:` CMS object 1:1 into persistence yet.

Why:

- It would create a second editorial truth blob beside `entity_first_lane_outputs`.
- The repo is already moving toward subject-first and lane-first ownership.
- The missing problem is render-contract shape, not lack of one more storage bucket.

Instead:

- Persist only the additional lane fields needed for buyer-first sections.
- Compile those fields into a dedicated route/view contract, for example `buyerDecisionLayer` and `buyerReferenceLayer`.
- Keep one canonical owner per rule.

## Working Rules

- Keep the first screen focused on decision-making only.
- Do not let research status or source counters dominate above the fold.
- Do not invent timing, implementation effort, or pricing facts without evidence.
- Do not surface capability inventory before pricing reality, tests, and alternatives.
- Do not render FAQ unless the question helps answer a buying decision.

## Delivery Phases

### Phase 1

Freeze the blueprint and define a typed buyer-facing contract.

### Phase 2

Extend lane outputs for missing fields, but keep ownership with subject/fact/user/editorial lanes.

### Phase 3

Refactor route composition and components around the new decision/reference split.

### Phase 4

Add acceptance tests, QA checks, and route-map updates.

## Gap Table (Current Lane Coverage)

| Blueprint field | Current owner | Status | Notes |
| --- | --- | --- | --- |
| `best_for`, `not_for`, `main_risk/tradeoff` | `editorial_decision` | Present | Already available via lane outputs and decision utility mapping. |
| `upgrade_trigger` | runtime heuristics (`decision_utility`) | Needs canonical field | Should move into persisted lane output to avoid heuristic-only fallbacks. |
| `implementation_friction` | setup/runtime hints | Partial | Needs explicit level plus evidence-backed drivers. |
| `fit_matrix` (solo/startup/mid-market/enterprise) | none | Missing | Requires explicit lane structure, do not infer from one active lens line. |
| `pricing_reality.free_works_if` | pricing/runtime prose | Partial | Convert from narrative to typed field. |
| `pricing_reality.paid_needed_when` | pricing/runtime prose | Partial | Convert from narrative to typed field. |
| `pricing_reality.hidden_cost_triggers` | limits + pricing hints | Partial | Should be canonical field list with evidence references. |
| `test_before_buy` (exactly 3 cards) | decision utility checklist | Partial | Existing checklist exists, but lacks strict 3-card typed contract. |
| `alternatives.choose_instead_if` rebuttal | alternatives runtime | Partial | Existing cards need explicit rebuttal field and confidence. |
| capability inventory states (gated/partial/unavailable) | specs/runtime | Partial | Needs normalized display-state labels and collapse behavior. |
| decision-support FAQ filtering | FAQ runtime | Partial | Add explicit classifier/suppression logic for low-value prompts. |
| compact trust strip + full trust footer | trust runtime | Present | Render split exists conceptually, needs consistent prominence rules. |

## Tasks

### Task 1: Freeze the buyer-first blueprint doc

**Files:**
- Create: `docs/TOOL_PAGE_BLUEPRINT_V1.md`
- Modify: `docs/index.md`

**Action:**
- Write the durable spec for section order, required fields, suppression rules, badge vocabulary, and default open/closed states.
- Fold in the six required buyer questions:
  - best for
  - who should avoid it
  - what breaks first
  - what forces an upgrade
  - rollout difficulty
  - what to compare against
- Make the doc explicitly state `decision layer` vs `reference layer`.

**Verify:**
```bash
rg -n "decision layer|reference layer|fit matrix|pricing reality|test before buy" docs/TOOL_PAGE_BLUEPRINT_V1.md
```

**Commit:** `docs(tool-page): add buyer-first blueprint v1`

---

### Task 2: Tighten the existing standard doc to point at the blueprint

**Files:**
- Modify: `docs/TOOL_PAGE_STANDARD_V1.md`

**Action:**
- Keep `TOOL_PAGE_STANDARD_V1.md` as the normative quality standard.
- Add a short cross-reference to `docs/TOOL_PAGE_BLUEPRINT_V1.md` for layout and render-contract details.
- Avoid duplicating long prose between the two docs.

**Verify:**
```bash
rg -n "TOOL_PAGE_BLUEPRINT_V1" docs/TOOL_PAGE_STANDARD_V1.md
```

**Commit:** `docs(tool-page): link standard to blueprint`

---

### Task 3: Add a typed buyer render contract

**Files:**
- Create: `src/types/tool-page-blueprint.ts`
- Create: `src/lib/tool-page/blueprint-contract.ts`
- Modify: `src/lib/tool-page/index.ts`

**Action:**
- Define typed render shapes for:
  - `heroDecisionCard`
  - `fitMatrix`
  - `pricingReality`
  - `testBeforeBuy`
  - `alternativesRebuttals`
  - `proofBackedProsCons`
  - `referenceBasement`
  - `compactTrustStrip`
- Add field-level evidence metadata where needed:
  - `evidenceType`
  - `confidence`
  - `lastChecked`
  - optional source URL
- Keep this as a compiler output contract, not a persistence schema.

**Verify:**
```bash
npm run typecheck
```

**Commit:** `feat(tool-page): add buyer blueprint render contract`

---

### Task 4: Audit current lane coverage against the blueprint

**Files:**
- Modify: `docs/plans/active/2026-03-19-buyer-first-tool-page-blueprint-v1.md`

**Action:**
- Add a gap table mapping blueprint fields to current lane owners:
  - already present
  - derivable
  - needs new field
- Expected gaps today:
  - fit by buyer type
  - explicit upgrade trigger
  - implementation friction drivers/stakeholders
  - three test cards with pass/fail framing
  - alternatives rebuttal framing

**Verify:**
```bash
rg -n "Gap table|needs new field|fit by buyer type" docs/plans/active/2026-03-19-buyer-first-tool-page-blueprint-v1.md
```

**Commit:** `docs(tool-page): add blueprint field gap audit`

---

### Task 5: Extend hunter lane types for missing buyer fields

**Files:**
- Modify: `src/lib/hunter/types.ts`
- Modify: `src/lib/hunter/evidence-lanes.ts`
- Modify: `src/types/database.ts`
- Modify: `src/lib/tool-page/lane-outputs.ts`

**Action:**
- Extend `editorial_decision` and `fact_sheet` with the minimum new fields needed:
  - `upgrade_trigger`
  - `main_risk`
  - `implementation_friction_level`
  - `implementation_friction_drivers`
  - `fit_matrix`
  - `test_before_buy`
  - `alternatives_rebuttals`
- Keep factual fields in `fact_sheet` when they are factual.
- Keep buyer-fit and framing fields in `editorial_decision`.
- Do not store a second duplicated prose summary if the data is already expressible via typed fields.

**Verify:**
```bash
npm run typecheck
```

**Commit:** `feat(hunter): extend lane types for buyer-first blueprint`

---

### Task 6: Persist the new lane fields without widening fallback behavior

**Files:**
- Modify: `src/lib/hunter/phases/persistence.ts`

**Action:**
- Persist the new lane fields into `entity_first_lane_outputs`.
- Reuse existing evidence-lane discipline.
- Keep nulls when evidence is insufficient.
- Do not add fallback prose generators in persistence.

**Verify:**
```bash
npm run typecheck
npm run test -- tests/lib/tool-page* 2>/dev/null || true
```

**Commit:** `feat(hunter): persist buyer-first lane fields`

---

### Task 7: Add a blueprint compiler from route data to view state

**Files:**
- Create: `src/lib/tool-page/blueprint-runtime.ts`
- Create: `src/lib/tool-page/blueprint-runtime-input.ts`
- Modify: `src/lib/tool-page/page-assembly-route-state.ts`
- Modify: `src/lib/tool-page/page-compiler-route-state.ts`

**Action:**
- Compile the new lane fields plus existing route state into one blueprint runtime output.
- Centralize section suppression here, not in the route template.
- Emit:
  - `decisionLayer`
  - `referenceLayer`
  - `compactTrustStrip`
  - merged navigation state

**Verify:**
```bash
npm run typecheck
```

**Commit:** `feat(tool-page): add buyer-first blueprint runtime`

---

### Task 8: Merge reader controls and quick jump into one navigation module

**Files:**
- Create: `src/components/ToolDecisionToolbar.astro`
- Modify: `src/lib/tool-page/navigation-state.ts`
- Modify: `src/lib/tool-page/quick-jump-links.ts`
- Modify: `src/lib/tool-page/view-model.ts`
- Modify: `src/lib/tool-page/section-order.ts`

**Action:**
- Replace the current split between lens controls and jump links with one toolbar:
  - `View as: General / Solo / Startup / Enterprise`
  - `Jump to: Pricing / Risks / Tests / Alternatives / FAQ`
- Rename focus labels to match the new blueprint language.
- Keep a single mobile-safe compact module.

**Verify:**
```bash
npm run typecheck
npm run build
```

**Commit:** `refactor(tool-page): merge lens and jump navigation`

---

### Task 9: Rebuild the above-the-fold area around one dominant decision card

**Files:**
- Modify: `src/pages/tool/[slug].astro`
- Create: `src/components/ToolImmediateVerdictCard.astro`
- Create: `src/components/ToolCompactTrustStrip.astro`
- Modify: `src/lib/tool-page/trust-bar-props.ts`

**Action:**
- Keep the left side to:
  - tool name
  - one-line description
  - 3-5 tags
  - CTA cluster
- Replace the current right-column `Decision context` box with one dominant verdict card:
  - best for
  - not for
  - main risk
  - upgrade trigger
  - implementation friction
- Move trust/status into a compact strip near that card.
- Remove above-the-fold generic axis copy such as `free-tier fit vs first paid complexity trigger` unless the lane output actually supports it.

**Verify:**
```bash
npm run build
```

**Commit:** `refactor(tool-page): rebuild hero around immediate verdict`

---

### Task 10: Replace the early decision utility block with a fit matrix

**Files:**
- Create: `src/components/ToolFitMatrix.astro`
- Modify: `src/pages/tool/[slug].astro`
- Modify: `src/lib/tool-page/decision-utility.ts`

**Action:**
- Remove the current early summary block as the primary section below the hero.
- Render a buyer-type fit matrix with text plus signal state:
  - solo
  - startup/small team
  - mid-market
  - enterprise
- Keep color/icon plus reason/caveat text.
- If fit evidence is weak, suppress specific rows instead of filling them with template-safe language.

**Verify:**
```bash
npm run build
```

**Commit:** `feat(tool-page): add buyer fit matrix`

---

### Task 11: Refactor pricing into pricing reality

**Files:**
- Create: `src/components/ToolPricingRealitySection.astro`
- Modify: `src/pages/tool/[slug].astro`
- Modify: `src/lib/tool-page/pricing-section.ts`
- Modify: `src/lib/tool-page/pricing.ts`
- Modify: `src/lib/tool-page/pricing-scenarios.ts`

**Action:**
- Replace the current pricing framing with explicit buyer questions:
  - `Free works if...`
  - `Paid becomes necessary when...`
  - `Hidden cost triggers`
  - `Main cost drivers`
  - plan cards
- Keep numeric plan tables when available.
- Preserve the current incomplete-pricing fallback, but phrase it in the new structure.
- Make hidden triggers and upgrade triggers source-backed or explicitly unconfirmed.

**Verify:**
```bash
npm run typecheck
npm run build
```

**Commit:** `refactor(tool-page): convert pricing to pricing reality`

---

### Task 12: Replace generic rollout content with exactly three test cards

**Files:**
- Create: `src/components/ToolBeforeYouBuyTests.astro`
- Modify: `src/pages/tool/[slug].astro`
- Modify: `src/lib/tool-page/decision-utility.ts`
- Modify: `src/components/ToolDecisionUtilitySection.astro`

**Action:**
- Remove the current checklist/common-setup framing as the primary rollout module.
- Render exactly three cards when present:
  - daily workflow test
  - admin/setup test
  - failure/export/edge-case test
- Each card must include:
  - why it matters
  - what to do
  - pass condition
  - common failure
- If fewer than three evidence-backed tests exist, show the section only in non-indexable or pending mode, or suppress it.

**Verify:**
```bash
npm run build
```

**Commit:** `refactor(tool-page): replace rollout checklist with 3 buyer tests`

---

### Task 13: Reframe alternatives as rebuttals

**Files:**
- Modify: `src/components/AlternativeCard.astro`
- Modify: `src/components/AlternativesCompareGrid.astro`
- Modify: `src/lib/tool-page/alternatives-intro.ts`
- Modify: `src/lib/tool-page/alternatives-runtime.ts`
- Modify: `src/pages/tool/[slug].astro`

**Action:**
- Replace generic `Alternatives to X` positioning with buyer rebuttal framing:
  - `Choose X instead if...`
- Require each alternative card to render one concrete angle:
  - cheaper at scale
  - faster setup
  - deeper automation
  - stronger governance
  - better developer control
  - better reporting
- Downgrade heuristic-only alternative claims to pending or suppress them.

**Verify:**
```bash
npm run typecheck
npm run build
```

**Commit:** `refactor(tool-page): frame alternatives as rebuttals`

---

### Task 14: Move capability inventory into the reference basement

**Files:**
- Modify: `src/pages/tool/[slug].astro`
- Modify: `src/components/DynamicSpecs.astro`
- Modify: `src/lib/tool-page/section-flags.ts`

**Action:**
- Move features/specs/platform-heavy content after alternatives and strengths/weaknesses.
- Collapse the capability inventory by default.
- Group capability content by buyer job where possible.
- Label gated/partial/unconfirmed states explicitly.

**Verify:**
```bash
npm run build
```

**Commit:** `refactor(tool-page): demote capability inventory to reference layer`

---

### Task 15: Filter FAQ to decision-support only

**Files:**
- Modify: `src/lib/tool-page/faq-items-view.ts`
- Modify: `src/lib/tool-page/faq.ts`
- Modify: `src/pages/tool/[slug].astro`

**Action:**
- Add filtering rules so FAQ only renders if questions materially support:
  - integrations
  - exports
  - implementation
  - migration
  - controls
  - data ownership
  - limits
  - contracts
- Suppress weak filler such as `What is X?` or `Is X good?`.
- Keep FAQ schema aligned only with visible questions.

**Verify:**
```bash
npm run typecheck
npm run build
```

**Commit:** `feat(tool-page): filter faq to decision-support questions`

---

### Task 16: Build the quieter trust footer and dual trust presentation

**Files:**
- Modify: `src/pages/tool/[slug].astro`
- Modify: `src/components/TrustBar.astro`
- Modify: `src/components/ToolHowWeEvaluateSection.astro`
- Modify: `src/components/ToolWeTestedSection.astro`

**Action:**
- Keep a compact trust strip near the verdict.
- Keep the full trust footer near the bottom with:
  - what we tested
  - what we did not test
  - source types
  - pending claims
  - last checked
  - update history
- Ensure trust is visually quieter than verdict/pricing/tests.

**Verify:**
```bash
npm run build
```

**Commit:** `refactor(tool-page): split compact and full trust presentation`

---

### Task 17: Update SEO and schema parity for the new blueprint

**Files:**
- Modify: `src/lib/tool-page/meta-runtime.ts`
- Modify: `src/lib/tool-page/schemas.ts`
- Modify: `src/pages/tool/[slug].astro`
- Modify: `docs/TOOL_PAGE_QA_GATE_V1.md`

**Action:**
- Ensure page title stays descriptive and concise.
- Ensure meta description reads like a short relevant pitch.
- Verify noindex behavior still respects production publish/index rules.
- Validate structured data against visible content after the section reorder.
- Do not emit FAQ schema when FAQ is suppressed.

**Verify:**
```bash
npm run typecheck
npm run build
npm run qa:prepush
```

**Commit:** `feat(tool-page): align seo and schema with buyer blueprint`

---

### Task 18: Add regression coverage for blueprint acceptance criteria

**Files:**
- Create: `tests/lib/tool-page-blueprint-runtime.test.ts`
- Modify: `tests/lib/tool-page-qa-gate.test.ts`
- Modify: `docs/TOOL_PAGE_ORCHESTRATION_MAP.md` if route composition changes

**Action:**
- Add tests for:
  - immediate verdict card fields
  - merged navigation module
  - pricing reality field presence
  - exactly three test cards when section renders
  - capability inventory collapsed by default
  - FAQ suppression for filler questions
  - compact trust strip plus footer trust section
- Regenerate or update orchestration docs if the route composition changes.

**Verify:**
```bash
npm run test -- tests/lib/tool-page-blueprint-runtime.test.ts
npm run qa:tool-page-map
npm run qa:prepush
```

**Commit:** `test(tool-page): cover buyer-first blueprint runtime`

## Acceptance Checklist

- Above the fold includes:
  - best for
  - not for
  - main risk
  - upgrade trigger
  - implementation friction
- Research/trust status is visually secondary to the verdict.
- Reader controls and quick jump are merged into one compact module.
- Fit matrix renders directly after the hero when evidence is available.
- Pricing uses `free works if`, `paid needed when`, and `hidden cost triggers`.
- Exactly three `before you buy` tests render when the section is visible.
- Alternatives are framed as `Choose this instead if...`.
- Capability inventory is collapsed and positioned in the reference layer.
- FAQ only renders decision-supportive questions.
- Trust appears in compact and expanded forms.
- Title and meta description remain concise and intent-aligned.
- Production pages remain indexable when quality gates pass.
- Structured data stays aligned to visible content.

## Recommended Execution Order

1. Tasks 1-3
2. Tasks 4-7
3. Tasks 8-12
4. Tasks 13-16
5. Tasks 17-18

## Verification Bundle

Run after each batch:

```bash
npm run typecheck
npm run build
```

Run before claiming completion:

```bash
npm run test
npm run qa:prepush
```

## Notes For The Implementer

- Do not start with visual polish. Start with contract and section suppression.
- Do not hardcode buyer-fit prose in the route.
- Do not keep both the current decision utility section and the new three-test section.
- Do not add a new generic fallback layer to patch missing evidence.
- If data is missing for a blueprint field, render an explicit unknown state or suppress the field.
