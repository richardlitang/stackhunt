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

## Notes

- Use `npm run hunt` for single hunts or queue actions.
- Use `npm run queue:worker` for continuous queue processing.
- Vercel cron handles `/api/cron/hunt` and `/api/cron/pricing-refresh`.
