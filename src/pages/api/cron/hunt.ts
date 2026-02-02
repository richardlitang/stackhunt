/**
 * Cron Job: Automated Content Generation
 *
 * Triggered by Vercel Cron to process the content queue.
 * Creates content as DRAFTS requiring human review.
 *
 * Schedule: Configured in vercel.json
 * Security: Protected by CRON_SECRET
 */

import type { APIRoute } from 'astro';
import { createHunter } from '@/lib/hunter';

export const prerender = false;

// Maximum items to process per cron run (stay within Vercel timeout)
const MAX_ITEMS_PER_RUN = 3;

export const GET: APIRoute = async ({ request }) => {
  // Verify cron secret (Vercel sets this header)
  // SECURITY: Fail CLOSED - require secret always (no bypass if unset)
  const authHeader = request.headers.get('authorization');
  const cronSecret = import.meta.env.CRON_SECRET;

  // Require CRON_SECRET in production
  if (!cronSecret && import.meta.env.PROD) {
    console.error('CRITICAL: CRON_SECRET not configured in production');
    return new Response(JSON.stringify({ error: 'Server misconfiguration' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // In development without secret, allow (for local testing only)
  const requiresAuth = cronSecret || import.meta.env.PROD;

  if (requiresAuth && authHeader !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const results: Array<{
    toolName?: string;
    success: boolean;
    error?: string;
    reviewId?: string;
  }> = [];

  try {
    // Create hunter in DRAFT mode
    const hunter = createHunter({ isDraftMode: true });

    // Process up to MAX_ITEMS_PER_RUN from queue
    for (let i = 0; i < MAX_ITEMS_PER_RUN; i++) {
      const result = await hunter.processNextFromQueue();

      if (!result.success && result.error === 'No items in queue') {
        // Queue is empty
        break;
      }

      results.push({
        toolName: result.queueItemId,
        success: result.success,
        error: result.error,
        reviewId: result.reviewId || undefined,
      });

      // If this one failed, don't continue (might be a systemic issue)
      if (!result.success) {
        break;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        results,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    const err = error as Error;
    console.error('Cron hunt error:', err.message);

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal processing error',
        processed: results.length,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
