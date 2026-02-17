/**
 * Rate Limit Cleanup Cron
 * POST /api/cron/cleanup-rate-limits
 *
 * Cleans up expired rate limit entries from the database.
 * Should be called periodically (e.g., hourly) via cron.
 */

import type { APIRoute } from 'astro';
import { getAdminClient } from '@/lib/supabase';
import { ApiResponse } from '@/lib/api-response';
import { verifyCronSecret } from '@/lib/auth';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  // Verify authorization
  const authResult = verifyCronSecret(request, {
    secret: import.meta.env.CRON_SECRET,
    isDev: import.meta.env.DEV,
    isProd: import.meta.env.PROD,
  });
  if (!authResult.valid) {
    if (authResult.error === 'Server misconfiguration') {
      return ApiResponse.internalError('Server misconfiguration');
    }
    return ApiResponse.unauthorized('Invalid cron secret');
  }

  try {
    const admin = getAdminClient();

    // Delete expired rate limit entries (older than 1 hour)
    const { data, error } = await admin
      .from('rate_limits')
      .delete()
      .lt('window_end', new Date().toISOString())
      .select('count');

    if (error) {
      console.error('Rate limit cleanup error:', error);
      return ApiResponse.internalError('Failed to cleanup rate limits');
    }

    const deletedCount = data?.length || 0;

    return ApiResponse.ok({
      message: 'Rate limit cleanup completed',
      deleted: deletedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Cron cleanup error:', error);
    return ApiResponse.internalError('Cleanup failed');
  }
};

// Also support GET for manual testing in development
export const GET: APIRoute = async ({ request }) => {
  if (import.meta.env.PROD) {
    return ApiResponse.forbidden('GET not allowed in production');
  }

  return POST({ request } as any);
};
