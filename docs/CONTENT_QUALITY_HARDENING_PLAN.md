# Content Quality Hardening Plan (Handoff)

Last verified: 2026-03-05

Date: 2026-02-07
Scope: tool-page quality, volatile facts freshness, model/pricing correctness, indexing safety.

## Current State

- `source_policy_registry` is live and enforced.
- Scout/curation excludes blocked sources from deep scrape candidates.
- Robots gate is implemented in scraper (`src/lib/hunter/utils/scraper.ts`).
- Inventory service exists (`src/lib/hunter/services/model-inventory.ts`):
  - API-first for model lists.
  - Docs fallback for OpenAI/Anthropic model pages.
- `model_options` now uses authoritative inventory path in analysis.
- Pricing normalization is stricter (drops non-computable plans in v2 mapper).

## Known Gaps Observed

1. Model list mismatch:
- API/docs inventory can include many versioned IDs.
- Product page needs curated "latest comparison" models, not raw full inventory.

2. FAQ staleness:
- FAQ sometimes mentions outdated model lines (ex: Sonnet 3).
- Need volatile-fact validation for FAQ model/version claims.

3. Setup path quality:
- Current setup often favors dev/API path.
- For Claude-class tools, non-dev path (web + Claude Code flow) must also be represented.

4. Indexing risk:
- Some tool pages can be incomplete when first crawled.
- Should not be indexed before meeting quality thresholds.

## Decisions (Agreed)

1. Admin UI should support canonical facts editing.
2. Add quality/index gates before pages can be indexed.
3. Keep automation as default; add selective human correction where highest leverage.

## Implementation Plan

### A) Canonical Facts Layer (DB + Admin UI)

Add per-tool canonical fields (in `items.specs` initially, optional table later):

- `canonical.latest_models_comparison`: `string[]`
- `canonical.model_inventory_raw`: `string[]`
- `canonical.setup_tracks.dev`: structured steps
- `canonical.setup_tracks.non_dev`: structured steps
- `canonical.faq_locked`: array of locked FAQ entries

Admin capabilities:
- Edit canonical facts per tool.
- View source URLs + last verified date per canonical fact.
- Section-level regenerate buttons:
  - Models only
  - FAQ only
  - Setup only

### B) Model Data Semantics

Split usage:
- Internal: `model_inventory_raw` (all known IDs/names).
- User-facing: `latest_models_comparison` (small curated list).

Pipeline rule:
- If official latest-comparison docs exist, populate `latest_models_comparison` from those.
- UI should render latest list first; raw list optional/hidden.

### C) FAQ Volatile-Fact Guard

If FAQ answer includes model/version/pricing/limits:
- Source must be official docs/pricing/release/deprecations.
- Reject or regenerate answer if not source-backed.
- If conflict with canonical facts, block publish and flag review.

### D) Setup Multi-Track

Schema direction:
- `setup_tracks.dev`
- `setup_tracks.non_dev`

UI direction:
- Show both tracks when present.
- Default non-dev first for broad audience pages.

### E) Publish + Index Gates

Add computed readiness signals:
- `quality.required_sections_complete` (summary, pricing, models, setup, faq)
- `quality.volatiles_fresh` (models/pricing/limits freshness)
- `quality.conflicts_count`
- `quality.score`

Index policy:
- If gates pass: `index,follow`
- Else: `noindex,follow`

Recommendation:
- Keep tool pages `noindex,follow` until this gate ships.

## Suggested Admin UX Additions

1. Canonical Facts panel:
- Latest models comparison
- Setup tracks (dev/non-dev)
- Locked FAQs
- Last verified + source links

2. Quality panel:
- Required section status
- Volatile freshness status
- Conflict count
- Index readiness status

3. Actions:
- Rehunt full
- Regenerate FAQ only
- Regenerate models only
- Regenerate setup only
- Recompute index readiness

## What to Build First (Priority)

1. Index gate (`noindex` by default until ready).
2. Canonical model split (`latest` vs `raw`) and UI render update.
3. FAQ volatile-fact guard.
4. Setup multi-track schema + UI.
5. Admin canonical-facts editing panel.

## Relevant Files (recently touched)

- `src/lib/hunter/services/model-inventory.ts`
- `src/lib/hunter/phases/analysis.ts`
- `src/lib/hunter/services/prompts.ts`
- `src/lib/hunter/utils.ts`
- `src/lib/hunter/services/gemini.ts`
- `src/lib/pricing/v2-mapper.ts`
- `src/lib/hunter/validation/schema-validator.ts`
- `src/lib/hunter/orchestrator.ts`
- `scripts/hunter.ts`

## Operational Note

Inventory API path will use provider keys if present (`inventoryApiKeys` config).
Docs fallback works without keys for OpenAI/Anthropic model pages.

