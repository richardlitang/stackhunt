# Entity-First Tool Page Rebuild

Last verified: 2026-03-07

## Goal

- Rebuild the tool-review system so each page answers one clean decision question, using one resolved product entity, one explicit evidence ladder, and one buyer-useful page structure.

## Scope

- In scope:
  - Rework tool-page architecture around a canonical review subject instead of a loosely scoped item.
  - Separate official facts, user signals, and editorial synthesis in ETL and persistence.
  - Redesign `/tool/[slug]` rendering around decision-first sections and section suppression.
  - Plan cleanup for redundant fields, legacy UI, and fallback generators that are now causing drift.
- Out of scope:
  - Full redesign of `/best` and `/compare` in the first pass.
  - New third-party dependencies unless a later implementation task proves they are necessary.
  - Publishing new schema or product taxonomy until the subject model is settled and verified.

## Why The Current System Misses

- The route is page-first, not subject-first. It builds a page from whatever facts and reviews are attached to an `item`, then chooses the freshest review, even when the item represents multiple product surfaces.
- Entity scope exists in the queue and search layer, but not as a first-class page contract. GitHub, GitHub Copilot, GitHub Actions, and GitHub Enterprise can all leak into one rendered review.
- The prompt asks for product facts, user sentiment, pricing guidance, and editorial verdicts in one synthesis pass. That makes contamination between evidence tiers more likely.
- User-reported pros and cons exist, but they are still treated as side-channel enrichments rather than a primary decision input.
- The frontend has too many generic fallback builders. When product-specific evidence is weak, the page still sounds polished instead of clearly incomplete.
- The data model stores similar truth in too many places, especially `items.specs`, `items.review_context`, `reviews`, and claim-derived rollups.

## Target System

### 1. Canonical review subject

Every `/tool/[slug]` page should resolve to one `review_subject`:

- `product`
- `product_surface`
- `plan_family`
- `deployment_mode`

Examples:

- GitHub
- GitHub Copilot
- GitHub Actions
- GitHub Enterprise Cloud

The page URL should map to one dominant subject. If multiple subjects are relevant, they should be handled as related entities, not merged into one verdict.

### 2. Explicit evidence ladder

Every visible claim must be typed into one of these lanes:

- `official_fact`
- `official_pricing`
- `official_limit`
- `hands_on_observation`
- `editorial_summary`
- `user_signal`
- `editorial_inference`

Rules:

- Verdict, pricing, plan gating, and hard limits must anchor to official or hands-on evidence.
- User signals may shape pros, cons, rollout warnings, and buyer-fit language, but not replace official truth for plans or capabilities.
- Editorial inference may summarize but cannot invent missing detail.

### 3. Split synthesis by concern

Replace the single blended review synthesis with four outputs:

- `subject_profile`: what the product is, what surface is being reviewed, what adjacent surfaces exist
- `fact_sheet`: official capabilities, pricing triggers, hard limits, rollout requirements
- `user_signal_sheet`: repeated user praise, repeated user pain, corroboration counts, channels, recency
- `editorial_decision`: best fit, weak fit, key tradeoff, what to test, alternatives framing

### 4. Decision-first page compiler

The page should compile in this order:

- Hero
- Verdict in 30 seconds
- Real-world use cases
- Pricing and upgrade triggers
- Rollout checklist
- Strengths and limitations
- Alternatives by comparison type
- Evidence and methodology

If a section lacks enough evidence, suppress it. Do not fill the gap with generic SaaS copy.

## Root-Cause Findings Mapped To Code

- `src/lib/tool-page/data.ts`
  - Loads all reviews for an item and uses freshness-based selection, not subject-fit selection.
- `src/lib/supabase.ts`
  - `getItemBySlugAndType()` hydrates `reviews(*)` without a subject-scope filter.
- `src/lib/hunter/services/prompts.ts`
  - Asks one synthesis pass to produce global pros/cons, verdicts, review context, and user sentiment together.
- `src/lib/hunter/phases/analysis.ts`
  - Builds one analysis object from mixed source buckets, then backfills decision intro from those mixed claims.
- `src/lib/hunter/phases/persistence.ts`
  - Persists user signal, review context, global pros/cons, and derived constraints into overlapping structures.
- `src/lib/tool-page/decision-utility.ts`
  - Generates buyer-facing sections from lens and category heuristics even when product-specific evidence is thin.
- `src/lib/tool-page/pros-cons-view.ts`
  - Merges factual pros/cons and user-reported claims into one display list, which weakens the evidence story.
- `src/pages/tool/[slug].astro`
  - Still composes too many section systems from a broad runtime bundle and is forced to render around mixed-quality inputs.

## Data Model Direction

### Introduce a canonical review subject layer

Prefer a new subject-level record over further stretching `items`:

- `review_subjects`
  - `id`
  - `item_id`
  - `subject_type`
  - `subject_key`
  - `display_name`
  - `slug_override`
  - `is_primary`
  - `parent_subject_id`
  - `status`

- `review_subject_aliases`
  - maps ambiguous tool names and search scopes to one subject

- `review_subject_relationships`
  - `product`
  - `product_surface`
  - `compare_to`
  - `suite_member`
  - `plan_family`

### Normalize claims by lane

Either extend `claims` or create a subject-scoped variant with:

- `review_subject_id`
- `evidence_lane`
- `claim_role`
- `scope`
- `source_url`
- `source_type`
- `source_channel`
- `corroboration_count`
- `fresh_until`
- `volatility`

### Reduce overlapping JSON blobs

Candidates for cleanup after the new subject model lands:

- `items.review_context`
- `items.specs.pros`
- `items.specs.cons`
- `items.specs.user_reported_pros`
- `items.specs.user_reported_cons`
- duplicated pricing rollups that can be compiled from one canonical source

## Frontend Direction

### Replace section inflation with a fixed decision skeleton

Keep a strict section contract:

- hero
- verdict
- use-cases
- pricing
- rollout checks
- strengths and limitations
- alternatives
- evidence

Everything else should be optional and evidence-gated.

### Make lens behavior substantive

Lens should rewrite content, not just reorder sections.

- `solo`
  - self-serve setup
  - paid threshold
  - workflow simplicity
- `startup`
  - seat growth
  - permissions
  - CI or automation rollout
- `enterprise`
  - governance
  - migration
  - procurement and controls

### Remove or demote low-value UI

Candidates for removal or de-emphasis:

- source-count bragging above the fold
- overlong capability inventory blocks
- heuristic-heavy compare rows with little evidence
- duplicated rollout and pricing prose across sections
- side-channel “tribal knowledge” blocks when the same evidence belongs in strengths, limitations, or rollout checks

## Cleanup Plan

### Code cleanup

- Thin `src/pages/tool/[slug].astro` further by moving page assembly to a smaller compiler entrypoint.
- Break `@/lib/tool-page` into clearer domains:
  - `subject/`
  - `evidence/`
  - `decision/`
  - `pricing/`
  - `alternatives/`
  - `render/`
- Retire builders that exist only to generate generic fallback text.

### Schema cleanup

- Decide whether review truth lives on `reviews`, `items`, or `review_subjects`, then remove mirrored storage.
- Remove or deprecate stale JSON payloads once the subject compiler owns output.
- Add a schema version to any surviving compiled JSON structures.

### UI cleanup

- Remove sections that only exist because the template expects them.
- Suppress sections when evidence is thin, instead of rendering placeholders or procedural filler.
- Group alternatives by comparison axis rather than one flat list.

## Phased Execution

### Phase 1: Subject resolution contract

- [x] Add a `review_subject` plan and schema proposal with migration sketch (`npm run typecheck`)
- [x] Teach hunt preflight to resolve or require one canonical subject for ambiguous products (`npm run test -- tests/lib/hunter-analysis-schema.test.ts && npm run typecheck`)
- [x] Add subject-aware review selection for tool pages (`npm run test -- tests/lib/tool-page-qa-gate.test.ts && npm run typecheck`)

### Phase 2: Evidence-lane ETL

- [~] Split analysis output into fact sheet, user signal sheet, and editorial decision output (`npm run typecheck && npm run test`)
- [~] Update prompts to stop blending official facts and user sentiment into one global claim list (`npm run typecheck && npm run test`)
- [x] Persist user signals as first-class evidence, not just review context flavor (`npm run typecheck && npm run test`)

Notes:

- 2026-03-07 progress: added lane envelope contracts (`subject_profile`, `fact_sheet`, `user_signal_sheet`, `editorial_decision`) to hunter analysis output and canonical persistence payloads.
- 2026-03-07 progress: tool-page runtime now reads persisted lane outputs and uses lane user-signal claims in quality-state coverage gating.
- 2026-03-07 progress: analysis now normalizes mixed claims into strict lanes before decision rendering (factual in `pros/cons`, user signals in `userReported*`), and logs lane-move telemetry.
- 2026-03-07 progress: schema validation now blocks publish when factual lanes and user-signal lanes are contaminated.
- 2026-03-13 progress: added review-subject schema proposal and migration sketch in `docs/plans/active/2026-03-13-review-subject-schema-proposal.md`.
- 2026-03-13 progress: hunt CLI preflight now resolves inferred scope (for scoped tool names) and blocks ambiguous parent products without explicit `--entity-scope` or `--auto-scope-queue`.
- 2026-03-13 progress: persistence now writes user-reported pros/cons into the `claims` ledger as first-class `user_signal_*` rows with explicit lane metadata in `value_json`.
- 2026-03-13 progress: `Hunter.hunt()` now enforces subject preflight too, so queue workers cannot bypass canonical-subject scope checks.
- 2026-03-13 progress: alternatives cards now render an explicit comparison axis label, and rendered QA now fails on unresolved-subject verdict leaks, generic hero dek fallback, and malformed or axis-less comparison link sets.
- 2026-03-13 progress: category resolution now uses intent-aware precedence (explicit > detected > dossier category > taxonomy > context), and persistence applies that resolved slug when storing tool category.
- 2026-03-13 progress: decision-utility state now suppresses generic pricing/setup/outcomes fallback content when confidence is low and no evidence anchors exist.
- 2026-03-13 progress: decision-utility now consumes resolved subject type/scope and emits subject-specific rollout guidance for product surfaces, plan families, and deployment modes.
- 2026-03-13 progress: evidence runtime now keeps factual pros/cons lanes strict by filtering out community/opinion claims from core strengths-and-limitations evidence computation.
- 2026-03-13 progress: quick-jump navigation now compiles from a fixed section-order contract, including explicit strengths section targeting.
- 2026-03-13 progress: moved route-local `tool.specs` parsing (user-signal summary, top user claims, lens coverage counters) into `buildToolPageSpecsSignals(...)` to reduce `tool/[slug]` orchestration sprawl.

### Phase 3: Page compiler rebuild

- [ ] Build a slimmer tool-page compiler around one subject and one fixed section order (`npm run typecheck && npm run test && npm run build`)
- [~] Replace generic decision utility builders with subject-specific decision builders (`npm run test -- tests/lib/tool-page-decision-utility.test.ts && npm run typecheck`)
- [~] Replace mixed pros/cons rendering with separate fact-backed and user-reported evidence groups (`npm run test -- tests/lib/tool-page-pros-cons-view.test.ts && npm run typecheck`)

### Phase 4: Alternatives and category cleanup

- [x] Rework alternatives so each card declares the comparison axis (`npm run test && npm run typecheck`)
- [x] Tighten category assignment rules so tool pages align with user intent and SEO intent (`npm run test && npm run typecheck`)
- [x] Add QA gates for entity confusion, generic hero copy, and unsupported comparison sets (`npm run qa:prepush`)

### Phase 5: Redundancy cleanup

- [ ] Remove or deprecate redundant fields and builders that the new subject compiler replaces (`npm run typecheck && npm run test && npm run build`)
- [ ] Move closed plans and update debt tracker once subject-first architecture is live (`rg -n \"tool-page|subject\" docs/plans docs/DECISIONS.md docs/plans/tech-debt.md`)

## Decision Log

- 2026-03-07: The next quality jump will come from subject resolution and evidence separation, not from adding more page sections.
- 2026-03-07: User-reported pros and cons should become a first-class evidence lane, but they must remain explicitly corroborated and visibly distinct from official product facts.
- 2026-03-07: Strengths and weaknesses now render factual claims and user-reported signals in separate UI groups, while preserving source-backed attribution in both.
- 2026-03-07: Cleanup is part of the rebuild. New subject-level architecture should replace redundant storage and UI, not sit alongside it indefinitely.

## Exit Criteria

- Every `/tool/[slug]` page resolves to one canonical review subject.
- Mixed-entity pages like GitHub no longer blend platform, AI add-on, enterprise plan, and adjacent products into one verdict.
- Verdicts, pricing, and hard limits are anchored to the correct evidence lane.
- User-reported pros and cons are visible, corroborated, and separate from official facts.
- Generic fallback sections are suppressed instead of rendered.
- Redundant fields, builders, and UI blocks removed by the new compiler are either deleted or explicitly deprecated.
