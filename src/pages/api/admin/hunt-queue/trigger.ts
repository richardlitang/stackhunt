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
import { validateSession, COOKIE_NAME, isLegacyToken, validateLegacyToken } from '@/lib/auth';
import { timingSafeEqual } from 'crypto';

export const prerender = false;

// Helper to do timing-safe comparison
function safeCompareSecrets(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) return false;
  try {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) {
      // Still do comparison to prevent timing leak
      timingSafeEqual(bufA, bufA);
      return false;
    }
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Parse request body
    const body = await request.json().catch(() => ({}));
    const maxItems = Math.min(Math.max(body.maxItems || 5, 1), 20); // 1-20 items
    const webhookSecret = body.webhookSecret;

    // Auth check - either session-based or webhook secret
    // For webhook calls (e.g., from cron services), use QUEUE_WEBHOOK_SECRET
    const envWebhookSecret = import.meta.env.QUEUE_WEBHOOK_SECRET;
    let isAuthenticated = false;

    if (webhookSecret) {
      // Webhook auth with timing-safe comparison
      isAuthenticated = safeCompareSecrets(webhookSecret, envWebhookSecret);
    } else {
      // Session auth - validate admin session properly
      const sessionToken = cookies.get(COOKIE_NAME)?.value;
      if (sessionToken) {
        if (isLegacyToken(sessionToken)) {
          isAuthenticated = validateLegacyToken(sessionToken);
        } else {
          const session = await validateSession(sessionToken);
          isAuthenticated = session.valid;
        }
      }
    }

    if (!isAuthenticated) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check required env vars (don't leak which ones are missing)
    const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'GEMINI_API_KEY', 'SERPER_API_KEY'];
    const missing = required.filter((k) => !import.meta.env[k] && !process.env[k]);

    if (missing.length > 0) {
      console.error('Missing environment variables:', missing.join(', '));
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Server configuration error',
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
    const successes: Array<{ tool: string; context?: string }> = [];
    const maxTokensPerRun = (() => {
      const raw = getEnv('HUNTER_MAX_TOKENS_PER_RUN');
      const parsed = raw ? Number(raw) : NaN;
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 600000;
    })();

    let result: { processed: number; succeeded: number; failed: number; tokensUsed: number };
    let processedTitles: string[] = [];

    try {
      const batchResult = await hunter.processQueueBatch(maxItems, { maxTokens: maxTokensPerRun });
      result = {
        processed: batchResult.processed,
        succeeded: batchResult.succeeded,
        failed: batchResult.failed,
        tokensUsed: batchResult.tokensUsed,
      };

      // Collect errors and successes
      for (const r of batchResult.results) {
        if (!r.success && r.error) {
          errors.push({ tool: r.toolName || 'Unknown', error: r.error });
        } else if (r.success && r.toolName) {
          successes.push({ tool: r.toolName, context: r.contextTitle });
        }
      }
      processedTitles = Array.from(new Set([
        ...successes.map(s => s.tool),
        ...errors.map(e => e.tool),
      ].filter(t => t && t !== 'Unknown')));
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
            error: 'Critical API failure',
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
        successes,
        processedTitles,
        errors,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: result.processed,
        succeeded: result.succeeded,
        failed: result.failed,
        tokensUsed: result.tokensUsed,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Queue trigger error:', error instanceof Error ? error.message : error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
