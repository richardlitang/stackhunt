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

