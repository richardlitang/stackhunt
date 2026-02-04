# Cron Job Schedule

All cron jobs are configured in `vercel.json` and protected by `CRON_SECRET`.

## Active Crons

| Job | Schedule | Frequency | Purpose | Status |
|-----|----------|-----------|---------|--------|
| **cleanup-rate-limits** | `0 0 * * *` | Daily @ midnight UTC | Clean up expired rate limit entries | ✅ Active |
| **hunt** | `0 6 * * *` | Daily @ 6am UTC | Process content queue (max 3 items per run) | ✅ Active |
| **pricing-refresh** | `0 3 * * 1` | Weekly Mon @ 3am UTC | Enqueue stale tools for price updates (90+ days) | ✅ Active |
| **discover-topics** | `0 4 * * 0` | Weekly Sun @ 4am UTC | AI-powered content gap analysis and topic suggestions | ✅ Active |
| **verify-corrections** | `0 2 * * 0` | Weekly Sun @ 2am UTC | AI verification of user-submitted corrections | ✅ Active |

## Cron Schedule Timeline (UTC)

```
Sunday (Weekly)
├─ 02:00 - verify-corrections (AI batch verification)
└─ 04:00 - discover-topics (AI topic discovery)

Monday (Weekly)
└─ 03:00 - pricing-refresh (enqueue stale items)

Daily
├─ 00:00 - cleanup-rate-limits (housekeeping)
└─ 06:00 - hunt (content generation queue)
```

## Job Details

### cleanup-rate-limits
**File:** `src/pages/api/cron/cleanup-rate-limits.ts`
- Deletes rate_limits entries older than 1 hour
- Prevents database bloat
- Low cost, fast execution
- No external API calls

### hunt
**File:** `src/pages/api/cron/hunt.ts`
- Processes up to 3 items from hunt_queue per run
- Creates reviews as DRAFTS (requires human approval)
- Uses Serper API (12 queries per tool) + Gemini (2-pass synthesis)
- Cost: ~$0.15-0.30 per tool (Gemini + Serper)
- Timeout: Stays within Vercel's function limits
- **Early exit:** Stops on first failure to prevent cascade

### pricing-refresh
**File:** `src/pages/api/cron/pricing-refresh.ts`
- Enqueues tools with stale pricing (90+ days since last update)
- Uses RPC: `enqueue_pricing_refresh(p_days_stale: 90, p_priority: 40, p_limit: 50)`
- Queued items processed by `hunt` cron
- No direct API calls (just DB operation)

### discover-topics
**File:** `src/pages/api/cron/discover-topics.ts`
- Analyzes coverage gaps across categories
- Identifies stale content (90+ days old)
- Uses Gemini 2.0 Flash to generate editorial suggestions
- Inserts proposals into `editorial_topics` table (status: 'proposed')
- Cost: ~$0.01-0.05 per run
- **Thresholds:**
  - Creates 5 new topic suggestions per run (configurable)
  - Flags top 3 stale contexts for refresh

### verify-corrections
**File:** `src/pages/api/cron/verify-corrections.ts`
- Only runs if thresholds exceeded:
  - **Pending corrections ≥ 50** OR
  - **Oldest pending > 30 days**
- Batches corrections by tool (deduplication)
- AI verification: confirmed, rejected, or inconclusive
- Max 50 tools per run (cost ceiling)
- Sends Slack summary if webhook configured
- **Tables:**
  - Updates `corrections` with AI verdict
  - Logs batch in `verification_batches`

## Security

All endpoints require `CRON_SECRET` via `Authorization: Bearer <secret>` header.

**Fail-closed policy:**
- Production REQUIRES CRON_SECRET
- Development allows bypass for local testing
- Missing secret in prod = 500 error (not 401)

## Environment Variables

Required for crons:
- `CRON_SECRET` - Vercel cron authentication
- `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` - Database access
- `GEMINI_API_KEY` - AI generation (hunt, discover-topics, verify-corrections)
- `SERPER_API_KEY` - Web search (hunt only)

Optional:
- `SLACK_WEBHOOK_URL` - Notifications (verify-corrections)

## Cost Estimates (Monthly)

| Job | Frequency | API Calls | Est. Cost |
|-----|-----------|-----------|-----------|
| cleanup-rate-limits | 30x/month | None | $0 |
| hunt | 30x/month | 90 Serper + Gemini | $13.50 (3 tools/day) |
| pricing-refresh | 4x/month | None (enqueue only) | $0 |
| discover-topics | 4x/month | 4 Gemini | $0.20 |
| verify-corrections | 4x/month | Variable (threshold-based) | $0-5 |
| **Total** | | | **~$14-19/month** |

## Debugging

Test crons locally:
```bash
# Set CRON_SECRET in .env (optional in dev)
export CRON_SECRET="your-secret"

# Call endpoint with secret
curl -X GET http://localhost:4321/api/cron/hunt \
  -H "Authorization: Bearer your-secret"
```

Check cron execution logs in Vercel dashboard:
1. Go to project → Cron Jobs tab
2. View execution history and errors
3. Check function logs for detailed output

## Migration Notes

**V5 Changes (2026-02-04):**
- Fixed `discover-topics.ts` to use new Gemini SDK (`client.models.generateContent`)
- Added `discover-topics` to vercel.json (weekly Sun @ 4am)
- Added `verify-corrections` to vercel.json (weekly Sun @ 2am)
- Old API (`getGenerativeModel`) removed

**Previous:**
- Only 3 crons active (cleanup, hunt, pricing-refresh)
- Topic discovery and verification were manual/unused
