# Decision Log

Last verified: 2026-03-05

Purpose: capture short, durable decisions so we don’t re-debate them later.

Format (newest first):

```
YYYY-MM-DD - Title
Context: ...
Decision: ...
Why: ...
Impact: ...
```

Notes:
- Keep entries short.
- Use concrete dates.

2026-03-03 - Tool Page Editorial v2 Blueprint Adopted
Context: Recent tool pages improved evidence handling but still read as spec sheets due duplicated verdict surfaces, card/list overload, and inconsistent narrative cohesion.
Decision: Adopt editorial-v2 as the next implementation target for `/tool/[slug]`:
- `docs/TOOL_PAGE_EDITORIAL_BLUEPRINT_V2.md`
- `docs/plans/2026-03-03-tool-page-editorial-v2-implementation.md`
Why: Reader retention and decision clarity are now constrained more by page structure and copy flow than by raw fact coverage.
Impact: Upcoming tool-page changes should prioritize narrative-first ordering, contradiction blocking, pricing-first buyer guidance, and reduced decorative section noise before broader rollout.

2026-03-02 - Tool Page Standard v1 + QA Gate + Codex Brief Adopted
Context: Tool pages (`/tool/[slug]`) had strong sourcing/legal guardrails but still showed template-noise and generic decision language in rendered output.
Decision: Adopt tool-page-first quality package in docs as the implementation source of truth:
- `docs/TOOL_PAGE_STANDARD_V1.md`
- `docs/TOOL_PAGE_QA_GATE_V1.md`
- `docs/CODEX_TOOL_PAGE_BRIEF_V1.md`
Why: We need one enforceable contract for page purpose, required evidence, section suppression, and publish/index behavior before extending to `/best` and `/compare`.
Impact: Future tool-page changes should implement against these docs first; publish/index and lint checks should be aligned to this v1 contract before rollout to other page types.

2026-02-20 - Snapshot Compiler Trust Contract (Policy V1)
Context: `/best` and `/compare` are moving toward deterministic snapshot compilers, but confidence, staleness, evidence scope, and conflict behavior were not yet locked as one cross-cutting contract.
Decision: Adopt `compiler_policy_version = 2026-02-20.v1` with four mandatory rules: (1) volatility-tier freshness windows, (2) evidence-tier requirements, (3) explicit conflict state (`disputed`) for critical fields, and (4) explicit count semantics (`all_reviews_count`, `published_reviews_count`, `snapshot_ranked_count`).
Why: Snapshot ranking, publish gating, and UI trust messaging become unstable if these policies drift or are interpreted differently by route-specific logic.
Impact: Future best/compare snapshot rows must carry `policy_version`; critical fields (pricing, plan gating, security/compliance, hard limits) cannot silently resolve conflicts and must either degrade confidence or surface as disputed.

2026-02-19 - Vote Path Hardened with Actor-Key Atomic RPC + Reconciliation
Context: Vote handling still had legacy behavior (`voteType=0` no-op), weaker dedupe semantics, and potential counter drift under concurrency.
Decision: Add migration-backed vote hardening: `votes.actor_key`, unique `(review_id, actor_key)`, atomic `cast_vote` add/switch/remove semantics, and `reconcile_review_vote_counts()` for deterministic counter repair.
Why: Votes are high-volume public writes and require DB-level correctness guarantees, not API-only assumptions.
Impact: Vote remove/switch semantics are now explicit, dedupe is actor-key based, and periodic counter reconciliation is available via `qa:reconcile-votes`.
Status (2026-02-22): Superseded for active thumbs feedback. Public thumbs feedback now writes structured `review_helpful` signals via `record_signal`; legacy `votes`/`cast_vote` were removed from the live DB. This entry remains as migration-history context.

2026-02-19 - Canonical Price Verification RPC + Deterministic Abuse Risk Scoring
Context: `/api/verify-price` invoked `record_price_verification`, but the function definition was missing from migrations, creating drift risk and no durable moderation signal quality.
Decision: Add migration-backed `public.record_price_verification(...)` with explicit grants, queue refresh behavior for inaccurate reports, and deterministic `risk_score` + `risk_reasons[]` on `price_verifications`.
Why: This restores schema/code parity, keeps moderation explainable, and avoids ML-style opaque abuse decisions.
Impact: Price verification submissions now return reproducible risk signals (`missing_turnstile`, `ip_only_actor_key`, `velocity_spike_*`, `fingerprint_churn`, `origin_mismatch`) and can be audited by admins.

2026-02-19 - Signals Abuse Hardening Moved to DB-Atomic Upsert
Context: `user_signals` abuse checks were partially API-side and non-atomic, so duplicate races and client bypasses could distort community signal aggregates.
Decision: Add DB-level `actor_key` uniqueness (`item_id, signal_id, actor_key`), replace append-only signal writes with RPC upsert in `record_signal`, and recompute `signal_aggregates` in SQL after each upsert.
Why: Abuse controls must live in the database for correctness under concurrency and across all callers.
Impact: Each actor now has one canonical value per signal per item, re-submissions update in place, and aggregate counts remain deterministic.

2026-02-16 - Community Host Source-Type Normalization
Context: Forced Baserow re-hunt showed `community.baserow.io` claims persisted as `source_type='official'`, which weakens legal attribution and hedging behavior.
Decision: Classify forum/community host patterns (`community.`, `forum.`, `discuss.` etc.) as `community` before first-party official matching, and backfill persisted rows via `normalize_community_source_types`.
Why: Community content must remain explicitly community-typed for defensible claims and correct guardrail behavior.
Impact: New and historical claim/review/spec rows on community hosts now normalize to `source_type='community'`.

2026-02-16 - Claim Text Hygiene + Source-Language Guardrails
Context: A live Baserow draft showed malformed/truncated con text and a `Users report...` claim tied to first-party official sources, creating trust/legal risk.
Decision: Strengthen claim normalization/validation to strip Unicode control chars, reject incomplete trailing clauses, and drop community-hedging language when source type is `official`; include `source_type`/`claim_type` in claim ledger `value_json`.
Why: Prevent publication and downstream SaaS use of syntactically broken or legally weak claim language.
Impact: New ETL runs now block these patterns at persistence time and carry richer provenance for audits.

2026-02-16 - One-Time Persisted Claim Hygiene Cleanup
Context: Existing rows already contained malformed/truncated claims and source-language mismatches, so code-only fixes would not repair currently visible content.
Decision: Apply `prune_malformed_claim_text` + `remove_community_hedging_first_party_claims` to clean `claims`, `reviews.pros/cons`, and `items.specs.pros/cons`.
Why: Immediately improve reader-facing quality and reduce legal exposure without waiting for full re-hunt cycles.
Impact: Affected rows were pruned in production; Baserow now retains only defensible cons and no truncated lines.

2026-02-16 - Legacy Claim Metadata Backfill
Context: Historical claim ledger rows (before February 16, 2026) had non-null `source_url` but gaps in `source_domain`, `policy_snapshot`, and `confidence`, reducing audit usefulness.
Decision: Apply `backfill_legacy_claim_metadata` to reconstruct domain + policy snapshot from source URL (with parent-domain policy matching) and assign conservative confidence defaults.
Why: Existing content needed legal/audit metadata quality uplift without waiting for re-hunts.
Impact: Pre-hardening claims now have complete provenance metadata (`95 -> 0` missing `source_domain`, `95 -> 0` missing `policy_snapshot`, `409 -> 0` missing `confidence`).

2026-02-16 - Canonical Queue Completion RPC Restored
Context: Live queue runs revealed `complete_hunt` still writing deprecated `tool_id`, forcing fallback direct updates during completion.
Decision: Replace `complete_hunt(uuid,uuid,uuid,uuid,integer)` with `p_item_id` semantics and `item_id` writes (`fix_complete_hunt_item_id_signature`).
Why: Completion should succeed through canonical RPC, not compatibility fallback, to reduce operational drift and hidden failures.
Impact: Queue completion now supports named `p_item_id` and updates `hunt_queue.item_id` directly.

2026-02-16 - View + Function Security Lints Cleared
Context: Security advisor still flagged `security_definer_view` and `function_search_path_mutable` after claim/policy table RLS lockdown.
Decision: Set `security_invoker=on` for `tools_needing_affiliates` and `freelancer_friendly_tools`, and set explicit `search_path = public, pg_catalog` on `claim_hunt_queue_item(text)` and `set_updated_at_timestamp()`.
Why: These are low-risk, behavior-preserving changes that remove broad privilege ambiguity and reduce accidental policy bypass surfaces.
Impact: Security advisor now only reports extension-placement warnings (`extension_in_public` for `vector` and `pg_trgm`).

2026-02-16 - Source Policy + Claims RLS Lockdown
Context: `claims`, `source_policy_registry`, and `source_policy_review_queue` were externally exposed tables with RLS disabled and broad anon/authenticated grants.
Decision: Enable RLS on all three tables, add explicit deny-all public policies, and revoke `anon`/`authenticated` table privileges; keep service-role access for ETL/admin flows.
Why: These tables contain legal/compliance metadata and claim ledger evidence that should not be public-write/read surfaces.
Impact: Security advisor no longer reports `rls_disabled_in_public` for these tables, and ETL policy/claim writes remain service-role only.

2026-02-16 - Atomic Checkpoint Locking Rolled Out
Context: ETL checkpoint locking was implemented in code, but database rollout status needed an explicit record for incident debugging and auditability.
Decision: Apply migration `atomic_checkpoint_locking` to Supabase project `vhelpqzbtzwiddoebnyy` and verify live signature `save_hunt_checkpoint(uuid, integer, jsonb, integer) -> boolean`.
Why: Queue correctness depends on DB-level atomicity; code-only rollout would leave race conditions unresolved.
Impact: Checkpoint writes now enforce expected-version matching atomically in the database, returning explicit conflict outcomes.

2026-02-16 - ETL Hardening Parity + Provenance Enforcement
Context: Batch/stale synthesis paths were bypassing canonical persistence guardrails, and claim provenance/policy fallback/checkpoint locking still had avoidable legal and data-quality risk.
Decision: Make canonical persistence mandatory for batch/stale completion, enforce source-url provenance in persistence normalization, restrict official fallback matching to exact/subdomain without overriding explicit policy, and move checkpoint version checks into SQL atomically.
Why: This removes path divergence, improves reader/SaaS data quality, and materially reduces publication/legal exposure from unsupported claims or policy bypass.
Impact: Queue worker now creates real reviews via persistence for batch/stale items, invalid claim sources are dropped, checkpoint races return explicit conflicts, and ongoing monitoring lives in `docs/ETL_QUALITY_LEGAL_TRACKER.md`.

2026-02-08 - Phase 1 vNext Implementation Snapshot
Context: The Intelligence Platform vNext Phase 1 work introduced broad quality/legal gate changes across hunter, rendering, and indexing paths.
Decision: Treat commit `093421f` as the canonical implementation snapshot for Phase 1 stop-harm quality/legal gates and hunt reliability hardening.
Why: This anchors future debugging, follow-on work, and LLM context to one concrete code baseline instead of scattered assumptions.
Impact: Future tasks should reference `093421f` first when reasoning about draft-first behavior, noindex/sitemap gating, section publishability, prompt-boundary source filtering, and resume/preflight hunt behavior.

2026-02-08 - Canonical Hunt Freshness Basis
Context: Queue prioritization and “what is stale” decisions were inconsistent because `items.updated_at` and review timestamps were being mixed ad hoc.
Decision: Use `max(last_terminal_hunt_at, last_review_at)` as the single freshness basis. `last_terminal_hunt_at` comes from `hunt_queue.completed_at` for `completed/failed` and `hunt_queue.research_completed_at` for `research_complete`. Apply a 24-hour cooldown (priority floor) for recently-run tools.
Why: `items.updated_at` changes for metadata writes and does not represent hunt freshness. Terminal queue timestamps and review updates are the only operationally relevant signals.
Impact: `scripts/prioritize-by-staleness.ts` and `scripts/find-oldest-items.ts` now compute priorities/reports from the same deterministic basis, eliminating timestamp debates.
