# Content Queue Workflow

## Overview

Content ideas flow through two tables:
1. **content_ideas** - Strategic planning layer with SEO metrics, ROI scoring
2. **hunt_queue** - Execution layer for the Hunter to process

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

## Current Status (as of 2026-01-23)

### Content Ideas
- **200 total ideas** imported
- **60 queued** (status='queued', avg priority 84.9)
- **140 pending** (status='pending', avg priority 82.4)

### Hunt Queue
- **50 pending** - Ready for Hunter to process
- **10 completed** - Already processed

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

# Run the Hunter to process queue
npm run hunt:worker

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

## Next Steps

1. Check admin dashboard - should show "50 In Queue"
2. Run hunter: `npm run hunt:worker`
3. Monitor results in admin review queue
4. Queue more ideas as needed with `npm run queue-ideas`
