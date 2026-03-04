# Content Queue Workflow

Last verified: 2026-03-05

## Overview

Content ideas flow through two tables:
1. **content_ideas** - Strategic planning layer with SEO metrics, ROI scoring
2. **hunt_queue** - Execution layer for the Hunter to process

Related operating standard:
- `docs/SEO_CONTENT_WORKFLOW_PLAN.md` for SEO + helpfulness gates, KPIs, and 30-60-90 rollout.

## Import → Queue Flow

### Automatic Queuing (Priority ≥90)
High-priority items are **automatically** added to hunt_queue when imported via CSV:

```
CSV Import → content_ideas (priority ≥90) → hunt_queue (auto) → Hunter processes
```

### Manual Queuing (Priority <90)
Lower priority items stay in content_ideas and can be manually queued:

```bash
# Queue items with priority ≥80
npm run queue-ideas -- --min-priority 80 --limit 20

# Queue items with priority ≥70
npm run queue-ideas -- --min-priority 70 --limit 10

# Queue ALL pending ideas
npm run queue-ideas -- --all --limit 100
```

## Live Status

Use live data from the app instead of static counts in this document:
- `/admin` for queue snapshot
- `/admin/strategy` for content ideas and auto-queue outcomes
- `/admin/queue` or `/admin/hunt-queue` for detailed queue state

## Admin Dashboard

The dashboard at `/admin` shows:
- **In Queue** - Count from `hunt_queue` where status='pending'
- Not from `content_ideas` (common confusion point)

## CLI Commands

```bash
# Import CSV ideas
npm run import-ideas

# Queue high-priority ideas
npm run queue-ideas -- --min-priority 85 --limit 50

# Run the queue worker to process queue
npm run queue:worker

# Check queue status
# Go to /admin dashboard
```

## Target Audience Migration

Applied migration 016 to expand valid target audiences:
- ✅ HR & recruiting teams
- ✅ Support & customer success
- ✅ Engineering & operations
- ✅ Product & growth teams
- ✅ General business roles

## Strategy Page

Located at `/admin/strategy`:
- Import via **Paste from Gemini** (text CSV)
- Import via **Upload CSV** (file from Ahrefs, SEMrush)
- Shows recent content ideas
- Priority ≥90 items auto-queue to hunt_queue

## Operating Loop

1. Import ideas into `content_ideas`
2. Analyze and approve high-ROI ideas to `hunt_queue`
3. Run worker with `npm run queue:worker`
4. Review generated drafts in `/admin/review`
