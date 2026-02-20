# StackHunt Ops Playbook

## Purpose
Operational checklist for cron jobs, queue processing, and data maintenance.

---

## Cron Jobs (Vercel)

Configured in `vercel.json`.

- `/api/cron/cleanup-rate-limits` — daily at 00:00 UTC
- `/api/cron/hunt` — every 6 hours
- `/api/cron/pricing-refresh` — weekly Monday 03:00 UTC

**Auth:** All cron endpoints require `CRON_SECRET` via `Authorization: Bearer <secret>`.

---

## Queue Processing

- Primary worker: `/api/cron/hunt` (Vercel cron)
- Local worker alternative:
  - `npm run queue:worker -- --interval 6h --batch 5`
- Fairness controls:
  - Claim ordering is fairness-aware in `claim_hunt_queue_item` (source/context in-flight load, then priority/FIFO).
  - Admin queue API enforces:
    - `HUNT_QUEUE_CONTEXT_PENDING_CAP` (default 20)
    - `HUNT_QUEUE_SOURCE_PENDING_CAP` (default 400)
  - Scheduled re-hunt scripts trim enqueue volume to remaining `source='scheduled'` capacity.

---

## Pricing Refresh Loop

1) Cron calls `/api/cron/pricing-refresh`
2) RPC `enqueue_pricing_refresh(days, priority, limit)` inserts price_only jobs
3) Queue worker processes `hunt_queue` items with `hunt_type = price_only`

---

## Manual Commands

- Run a single hunt:
  - `npm run hunt -- --tool="Notion"`

- Process queue once:
  - `npm run queue:worker -- --once`

- Discover topics:
  - `npm run discover-topics`

- Verify corrections:
  - `npm run verify-corrections`

- Verify affiliate links:
  - `npm run verify-affiliates`

- Regenerate embeddings:
  - `npm run regenerate-embeddings`

- Recompute context count semantics:
  - `npx tsx scripts/backfill-context-counts.ts`

- Verify context count consistency:
  - `npx tsx scripts/check-context-count-consistency.ts`

- Runtime vs snapshot parity diff (best):
  - `npx tsx scripts/diff-runtime-vs-snapshot.ts --sample=50`

---

## Manual Synthesis (Policy-Restricted Tools)

- Use `docs/HUMAN_SYNTHESIS_PLAYBOOK.md` when a tool is marked `HUMAN_REQUIRED`.
- Primary workspace: `/admin/review` and `/admin/review/[id]`.

---

## Migrations

- Apply migrations locally:
  - `supabase db push`

If not linked:
- `supabase link --project-ref <ref>`

---

## On-call Checks

- Check queue health:
  - `/admin/hunt-queue`
- Check pricing freshness:
  - `pricing_audit` view
- Check correction backlog:
  - `/admin/corrections`

---

## File Locations

- Cron endpoints: `src/pages/api/cron/`
- Queue worker: `scripts/queue-worker.ts`
- Hunter CLI: `scripts/hunter.ts`
- Pricing refresh RPC: `enqueue_pricing_refresh` (migration 032)
