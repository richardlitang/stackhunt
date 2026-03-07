# Tool Page Rebuild Handoff

Last verified: 2026-03-07

## Purpose

This is the operator handoff for the tool-page rebuild. Use it when continuing work in another thread, another agent session, or after context reset.

The full architecture plan lives in [2026-03-07-entity-first-tool-page-rebuild.md](./2026-03-07-entity-first-tool-page-rebuild.md).

## The Core Problem

Tool pages are still failing in a repeatable way:

- one page often represents multiple product entities
- official facts, user sentiment, and editorial judgment are blended too early
- the frontend fills missing evidence with generic SaaS prose
- user-reported pros and cons are present, but not yet a first-class decision input

This is why pages like GitHub can drift into a confusing mix of:

- GitHub the platform
- GitHub Copilot
- GitHub Actions
- GitHub Enterprise
- general developer workflow claims

## The Single Most Important Principle

One page must answer one clean decision question for one canonical review subject.

If the page cannot clearly answer:

- what exact product surface is being reviewed
- who it is for
- what the main tradeoff is
- what the pricing shape is

then the page should degrade gracefully, not fabricate confident generic copy.

## Root Causes Confirmed In Code

### 1. Review selection is freshness-based, not subject-based

- [src/lib/tool-page/data.ts](/Users/richardlitang/code/personal/stackhunt/src/lib/tool-page/data.ts)
- [src/lib/reviews/select-review.ts](/Users/richardlitang/code/personal/stackhunt/src/lib/reviews/select-review.ts)
- [src/lib/supabase.ts](/Users/richardlitang/code/personal/stackhunt/src/lib/supabase.ts)

Current behavior:

- the route loads all reviews attached to an `item`
- it selects the freshest published review
- it does not strongly resolve which product surface or scope that review belongs to

Effect:

- mixed-scope pages for ambiguous products

### 2. The prompt asks for too much in one pass

- [src/lib/hunter/services/prompts.ts](/Users/richardlitang/code/personal/stackhunt/src/lib/hunter/services/prompts.ts)
- [src/lib/hunter/phases/analysis.ts](/Users/richardlitang/code/personal/stackhunt/src/lib/hunter/phases/analysis.ts)

Current behavior:

- official capabilities
- pricing
- pros/cons
- user sentiment
- decision intro
- human verdict

all come from one blended synthesis step.

Effect:

- entity contamination
- evidence-lane contamination
- generic machine-composed copy

### 3. User signal exists, but is still secondary

- [src/lib/hunter/phases/persistence.ts](/Users/richardlitang/code/personal/stackhunt/src/lib/hunter/phases/persistence.ts)
- [src/lib/hunter/user-signal-fallback.ts](/Users/richardlitang/code/personal/stackhunt/src/lib/hunter/user-signal-fallback.ts)
- [src/lib/tool-page/pros-cons-view.ts](/Users/richardlitang/code/personal/stackhunt/src/lib/tool-page/pros-cons-view.ts)

Current behavior:

- explicit user-reported pros/cons are allowed
- fallback user claims can be generated from snippets
- user signal is still merged late into display rather than driving the decision model

Effect:

- user pain and delight are underweighted
- low-signal snippet-derived “user claims” can still pollute output

### 4. Frontend fallback generators are too strong

- [src/lib/tool-page/decision-utility.ts](/Users/richardlitang/code/personal/stackhunt/src/lib/tool-page/decision-utility.ts)
- [src/lib/tool-page/decision-runtime.ts](/Users/richardlitang/code/personal/stackhunt/src/lib/tool-page/decision-runtime.ts)
- [src/pages/tool/[slug].astro](/Users/richardlitang/code/personal/stackhunt/src/pages/tool/[slug].astro)

Current behavior:

- lens-aware and category-aware helpers generate reasonable-looking copy
- they still render even when the product-specific evidence is weak

Effect:

- pages look more complete than they really are
- trust drops because the prose is polished but not specific

## The Target Architecture

### Canonical review subject

We need one subject model per page. Example subject types:

- `product`
- `product_surface`
- `plan_family`
- `deployment_mode`

Examples:

- GitHub
- GitHub Copilot
- GitHub Actions
- GitHub Enterprise Cloud

The page compiler should resolve one subject first, then compile the page around it.

### Evidence lanes

Every claim should live in one lane:

- `official_fact`
- `official_pricing`
- `official_limit`
- `hands_on_observation`
- `user_signal`
- `editorial_summary`
- `editorial_inference`

Use rules:

- verdict, pricing, and hard limits must anchor to official or hands-on evidence
- user signals should shape strengths, weaknesses, rollout checks, and tradeoffs
- editorial inference can summarize, but not fabricate missing detail

### Split synthesis outputs

Replace one blended review payload with four outputs:

- `subject_profile`
- `fact_sheet`
- `user_signal_sheet`
- `editorial_decision`

## The New Page Shape

Every tool page should bias toward this structure:

1. Hero
2. Verdict in 30 seconds
3. Best for / Not for / Key tradeoff
4. Real-world use cases
5. Pricing and upgrade triggers
6. Rollout checklist
7. Strengths and limitations
8. Alternatives by comparison type
9. Evidence and methodology

If a section lacks sufficient evidence, suppress it.

## What To Stop Doing

- Do not let one page cover multiple product surfaces unless explicitly modeled that way.
- Do not use community or third-party sources as the primary truth for pricing, capabilities, or plan gating.
- Do not merge official facts and user complaints into one undifferentiated pros/cons list.
- Do not let fallback builders manufacture generic decision copy when evidence is weak.
- Do not keep adding helper layers to the current route without clarifying ownership of subject, evidence, and rendering.

## What To Do Next

### Phase 1

Establish subject resolution.

Start here:

- make page selection subject-aware
- stop relying on freshest review only
- decide whether subject lives as a new table or a compiled layer over `items + reviews`

### Phase 2

Split ETL outputs by evidence lane.

Start here:

- separate official fact extraction from user-signal extraction
- stop asking one prompt to do everything
- make user-reported claims first-class and visibly separate

### Phase 3

Rebuild the tool-page compiler around the new subject contract.

Start here:

- slim the route further
- reduce generic fallback sections
- make lens behavior rewrite content, not just reorder it

### Phase 4

Cleanup.

Targets:

- redundant fields in `items.specs`
- stale `review_context` responsibilities
- duplicated pricing or pros/cons storage
- heuristic-heavy UI blocks that add noise

## Relevant Files To Read First

- [docs/plans/active/2026-03-07-entity-first-tool-page-rebuild.md](/Users/richardlitang/code/personal/stackhunt/docs/plans/active/2026-03-07-entity-first-tool-page-rebuild.md)
- [docs/plans/tech-debt.md](/Users/richardlitang/code/personal/stackhunt/docs/plans/tech-debt.md)
- [docs/TOOL_PAGE_STANDARD_V1.md](/Users/richardlitang/code/personal/stackhunt/docs/TOOL_PAGE_STANDARD_V1.md)
- [src/lib/tool-page/data.ts](/Users/richardlitang/code/personal/stackhunt/src/lib/tool-page/data.ts)
- [src/lib/reviews/select-review.ts](/Users/richardlitang/code/personal/stackhunt/src/lib/reviews/select-review.ts)
- [src/lib/hunter/services/prompts.ts](/Users/richardlitang/code/personal/stackhunt/src/lib/hunter/services/prompts.ts)
- [src/lib/hunter/phases/analysis.ts](/Users/richardlitang/code/personal/stackhunt/src/lib/hunter/phases/analysis.ts)
- [src/lib/hunter/phases/persistence.ts](/Users/richardlitang/code/personal/stackhunt/src/lib/hunter/phases/persistence.ts)
- [src/lib/tool-page/decision-utility.ts](/Users/richardlitang/code/personal/stackhunt/src/lib/tool-page/decision-utility.ts)
- [src/pages/tool/[slug].astro](/Users/richardlitang/code/personal/stackhunt/src/pages/tool/[slug].astro)

## Verification Standard For Future Work

Minimum:

- `npm run typecheck`
- targeted tests for touched modules

Before push:

- `npm run qa:prepush`

## Current Status

- architecture plan written
- debt tracker updated
- docs committed and pushed

Latest commit when this handoff was created:

- `058ff45` for the architecture plan

Use this handoff to start the next thread. The first implementation slice should be subject resolution, not another round of copy cleanup.
