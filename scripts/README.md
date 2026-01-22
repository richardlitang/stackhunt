# StackHunt Scripts

This directory contains operational scripts for maintaining StackHunt.

## Affiliate Link Verification

**File:** `verify-affiliate-links.ts`

Verifies that affiliate links are still active and accessible. This prevents broken links from appearing on the site.

### Running Manually

```bash
# Ensure environment variables are set
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_KEY="your-service-key"

# Run the script
tsx scripts/verify-affiliate-links.ts
```

### Automated Execution

#### Option 1: GitHub Actions (Recommended)

The workflow is already configured at `.github/workflows/verify-affiliate-links.yml`.

**Setup:**
1. Add secrets to GitHub repository:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
2. The workflow runs automatically daily at 3:00 AM UTC
3. Can be manually triggered from the Actions tab

#### Option 2: System Cron Job

For self-hosted deployments:

```bash
# Edit crontab
crontab -e

# Add this line (runs daily at 3:00 AM local time)
0 3 * * * cd /path/to/washington && /usr/local/bin/tsx scripts/verify-affiliate-links.ts >> /var/log/affiliate-verify.log 2>&1
```

**Requirements:**
- Node.js 20+ installed
- tsx installed globally: `npm install -g tsx`
- Environment variables set in cron environment or loaded via script

#### Option 3: Vercel Cron Jobs

For Vercel deployments, you can use Vercel Cron:

1. Create an API endpoint that runs the verification
2. Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/verify-links",
      "schedule": "0 3 * * *"
    }
  ]
}
```

### What It Does

1. Fetches all active affiliate links from the database
2. Performs HEAD requests to verify each link is reachable
3. Updates `verification_status` and `last_verified_at` in the database
4. Auto-disables links that have been broken for 7+ days (via DB trigger)
5. Only verifies links that haven't been checked in the last 24 hours

### Verification Status Values

- `healthy` - Link is accessible (HTTP 200-299)
- `broken` - Link returns 404, 410, or other client error
- `unknown` - Network error or server error (might be temporary)
- `pending` - Verification scheduled but not yet run
- `expired` - Link intentionally expired (manual flag)

### Network Tier Strategy

- **Tier 1** (PartnerStack, Impact): API-verified (future enhancement)
- **Tier 2** (ShareASale, CJ): HTTP HEAD request only
- **Tier 3** (Manual, Rewardful): HTTP HEAD request only

### Monitoring

The script logs statistics to stdout:
- ✅ Healthy links
- ❌ Broken links
- ⚠️ Unknown status links

Broken links are listed with their URLs for manual review.

### Admin UI

View and manually verify links at: `/admin/affiliate-links`

Features:
- Filter by status, tier, network
- View verification history
- Manually trigger verification for individual links
- View statistics dashboard
