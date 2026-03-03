# StackHunt Scripts

Minimal operational scripts for the live content pipeline.

## Core Pipeline

- `hunter.ts` — Main CLI for hunts + strategy gatekeeper
- `queue-worker.ts` — Processes hunt_queue on a schedule
- `discover-topics.ts` — AI topic discovery (gaps, refreshes)
- `import-content-ideas.ts` — CSV import into content_ideas
- `queue-content-ideas.ts` — Promote ideas into hunt_queue

## Maintenance

- `verify-corrections.ts` — AI verification of user corrections
- `verify-affiliate-links.ts` — Affiliate link health checks
- `regenerate-embeddings.ts` — Rebuild item embeddings (after migration)
- `backfill-context-counts.ts` — Recompute explicit context count semantics
- `check-context-count-consistency.ts` — Validate context count semantics against reviews
- `design-pass.mjs` — Frontend design pass (Playwright UI screenshots + Lighthouse CI)
- `qa-autopilot.ts` — End-to-end QA loop (recompute gate snapshots, publish safe drafts, refresh volatile queue, process queue batch)
- `queue-blocked-rehunt.ts` — Escalation lane: queue full re-hunts for latest blocked drafts
- `backfill-decision-intro.ts` — Backfill `review_context.decision_intro` for existing items from latest review claims

## Notes

- Use `npm run hunt` for single hunts or queue actions.
- Use `npm run queue:worker` for continuous queue processing.
- Vercel cron handles `/api/cron/hunt` and `/api/cron/pricing-refresh`.
- Queue fairness guardrails:
  - `HUNT_QUEUE_CONTEXT_PENDING_CAP` (default `20` in admin enqueue API)
  - `HUNT_QUEUE_SOURCE_PENDING_CAP` (default `400` for `source='admin'` and scheduled scripts)

## Hunt Telemetry & Reliability Env

- Timeout controls:
  - `HUNTER_OPERATION_TIMEOUT_MS` (global override)
  - `HUNTER_GEMINI_EVIDENCE_TIMEOUT_MS` (default `300000`)
  - `HUNTER_GEMINI_SYNTHESIS_TIMEOUT_MS` (default `300000`)
  - `HUNTER_GEMINI_EXTRACTION_TIMEOUT_MS` (default `180000`)
- Thinking controls:
  - `HUNTER_GEMINI_SYNTHESIS_THINKING_LEVEL` (`LOW|MEDIUM|HIGH`, default `MEDIUM`)
  - `HUNTER_GEMINI_EXTRACTION_THINKING_LEVEL` (`LOW|MEDIUM|HIGH`)
- Timeout fallback controls:
  - `HUNTER_GEMINI_SYNTHESIS_TIMEOUT_FALLBACK_MODEL` (default fast/cheap tier model)
  - `HUNTER_GEMINI_SYNTHESIS_TIMEOUT_FALLBACK_THINKING_LEVEL` (`LOW|MEDIUM|HIGH`, default `LOW`)
- Cost estimate controls (used for CLI telemetry output):
  - `HUNTER_COST_PER_MILLION_TOKENS_RESEARCH` (default `0.3`)
  - `HUNTER_COST_PER_MILLION_TOKENS_ANALYSIS` (default `0.6`)
  - `HUNTER_COST_PER_MILLION_TOKENS_OTHER` (default = analysis value)

## QA Runbook

- Dry run (no writes): `npm run qa:autopilot -- --dry-run --skip-worker`
- Full apply run: `npm run qa:autopilot`
- Cron-safe apply run: `npm run qa:autopilot:cron`
- Draft gate audit now reports `actionability` metrics (min threshold, average, below-threshold, missing) via `npm run qa:gates`.
- Draft gate audit can fail fast on strict tool-page QA blockers: `npm run qa:gates -- --max-strict-qa-gate-blockers=0`.
- `qa:autopilot` fail-fast: set `--max-missing-actionability=<n>` (default `0`) to stop runs when `missing_actionability_score` blockers exceed your tolerance.
- `qa:autopilot` also supports `--max-strict-qa-gate-blockers=<n>` (default `0`) to stop runs when strict QA gate blockers appear.
- Pricing fallback report: `npm run qa:pricing-fallback`
- Queue pricing fallback re-hunts (dry run): `npm run qa:queue-pricing-fallback-rehunt`
- Queue pricing fallback re-hunts (apply): `npm run qa:queue-pricing-fallback-rehunt:apply`
- Backfill canonical item fact packs (dry run): `npm run qa:backfill-item-fact-packs`
- Backfill canonical item fact packs (apply): `npm run qa:backfill-item-fact-packs -- --apply --limit=1000`
- Backfill decision intro (dry run): `npm run qa:backfill-decision-intro -- --limit=500`
- Backfill decision intro (apply): `npm run qa:backfill-decision-intro -- --apply --limit=500`
- Backfill decision intro (verbose diagnostics): `npm run qa:backfill-decision-intro -- --limit=500 --verbose`
- Tool page structure gate (template-only, CI-safe): `npm run qa:rendered-tool-pages -- --template-only --sample=15`
- Live production smoke check (multi-slug): `npm run qa:smoke:live -- --slug=figma,mailchimp,zapier`
- Runtime vs snapshot parity diff (best pages): `npm run qa:diff-runtime-snapshot -- --sample=50 --status=draft`
- Runtime vs snapshot parity diff (compare pages): `npm run qa:diff-compare-snapshot -- --sample=50 --status=draft`
- Shadow snapshot compile (draft only): `npm run qa:compile-shadow-snapshots -- --contexts=20 --pairs=30`
- Shadow compile defaults best-candidate review statuses to `published,draft` (admin-controlled path only).
- Override review statuses explicitly: `npm run qa:compile-shadow-snapshots -- --review-statuses=published`
- Optional relaxed gating during rollout: set `FACT_PACK_READINESS_PROFILE=relaxed` when compiling/diffing snapshots.
- Optional best publish profiles:
- `BEST_PUBLISH_PROFILE=balanced` (recommended midpoint, min ranked count = 2)
- `BEST_PUBLISH_PROFILE=long_tail` (aggressive rollout, min ranked count = 1)
- Shadow snapshot publish (dry run): `npm run qa:publish-shadow-snapshots`
- Shadow snapshot publish (apply): `npm run qa:publish-shadow-snapshots -- --apply --best-limit=10 --compare-limit=10`
- Frontend design pass: `npm run design:pass`

The cron-safe wrapper uses lower limits (`max-publish=10`, `worker-batch=3`) to keep each run bounded and reduce accidental mass publish risk.
The autopilot flow also posts a summary to `DISCORD_WEBHOOK_URL` / `SLACK_WEBHOOK_URL` when configured, including `qa:gates` actionability metrics (`min`, `avg`, `below`, `missing`).
