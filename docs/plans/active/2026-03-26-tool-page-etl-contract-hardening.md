# Tool Page ETL Contract Hardening

Last verified: 2026-03-27

## Goal

- Make tool pages render only evidence-backed buyer guidance by tightening the ETL-to-frontend contract and removing render-time filler that hides missing upstream data.

## Scope

- In scope:
- Consolidate the canonical source of truth for buyer-decision content.
- Remove or suppress frontend fallbacks that currently invent decision-layer copy.
- Tighten where LLM output is allowed, especially for `llm_phrase_only` fields.
- Improve extraction and persistence for user signal and operational details where deterministic logic is currently too weak.
- Add regression tests and QA gates for lane completeness, section visibility, and stale-contract drift.
- Out of scope:
- Full redesign of `/best` or `/compare`.
- New third-party dependencies.
- Broad schema rewrites unrelated to tool-page buyer guidance.

## Review Summary

- Current tool pages read from three overlapping sources:
  - `reviews` for published review content
  - `items.review_context` for narrative decision helpers
  - `items.specs.canonical.entity_first_lane_outputs` for structured decision/fact/user-signal fields
- The biggest contract problem is that the frontend still compensates for missing ETL with generated buyer copy.
- The biggest hallucination risk is `editorial_decision` content persisted as `llm_phrase_only` and then treated as renderable decision support.
- The biggest under-modeled area is community/user-signal extraction, where regex-driven fallback claims are doing work that should be handled by a tightly-bounded extractive pass or stricter abstention.

## Principles

- LLMs may extract and compress messy evidence, but must not be the canonical source for high-stakes buyer advice unless the output is explicitly evidence-backed.
- Deterministic code should format, rank, gate, and suppress, not invent decision content.
- Missing ETL should result in hidden sections or neutral empty states, not polished fallback prose.
- One buyer-decision field should have one canonical home.

## Tasks

- [x] Task 1: Freeze the target contract in docs and code comments.
  - Files:
    - Modify: `docs/plans/active/2026-03-26-tool-page-etl-contract-hardening.md`
    - Modify: `docs/DECISIONS.md`
  - Action:
    - Record that structured buyer-decision data should be sourced from `entity_first_lane_outputs`.
    - Define `review_context` as secondary/supporting only unless migration compatibility is explicitly required.
  - Verify:
    - `rg -n "entity_first_lane_outputs|review_context" docs/DECISIONS.md docs/plans/active/2026-03-26-tool-page-etl-contract-hardening.md`

- [x] Task 2: Remove render-time buyer-decision invention from the blueprint layer.
  - Files:
    - Modify: `src/lib/tool-page/blueprint-runtime-input.ts`
    - Modify: `src/lib/tool-page/decision-layer-integrity.ts`
  - Action:
    - Stop generating fallback fit-matrix rows, pricing-reality copy, and before-you-buy tests when lane outputs are missing.
    - Return sparse/null state and let the section hide or render a neutral “not yet source-backed” variant.
  - Verify:
    - `npm run typecheck`

- [x] Task 3: Remove or sharply narrow generic decision utility fallback content.
  - Files:
    - Modify: `src/lib/tool-page/decision-utility.ts`
    - Modify: `src/lib/tool-page/page-compiler-route-state.ts`
    - Modify: `src/lib/tool-page/chrome-route-state.ts`
  - Action:
    - Keep deterministic formatting and lens framing.
    - Stop using archetype/lens templates as substitutes for absent ETL facts.
    - Only render practical outcomes, pricing mental models, and checklist items when anchored to persisted evidence or explicit allowed heuristic states.
  - Verify:
    - `npm run typecheck`

- [x] Task 4: Tighten `llm_phrase_only` policy.
  - Files:
    - Modify: `src/lib/hunter/evidence-lanes.ts`
    - Modify: `src/lib/tool-page/decision-layer-consistency-signals.ts`
    - Modify: `src/lib/tool-page/lane-decision-signals.ts`
  - Action:
    - Mark `fit_matrix` as `suppress` unless it is backed by deterministic or extractive inputs.
    - Treat `llm_phrase_only` `best_for`, `not_for`, `main_tradeoff`, `main_risk`, `upgrade_trigger`, and pricing-reality fields as non-renderable by default.
    - Promote these fields only if they can be upgraded to `deterministic` or tightly `extractive`.
  - Verify:
    - `npm run typecheck`

- [ ] Task 5: Consolidate source ownership between `review_context` and lane outputs. (partial)
  - Files:
    - Modify: `src/lib/hunter/phases/persistence.ts`
    - Modify: `src/lib/tool-page/core-state.ts`
    - Modify: `src/lib/tool-page/review-context.ts`
    - Modify: `src/lib/tool-page/data-prep-route-state.ts`
  - Action:
    - Define which fields still belong in `review_context`.
    - Move buyer-decision render dependencies to lane outputs wherever possible.
    - Keep only migration adapters for old pages until a backfill is complete.
  - Verify:
    - `npm run typecheck`
    - `rg -n "decisionIntro|decisionSlots|humanVerdict|fit_matrix|pricing_reality" src/lib/tool-page src/lib/hunter/phases/persistence.ts`

- [x] Task 6: Replace shallow truthiness-based section gating with meaningful-content gating.
  - Files:
    - Modify: `src/lib/tool-page/knowledge-card-presence.ts`
    - Modify: `src/lib/tool-page/section-runtime-input.ts`
    - Modify: `src/lib/tool-page/section-state.ts`
    - Modify: `src/lib/tool-page/content-sections-input.ts`
  - Action:
    - Add canonical “meaningful content” helpers for company, support, portability, integrations, category-specific data, and specifics.
    - Ensure empty objects, placeholder arrays, or structurally present but useless data do not open sections.
  - Verify:
    - `npm run typecheck`

- [ ] Task 7: Improve user-signal ETL where deterministic fallback is too blunt. (partial)
  - Files:
    - Modify: `src/lib/hunter/user-signal-fallback.ts`
    - Modify: `src/lib/hunter/phases/persistence.ts`
    - Modify: `src/lib/hunter/services/prompts.ts`
    - Modify: `src/lib/hunter/phases/analysis.ts`
  - Action:
    - Keep current regex-based fallback only as a last resort.
    - Add a stricter extractive path for user-reported pros/cons, sourced from community/editorial evidence only.
    - If evidence is weak, abstain rather than manufacturing “Users report ...” claims from thin snippets.
  - Verify:
    - `npm run typecheck`
    - `npm run test -- --runInBand user-signal`

- [ ] Task 8: Tighten category-specific and operational extraction. (partial, substantially advanced)
  - Files:
    - Modify: `src/lib/hunter/services/prompts.ts`
    - Modify: `src/lib/hunter/phases/persistence.ts`
    - Modify: `src/lib/tool-page/constraint-evidence.ts`
  - Action:
    - Keep LLM extraction for hard-to-model operational details, but add field-specific validation for limits, units, plan references, deployment constraints, and security claims.
    - Prefer suppressing ambiguous operational details over rendering them with weak labels.
  - Verify:
    - `npm run typecheck`

- [ ] Task 9: Narrow the tool-page fetch and prep contract. (partial)
  - Files:
    - Modify: `src/lib/supabase.ts`
    - Modify: `src/lib/tool-page/data.ts`
    - Modify: `src/lib/tool-page/route-data-pipeline-state.ts`
  - Action:
    - Reduce broad page-time loading where practical.
    - Make selected review, resolved subject, lane outputs, and canonical content state explicit in the data layer instead of rediscovering them deeper in the route pipeline.
  - Verify:
    - `npm run typecheck`

- [ ] Task 10: Add regression tests for the ETL-to-frontend contract. (partial, substantially advanced)
  - Files:
    - Add or modify tests near:
      - `src/lib/tool-page/blueprint-runtime-input.*`
      - `src/lib/tool-page/section-state.*`
      - `src/lib/tool-page/lane-outputs.*`
      - `src/lib/tool-page/review-context.*`
  - Action:
    - Cover:
      - missing lane outputs do not produce invented fit matrix or pricing reality
      - `llm_phrase_only` decision fields are suppressed
      - empty operational objects do not open sections
      - conflicting `review_context` and lane outputs fail contract expectations
  - Verify:
    - `npm run test`

- [x] Task 11: Add QA guardrails so this drift cannot quietly return.
  - Files:
    - Modify: `scripts/qa-rendered-tool-pages.mjs`
    - Modify: `docs/TOOL_PAGE_QA_GATE_V1.md`
    - Modify: `docs/TOOL_PAGE_ORCHESTRATION_MAP.md` if contract changes affect composition
  - Action:
    - Add checks for:
      - hidden decision sections when lane data is absent
      - no visible `llm_phrase_only` buyer fields
      - no empty operational panels
      - navigation only includes renderable sections
  - Verify:
    - `npm run qa:prepush`

## Progress Notes

- 2026-03-27: Added persistence-time operational/constraint sanitizers to suppress ambiguous limits and weak hidden-cost narrative before tool specs are saved.
- 2026-03-27: Tightened fit-matrix rendering contract so non-strong rows require caveats, and added lane-output sanitization to suppress solo/startup rows that only carry enterprise-scoped caveats.
- 2026-03-27: Added rendered QA checks for fit-matrix non-strong caveat presence and empty operational-details panel suppression.
- 2026-03-27: Removed per-item status chips from decision utility and pricing-mental-model cards, and added rendered QA checks to block local `Source-backed`/`Needs confirmation` copy in those sections.
- 2026-03-27: Hardened fallback user-signal extraction to only keep explicitly hedged, user-voice community claims and removed synthetic "Users report..." generation from fallback logic.
- 2026-03-27: Added rendered QA checks that fail when section-rail jump links target missing sections or include disclosure-only navigation links.
- 2026-03-27: Added lane-output parsing guardrails for operational pricing-reality text and suppressed ambiguous generic hard-limit bullets without plan/unit context.
- 2026-03-27: Added tool-page route fetch helper with narrowed review payload (`getToolPageItemBySlug`) and switched tool page data loading to use it.

## Recommended Execution Order

1. Contract freeze and source ownership (`Tasks 1, 4, 5`)
2. Frontend fallback removal and section gating (`Tasks 2, 3, 6`)
3. ETL extraction/persistence tightening (`Tasks 7, 8, 9`)
4. Tests and QA gates (`Tasks 10, 11`)

## Decision Log

- 2026-03-26: Treat `entity_first_lane_outputs` as the target canonical buyer-decision contract, because the current split between lane outputs and `review_context` increases drift and duplicate fallback logic.
- 2026-03-26: Prioritize suppression over graceful filler for weak decision-layer evidence, because buyer-facing polish on thin evidence is a trust risk.
- 2026-03-26: Keep LLM use for extractive and validator-bounded tasks, but reduce or block LLM-only authority for fit, risk, upgrade, and pricing-reality messaging.

## Exit Criteria

- Tool pages no longer render invented fit matrix, pricing reality, or test-checklist content when lane outputs are missing.
- `llm_phrase_only` buyer-decision fields are either upgraded to stronger modes or suppressed.
- Operational details and navigation render only when backed by meaningful persisted data.
- One canonical source of truth exists for buyer-decision content.
- Regression tests cover lane completeness, section visibility, and source-of-truth consistency.
- `npm run typecheck`, `npm run test`, and `npm run qa:prepush` pass after implementation.
