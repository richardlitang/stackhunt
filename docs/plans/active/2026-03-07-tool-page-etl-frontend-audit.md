# Tool Page ETL to Frontend Audit

Last verified: 2026-03-07

## Objective

Determine whether the current ETL, tool-page compiler, and route runtime are moving toward the subject-first architecture, identify over-engineering or bloat, and define concrete pivots.

## Current Trajectory (Are We Getting There?)

Partial yes, but not complete.

- Phase 1 is now materially underway:
  - subject-aware review scoring exists (`src/lib/tool-page/review-subject.ts`)
  - mismatched published reviews are suppressed in tool page data selection (`src/lib/tool-page/data.ts`)
  - unresolved subject scope now blocks index readiness and provisional index override (`src/lib/tool-page/quality-state.ts`, `src/lib/tool-page/provisional-index.ts`)
- Main architectural risk still open:
  - subject identity is still inferred heuristically from name/slug and source scopes, not persisted as a canonical DB contract.
  - ETL still blends multiple concern lanes before persistence, then route/runtime layers perform heavy fallback shaping.

Conclusion: direction is now correct, but the system is still in a transitional hybrid state.

## 2026-03-07 Progress Snapshot

Implemented in code:

- subject-aware review selection and subject-scope indexing blockers are live on tool pages
- provisional index override is blocked when `subject_scope_pending`
- snippet-derived fallback user signal claims now require corroboration
- analysis and persistence now emit/store lane envelopes:
  - `subject_profile`
  - `fact_sheet`
  - `user_signal_sheet`
  - `editorial_decision`
- tool page quality-state now consumes persisted lane user signals to reduce false coverage-pending states
- lane subject profile can now override slug heuristics during subject resolution
- analysis now normalizes mixed factual and user-signal claims before decision rendering
- schema validation now blocks publish when `pros/cons` contains opinion/community signals or `userReported*` contains factual/official claims
- content-sections input now merges persisted lane user signals into frontend user-signal rendering, with dedupe against legacy `user_reported_*` payloads

## Confirmed Bloat and Over-Engineering

### 1) Too many fallback generators still produce plausible prose when evidence is thin

- `src/lib/tool-page/decision-runtime.ts`
- `src/lib/tool-page/decision-utility.ts`
- `src/lib/tool-page/intro.ts`
- `src/lib/tool-page/alternatives-compare-grid.ts`

Risk:

- polished but generic copy can still outrun evidence quality.

### 2) ETL has excessive derived/fallback branches that overlap responsibilities

- `src/lib/hunter/phases/persistence.ts` (~5k lines)
- `src/lib/hunter/user-signal-fallback.ts`

Risk:

- truth ownership is hard to reason about
- source-derived heuristics can leak into buyer-facing claims

### 3) Route remains orchestration-heavy

- `src/pages/tool/[slug].astro` (still >2k lines)

Risk:

- correctness is harder to defend
- policy changes require touching too many route-adjacent builders

## Missing Additions Needed

### 1) Canonical persisted review subject contract

Need explicit subject records and alias mapping. Current runtime inference is useful but insufficient as the long-term owner.

### 2) Lane-native ETL outputs

Need explicit split payloads:

- `subject_profile`
- `fact_sheet`
- `user_signal_sheet`
- `editorial_decision`

Current single blended synthesis still increases contamination risk.

### 3) Section suppression policy centralization

Section visibility decisions are spread across multiple builders and runtime layers. A single policy module should own suppression precedence.

## Pivots To Execute Next

### Pivot A (Immediate)

Finish Phase 1 by making subject ambiguity a first-class blocker everywhere index/publish decisions happen. This is partly complete, but needs full coverage tests in route runtime assemblies.

### Pivot B (Near-term)

Reduce fallback blast radius:

- keep factual fallback only when source-backed
- remove or demote heuristic narrative fallback for verdict and alternatives
- do not generate replacement verdict text from low-signal inputs

### Pivot C (Foundational)

Refactor ETL persistence into lane modules before adding new UI features. Avoid adding new route-level helpers until ETL lane ownership is explicit.

## Execution Order (Recommended)

1. Lock subject-scope blockers in all index/publish paths with regression tests.
2. Introduce lane envelopes in analysis output and persistence writes.
3. Build one policy module for section suppression and route-level consumption.
4. Remove heuristic-first fallback branches in decision/alternatives runtime.
5. Extract tool route assembly further only after suppression and lane policy stabilize.

## Keep vs Remove

Keep:

- explicit quality gates
- traceable source-attributed claims
- review-in-progress model with strict blockers

Remove or demote:

- single-source snippet-derived fallback user sentiment
- heuristic alternatives claims labeled as if buyer-ready
- generic decision-intro fallback wording paths
