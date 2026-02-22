# Data Model Snapshot (2026-02-06, historical)

## Tables (Public)
- `categories` (10 fields)
- `items` (38 fields)
- `tools` (alias of `items`)
- `item_category_links` (5 fields)
- `contexts` (17 fields)
- `reviews` (18 fields)
- `articles` (14 fields)
- `article_insights` (11 fields)
- `source_policy_registry` (17 fields)
- `source_policy_review_queue` (9 fields)
- `claims` (11 fields)
- `affiliate_offers` (21 fields)
- `votes` (7 fields, legacy table at the time; now removed from live DB)
- `market_state` (24 fields)
- `price_history` (8 fields)
- `click_events` (11 fields)
- `hunt_queue` (28 fields)
- `item_audience_fit` (6 fields)
- `comparison_insights` (22 fields)

## Table Field Notes (High-Level)
- `items`: core identity + SEO + pricing rollups + embeddings + specs/metadata blobs
- `contexts`: SEO-structured context pages (title templates + category linkages)
- `reviews`: contextual review output (score + pros/cons + tags)
- `articles` / `article_insights`: content pipeline and facts for editorial
- `source_policy_registry`: domain policy enforcement for Scout/ETL
- `claims`: claim ledger with source provenance + policy snapshot
- `market_state` / `price_history`: pricing/availability telemetry (triggered history)
- `hunt_queue`: ETL orchestration

## Potential Polish Candidates (Low-Regret)
These are *candidates* to evaluate while the DB is empty.

### 1) `items` pricing fields vs `specs.pricing_data`
Potential redundancy:
- `items.pricing_type` vs `specs.pricing_data.model`
- `effective_starting_price_*`, `normalized_price_per_seat_*` might be derivable from `specs.pricing_data.plans`

Suggestion:
- Decide whether `items.*` pricing rollups are canonical (for fast query) or derived (computed nightly or on write).
- If derived, keep them but move to a computed-refresh flow; if canonical, consider dropping duplicated pricing info from specs.

### 2) `reviews.pros/cons` vs `items.specs.pros/cons`
Potential duplication if both exist in specs.

Suggestion:
- Confirm source of truth. If items-level pros/cons are always derived from the latest review, store only one location and reference the other by pointer.

### 3) `items.avg_score` / `review_count`
Likely derived from `reviews`.

Suggestion:
- If always derived, enforce via trigger/materialized view; otherwise keep in `items` but document the update rules.

### 4) `comparison_insights` has both slugs and ids
Fields:
- `item_a_slug`, `item_b_slug` plus `item_a_id`, `item_b_id`

Suggestion:
- Prefer ids as canonical, slugs as denormalized for read speed. If so, add a background job to keep slugs in sync or drop slugs.

### 5) `item_category_links` uniqueness

Suggestion:
- Ensure a unique constraint on `(item_id, category_id)` to prevent dup links.

### 6) `market_state` vs `items.pricing_*`
Potential split-brain between “current market price” and “pricing extraction data”.

Suggestion:
- Define a single canonical current price for UI (either `market_state` or `items` rollups), and make the other explicitly derived.

### 7) `source_policy_registry.path_overrides`
It’s currently a JSON array in a single row.

Suggestion:
- Consider a separate `source_policy_path_overrides` table if you want easy querying and auditing per override. If not, keep JSON but add a small helper function to enforce structure.

### 8) `article_insights` and `claims`
Both store “fact-ish” items with sources.

Suggestion:
- Decide when to use each. If `claims` is the canonical provenance ledger, `article_insights` could reference `claim_id` instead of duplicating.

### 9) `items.metadata` and `items.specs` blobs
Large JSON blobs can drift in schema.

Suggestion:
- Introduce a JSON schema version field (e.g., `specs_schema_version`) so you can safely migrate old blobs.

## Next Step (If You Want a Concrete Plan)
- Pick 3–5 of the above candidates and I’ll propose actual SQL migrations with minimal churn.
- I can also add a schema diagram (ERD) or a table-by-table markdown reference.

## Full Field Listing
See `docs/data_model_fields.md` for every table + field.

## Usage Scan (code + migrations)
See `docs/data_model_usage.md` for field-level occurrence counts across `src/`, `scripts/`, and `supabase/migrations`.

### Tables not referenced in app code (only migrations/types)
These appear only in SQL/migrations and types, not in `src/` or `scripts/` queries:
- `market_state`
- `price_history`
- `click_events`
- `item_audience_fit`

If these are future-facing, keep them and add a minimal write/read path. If not, consider dropping them to reduce schema surface area.

### Low-usage or likely redundant fields (candidates to tighten)
These are *candidates* based on low direct usage and/or duplication. Verify before dropping.

`items`
- `base_score_breakdown` (only in migrations/types): consider moving into `specs` or dropping if not surfaced.
- `category_id` vs `item_category_links`: dual category systems may be redundant. Pick canonical linkage.
- `pricing_*` rollups (`effective_starting_price_*`, `normalized_price_per_seat_*`, `pricing_comparison_*`): keep if you want fast comparisons; otherwise compute from `specs.pricing_data` and store in a derived table.
- `metadata` vs `specs`: two JSON blobs can drift. Consider consolidating or versioning.
- `review_context` exists at top-level and inside `specs` in legacy; keep one source of truth.

`reviews`
- `display_order`: only used in lists; if not needed, could be removed or replaced with `published_at` ordering.

`contexts`
- `category_id` vs `function/audience/platform_category_id`: similar redundancy to `items` categories.

`article_insights` vs `claims`
- Both store sourced facts. If `claims` becomes canonical provenance, consider referencing claims from `article_insights` instead of duplicating.

## Planned/Future-Looking Tables (keep)
These are already used in UI/routes and appear to be strategic:
- `articles` (rendered at `src/pages/articles/[slug].astro` and `src/pages/articles/index.astro`, admin at `src/pages/api/admin/articles.ts`)
- `article_insights` (persisted in `src/lib/hunter/phases/persistence.ts`)
- `claims` (persisted in `src/lib/hunter/phases/persistence.ts`)
- `source_policy_registry` and `source_policy_review_queue` (enforced in Scout/ETL)
- `hunt_queue` (core orchestration)

## Suggested Next Pass
Pick a few targets and I’ll draft migration(s):
1) Drop or move unused tables (`market_state`, `price_history`, `click_events`, `item_audience_fit`) if not planned.
2) Consolidate category linkage (single path: `item_category_links` + remove `items.category_id` and `contexts.category_id`), or commit to dual with explicit semantics.
3) Decide whether pricing rollups are canonical or derived; if derived, move to computed view/table.
4) Remove `base_score_breakdown` or move into `specs` if not surfaced.
5) Add a JSON schema version field for `specs`/`metadata` if you keep both.
