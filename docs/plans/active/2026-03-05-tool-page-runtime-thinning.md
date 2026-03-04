# Tool Page Runtime Thinning (Batch Stream)

Last verified: 2026-03-05

## Goal

- Continue moving policy/derivation assembly out of `src/pages/tool/[slug].astro` so the route acts as a thin renderer over runtime models.

## Scope

- In scope:
  - Extract route-level input/adapter/presentation helpers to `src/lib/tool-page/*`.
  - Keep behavior parity while shrinking inline orchestration in the route.
  - Add or update focused unit tests for every extraction.
- Out of scope:
  - Changing tool-page UX/content strategy.
  - Rewriting unrelated pages.

## Tasks

- [x] Extract evidence runtime input builder and wire route (`npm run typecheck && npm run test`)
- [x] Extract review signals input builder and wire route (`npm run typecheck && npm run test`)
- [x] Extract presentation gates helper (`npm run typecheck && npm run test`)
- [x] Raise repo autonomy batch target to 10 slices (`rg -n "10 logical code slices" AGENTS.md`)
- [x] Extract FAQ schema helper (`npm run typecheck && npm run test`)
- [x] Move direct pricing source derivation into evidence input builder (`npm run typecheck && npm run test`)
- [x] Extract runtime view bundle helper (`npm run typecheck && npm run test`)
- [x] Add alternatives-runtime entrypoint from item-like records (`npm run typecheck && npm run test`)
- [x] Extract version-bypass cache header helper (`npm run typecheck && npm run test`)
- [x] Extract review artifacts builder (`npm run typecheck && npm run test`)
- [x] Extract quality-state input builder (`npm run typecheck && npm run test`)
- [x] Extract section flags projection (`npm run typecheck && npm run test`)
- [x] Extract robots response header helper (`npm run typecheck && npm run test`)
- [x] Extract display signals helper (`npm run typecheck && npm run test`)
- [x] Extract lens view field projection (`npm run typecheck && npm run test`)
- [x] Extract review signals view projection (`npm run typecheck && npm run test`)
- [x] Extract alternatives view field projection (`npm run typecheck && npm run test`)
- [x] Extract constraint evidence view projection (`npm run typecheck && npm run test`)
- [x] Remove redundant review-context array guards in route (`npm run typecheck && npm run test -- tests/lib/tool-page-review-context.test.ts`)
- [x] Extract review in-progress banner copy helper (`npm run typecheck && npm run test -- tests/lib/tool-page-review-banner.test.ts`)
- [x] Extract category breadcrumb builder (`npm run typecheck && npm run test -- tests/lib/tool-page-breadcrumbs.test.ts`)
- [x] Extract research status view builder (`npm run typecheck && npm run test -- tests/lib/tool-page-research-status.test.ts`)
- [x] Extract pricing insights budget analyst input (`npm run typecheck && npm run test -- tests/lib/tool-page-pricing-insights-input.test.ts`)
- [x] Centralize freshness label precedence and reuse (`npm run typecheck && npm run test -- tests/lib/tool-page-freshness-labels.test.ts`)
- [x] Remove stale `alternativesResponse` template reference via intro helper (`npm run typecheck && npm run test -- tests/lib/tool-page-alternatives-intro.test.ts`)
- [x] Extract taxonomy primary-function helper (`npm run typecheck && npm run test -- tests/lib/tool-page-taxonomy.test.ts`)
- [x] Reuse `hasFeatures` section signal in template (`npm run typecheck && npm run test -- tests/lib/tool-page-section-flags.test.ts`)
- [x] Extract compare teaser link builder (`npm run typecheck && npm run test -- tests/lib/tool-page-compare-teasers.test.ts`)
- [x] Extract methodology/low-confidence source list view caps (`npm run typecheck && npm run test -- tests/lib/tool-page-source-lists.test.ts`)
- [x] Extract pros/cons view mapping helper (`npm run typecheck && npm run test -- tests/lib/tool-page-pros-cons-view.test.ts`)
- [x] Extract getting-started props builder (`npm run typecheck && npm run test -- tests/lib/tool-page-getting-started-props.test.ts`)
- [x] Extract strengths subtitle policy helper (`npm run typecheck && npm run test -- tests/lib/tool-page-strengths-subtitle.test.ts`)
- [x] Extract affiliate offers view mapping (`npm run typecheck && npm run test -- tests/lib/tool-page-affiliate-offers.test.ts`)
- [x] Extract trust bar props builder (`npm run typecheck && npm run test -- tests/lib/tool-page-trust-bar-props.test.ts`)
- [x] Extract evidence basis chip formatter (`npm run typecheck && npm run test -- tests/lib/tool-page-evidence-basis-chips.test.ts`)
- [x] Fix sidebar offers to render from affiliate offers view (`npm run typecheck && npm run test -- tests/lib/tool-page-affiliate-offers.test.ts`)
- [x] Extract website presence and display label helpers (`npm run typecheck && npm run test -- tests/lib/tool-page-website.test.ts -- tests/lib/tool-page-website-label.test.ts`)
- [x] Extract lens priority lead copy helper (`npm run typecheck && npm run test -- tests/lib/tool-page-lens-priority-copy.test.ts`)
- [x] Extract pricing evidence link text helper (`npm run typecheck && npm run test -- tests/lib/tool-page-pricing-link-text.test.ts`)
- [x] Extract specs checked lead helper (`npm run typecheck && npm run test -- tests/lib/tool-page-specs-section.test.ts`)
- [x] Extract quick jump links builder (`npm run typecheck && npm run test -- tests/lib/tool-page-quick-jump-links.test.ts`)
- [x] Extract alternatives card compare view (`npm run typecheck && npm run test -- tests/lib/tool-page-alternatives-cards.test.ts`)
- [x] Extract sources/update-history visibility signals (`npm run typecheck && npm run test -- tests/lib/tool-page-sources-section-state.test.ts -- tests/lib/tool-page-update-history-state.test.ts`)
- [x] Extract video section visibility signal (`npm run typecheck && npm run test -- tests/lib/tool-page-video-state.test.ts`)
- [ ] Continue thinning remaining route orchestration clusters (`npm run typecheck && npm run test && npm run build`)

## Decision Log

- 2026-03-05: Keep extraction slices small and behavior-preserving, each with local tests, to minimize regression risk in a hotspot route.
- 2026-03-05: Track this stream in `docs/plans/active/` and reflect debt deltas in `docs/plans/tech-debt.md` per harness rules.
- 2026-03-05: Prioritize low-risk route-thinning helpers (input builders and view projections) before larger runtime/data layer moves.

## Exit Criteria

- Route orchestration complexity is reduced via helper extraction without changing rendered behavior.
- Every extraction has passing tests.
- Active plan and debt tracker reflect current state.
