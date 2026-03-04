# StackHunt Tech Debt Tracker

Last verified: 2026-03-05

Track architecture, pipeline, and SEO debt as small, agent-executable items.

## Open Items

- `tool-page-route-thinning`: `src/pages/tool/[slug].astro` is still a heavy composition root (~1.9k lines) despite recent helper extraction.
  - Owner: platform
  - Target date: 2026-03-12
  - Next verification: `npm run typecheck && npm run test && npm run build`
- `tool-page-mega-namespace`: `@/lib/tool-page` barrel keeps growing, internal module boundaries need explicit grouping review (`data/`, `runtime/`, `policy/`, `view-models/`, `text/`).
  - Owner: platform
  - Target date: 2026-03-12
  - Next verification: `rg -n "export .* from '@/lib/tool-page/" src/lib/tool-page/index.ts`
- `tool-page-plan-lifecycle`: active thinning plan should be moved to `docs/plans/completed/` once remaining runtime/data extraction tasks close.
  - Owner: platform
  - Target date: 2026-03-12
  - Next verification: `ls docs/plans/active docs/plans/completed`

## Closed Items

- `tool-page-inline-template-transforms` (partially closed 2026-03-05): route no longer performs several inline mappings/fallbacks for compare chips, source list caps, pros/cons shape adaptation, strengths subtitle, affiliate offers rel policy, and trust-bar prop composition.
  - Evidence: `src/lib/tool-page/compare-teasers.ts`, `source-lists.ts`, `pros-cons-view.ts`, `strengths-subtitle.ts`, `affiliate-offers.ts`, `trust-bar-props.ts`
- `tool-page-quick-jump-conditional-bloat` (partially closed 2026-03-05): quick-jump link branching and multiple section visibility checks moved into dedicated view/state helpers.
  - Evidence: `src/lib/tool-page/quick-jump-links.ts`, `sources-section-state.ts`, `update-history-state.ts`, `video-state.ts`
- `tool-page-stale-alternatives-branch` (closed 2026-03-05): route no longer references removed `alternativesResponse`; alternatives intro copy is derived from typed route state.
  - Evidence: `src/lib/tool-page/alternatives-intro.ts`, `src/pages/tool/[slug].astro`
- `runtime-meta-ordering-pending-verification` (closed 2026-03-05): meta runtime now consumes trust-derived `pendingVerificationCount` inside `buildToolPageRuntime`, preventing stale zero-count policy inputs.
  - Evidence: `src/lib/tool-page/runtime.ts`
- `tool-page-inline-policy-assembly` (partially closed 2026-03-05): major route-level policy clusters moved into dedicated helpers (`decision-runtime`, `section-runtime-input`, `runtime-params-context`, `runtime-view-bundle`, etc.).
  - Evidence: recent refactor commits on 2026-03-05
