# Tool Page Systemic Cleanup Plan

Last updated: March 7, 2026

## Scope

This plan addresses recurring trust and usability issues across all tool pages, not just one page.

## 1) ETL hardening priorities

1. Source typing fidelity

- Normalize source type using both URL and scout source hints (`official`, `support`, `docs`, `community`, `editorial`).
- Prevent first-party support/docs pages from being misclassified as editorial.

2. User-reported pros/cons as first-class evidence

- Keep `user_reported_pros` and `user_reported_cons` as canonical fields in `specs`.
- Persist source channel metadata for top user claims (`reddit`, `forum`, `hn`, `editorial`, `other`).
- Prefer corroborated community claims when ranking strengths/weaknesses.

3. Lens tagging quality in pricing ETL

- Preserve explicit `works_for_lenses` tags from extraction.
- Backfill from plan metadata (`target_audience`, plan name tokens, SSO/SLA/enterprise flags).
- Track lens coverage counts in canonical quality metadata.

## 2) Frontend cleanup priorities

1. Remove duplicate section intent

- Keep outcome-oriented section as the decision aid.
- Keep feature list section as reference inventory, not another “what it does in practice” block.

2. Trust-state messaging

- If community domains exist but corroborated user claims are still sparse, show a “pending user-signal extraction” notice.
- Keep all factual constraints in summary areas source-linked or evidence-anchored.

3. Lens behavior guarantees

- Lens should change decision bullets, verdict framing, rollout checks, and pricing interpretation.
- Lens-based pricing rendering should prefer tagged plans and clearly disclose fallback behavior.

## 3) Redundant data and code cleanup backlog

1. Data fields

- Audit overlap between `specs.pricing_data`, `specs.pricing_v2`, and `specs.canonical.pricing_plan_entities`.
- Define one canonical read path for tool-page pricing decisions, keep others as compatibility layers only.

2. UI elements

- Audit repeated “summary of sources as of” and similar microcopy fragments to reduce repetition.
- Consolidate repeated source-chip rendering patterns into shared helpers.

3. Route/module complexity

- Continue extracting view-model logic from `src/pages/tool/[slug].astro` into `src/lib/tool-page/*`.
- Prefer small, single-responsibility builder modules with test coverage.

## 4) Verification gates to add

1. ETL contract checks

- Fail when source-backed pros/cons are duplicate-heavy after normalization.
- Fail when community sources exist but zero user-reported claims are persisted without explicit suppression reason.

2. Page QA assertions

- Ensure decision bullets with factual constraints have source chips or evidence anchors.
- Ensure no duplicated section headings for distinct content blocks.

## 5) Rollout order

1. ETL source typing and user-claim ranking
2. Lens-tagged pricing consistency
3. Frontend messaging and section cleanup
4. Redundant field/code reduction with regression tests
