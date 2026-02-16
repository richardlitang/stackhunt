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
- `qa-autopilot.ts` — End-to-end QA loop (recompute gate snapshots, publish safe drafts, refresh volatile queue, process queue batch)
- `queue-blocked-rehunt.ts` — Escalation lane: queue full re-hunts for latest blocked drafts

## Notes

- Use `npm run hunt` for single hunts or queue actions.
- Use `npm run queue:worker` for continuous queue processing.
- Vercel cron handles `/api/cron/hunt` and `/api/cron/pricing-refresh`.

## QA Runbook

- Dry run (no writes): `npm run qa:autopilot -- --dry-run --skip-worker`
- Full apply run: `npm run qa:autopilot`
- Cron-safe apply run: `npm run qa:autopilot:cron`

The cron-safe wrapper uses lower limits (`max-publish=10`, `worker-batch=3`) to keep each run bounded and reduce accidental mass publish risk.
The autopilot flow also posts a summary to `DISCORD_WEBHOOK_URL` / `SLACK_WEBHOOK_URL` when configured.
