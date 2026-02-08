# Decision Log

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
