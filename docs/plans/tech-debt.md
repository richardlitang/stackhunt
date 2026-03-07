# StackHunt Tech Debt Tracker

Last verified: 2026-03-05

Track architecture, pipeline, and SEO debt as small, agent-executable items.

## Open Items

- `tool-page-entity-ambiguity`: ambiguous parent products like GitHub can still render mixed-scope reviews because page selection is freshness-based instead of subject-based.
  - Owner: platform
  - Target date: 2026-03-14
  - Next verification: `rg -n "review_subject|entity_scope|selectToolPageReview|getToolPageData" src/lib src/pages`
- `tool-page-evidence-lane-blending`: official facts, user signals, and editorial synthesis are still blended across prompts, persistence, and rendering.
  - Owner: platform
  - Target date: 2026-03-14
  - Next verification: `rg -n "userReportedPros|userReportedCons|reviewContext|official_fact|user_signal|editorial_inference" src/lib docs`
- `tool-page-generic-fallback-copy`: decision and rollout builders still generate template-safe copy when product-specific evidence is weak.
  - Owner: platform
  - Target date: 2026-03-14
  - Next verification: `rg -n "What to test before rollout|Common setups|should be evaluated by workflow outcomes|fits startups" src/lib/tool-page src/pages/tool/[slug].astro`
- `tool-page-route-thinning`: `src/pages/tool/[slug].astro` is still a heavy composition root (~1.9k lines) despite recent helper extraction.
  - Owner: platform
  - Target date: 2026-03-12
  - Next verification: `npm run typecheck && npm run test && npm run build`
  - Troubleshooting aid: `docs/TOOL_PAGE_ORCHESTRATION_MAP.md` (regenerate via `npm run docs:tool-page-map`)
- `tool-page-mega-namespace`: `@/lib/tool-page` barrel keeps growing, internal module boundaries need explicit grouping review (`data/`, `runtime/`, `policy/`, `view-models/`, `text/`).
  - Owner: platform
  - Target date: 2026-03-12
  - Next verification: `rg -n "export .* from '@/lib/tool-page/" src/lib/tool-page/index.ts`
- `tool-page-plan-lifecycle`: active thinning plan should be moved to `docs/plans/completed/` once remaining runtime/data extraction tasks close.
  - Owner: platform
  - Target date: 2026-03-12
  - Next verification: `ls docs/plans/active docs/plans/completed`

## Closed Items

- `tool-page-helper-reference-regressions` (partially closed 2026-03-05): pre-push QA now detects malformed wrapper call shapes and missing/unbound tool-page helper symbols while ignoring comment/string noise.
  - Evidence: `scripts/check-tool-page-route-call-shapes.mjs`, `scripts/lib/tool-page-route-call-shape-guard.mjs`, `scripts/check-tool-page-helper-imports.mjs`, `scripts/lib/tool-page-helper-import-guard.mjs`, `eslint.config.js` (`no-undef` for `*.astro`), `scripts/check-format-changed.mjs` (includes branch, working tree, index, and untracked files)
  - Note: includes dedicated detection for invalid runtime assembly chaining (`buildToolPageRuntimeAssemblyFromRoute(buildToolPageRuntimeAssemblyInputBundleFromPageContext(...))`).
- `tool-page-inline-template-transforms` (partially closed 2026-03-05): route no longer performs several inline mappings/fallbacks for compare chips, source list caps, pros/cons shape adaptation, strengths subtitle, affiliate offers rel policy, and trust-bar prop composition.
  - Evidence: `src/lib/tool-page/compare-teasers.ts`, `source-lists.ts`, `pros-cons-view.ts`, `strengths-subtitle.ts`, `affiliate-offers.ts`, `trust-bar-props.ts`
- `tool-page-quick-jump-conditional-bloat` (partially closed 2026-03-05): quick-jump link branching and multiple section visibility checks moved into dedicated view/state helpers.
  - Evidence: `src/lib/tool-page/quick-jump-links.ts`, `sources-section-state.ts`, `update-history-state.ts`, `video-state.ts`
- `tool-page-stale-alternatives-branch` (closed 2026-03-05): route no longer references removed `alternativesResponse`; alternatives intro copy is derived from typed route state.
  - Evidence: `src/lib/tool-page/alternatives-intro.ts`, `src/pages/tool/[slug].astro`
- `runtime-meta-ordering-pending-verification` (closed 2026-03-05): meta runtime now consumes trust-derived `pendingVerificationCount` inside `buildToolPageRuntime`, preventing stale zero-count policy inputs.
  - Evidence: `src/lib/tool-page/runtime.ts`
- `tool-page-inline-policy-assembly` (partially closed 2026-03-05): major route-level policy clusters moved into dedicated helpers (`decision-runtime`, `section-runtime-input`, `runtime-params-context`, `runtime-view-bundle`, etc.).
  - Evidence: recent refactor commits on 2026-03-05, including composite helpers for `navigation+media`, `runtime+navigation`, `chrome+lens+content`, `prep+decision+review-evidence` (route and decision-context paths), and `runtime-view-bundle` context composition.
