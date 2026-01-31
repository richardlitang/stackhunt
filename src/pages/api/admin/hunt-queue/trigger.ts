/**
 * Admin API: Trigger Queue Processing
 * POST /api/admin/hunt-queue/trigger
 *
 * Manually triggers processing of the hunt queue.
 * Optionally specify max items to process.
 *
 * Request body:
 * {
 *   "maxItems": 5,          // Optional: max items to process (default: 5)
 *   "webhookSecret": "..."  // Optional: for webhook auth instead of session
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "processed": 3,
 *   "succeeded": 2,
 *   "failed": 1,
 *   "errors": [...]
 * }
 */

import type { APIRoute } from 'astro';
import { getAdminClient } from '@/lib/supabase';
import { Hunter } from '@/lib/hunter';
import { ApiError } from '@/lib/hunter/errors';
import { alertCritical, alertQueueSummary } from '@/lib/notifications/discord';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    // Parse request body
    const body = await request.json().catch(() => ({}));
    const maxItems = Math.min(Math.max(body.maxItems || 5, 1), 20); // 1-20 items
    const webhookSecret = body.webhookSecret;

    // Auth check - either session-based or webhook secret
    // For webhook calls (e.g., from cron services), use QUEUE_WEBHOOK_SECRET
    const envWebhookSecret = import.meta.env.QUEUE_WEBHOOK_SECRET;

    if (webhookSecret) {
      // Webhook auth
      if (!envWebhookSecret || webhookSecret !== envWebhookSecret) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid webhook secret' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // Session auth - would normally check admin session here
      // For now, just verify we're in a valid environment
      const admin = getAdminClient();
      const { error: authError } = await admin.from('hunt_queue').select('id').limit(1);
      if (authError) {
        return new Response(
          JSON.stringify({ success: false, error: 'Unauthorized' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Check required env vars
    const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'GEMINI_API_KEY', 'SERPER_API_KEY'];
    const missing = required.filter((k) => !import.meta.env[k] && !process.env[k]);

    if (missing.length > 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Missing environment variables: ${missing.join(', ')}`,
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get env vars (Astro or Node.js)
    const getEnv = (key: string) =>
      (import.meta.env as Record<string, string>)[key] || process.env[key];

    // Initialize Hunter
    const hunter = new Hunter({
      supabaseUrl: getEnv('SUPABASE_URL')!,
      supabaseServiceKey: getEnv('SUPABASE_SERVICE_ROLE_KEY')!,
      geminiApiKey: getEnv('GEMINI_API_KEY')!,
      serperApiKey: getEnv('SERPER_API_KEY')!,
      isDraftMode: true,
    });

    // Process queue
    const errors: Array<{ tool: string; error: string }> = [];
    let result: { processed: number; succeeded: number; failed: number };

    try {
      const batchResult = await hunter.processQueueBatch(maxItems);
      result = {
        processed: batchResult.processed,
        succeeded: batchResult.succeeded,
        failed: batchResult.failed,
      };

      // Collect errors
      for (const r of batchResult.results) {
        if (!r.success && r.error) {
          errors.push({ tool: r.toolName || 'Unknown', error: r.error });
        }
      }
    } catch (error) {
      // Check for critical API errors
      if (error instanceof ApiError && error.isCritical) {
        const discordUrl = getEnv('DISCORD_WEBHOOK_URL');
        if (discordUrl) {
          await alertCritical(discordUrl, {
            title: `${error.service.toUpperCase()} API Failure`,
            message: error.message,
            service: error.service,
            action:
              error.type === 'auth_error'
                ? 'Check and update API key'
                : 'Check billing and quota limits',
          });
        }

        return new Response(
          JSON.stringify({
            success: false,
            error: error.message,
            errorType: error.type,
            isCritical: true,
          }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      throw error;
    }

    // Send Discord summary if configured
    const discordUrl = getEnv('DISCORD_WEBHOOK_URL');
    if (discordUrl && result.processed > 0) {
      await alertQueueSummary(discordUrl, {
        processed: result.processed,
        succeeded: result.succeeded,
        failed: result.failed,
        errors,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: result.processed,
        succeeded: result.succeeded,
        failed: result.failed,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Queue trigger error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
