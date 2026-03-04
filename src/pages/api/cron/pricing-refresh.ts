/**
 * Pricing Refresh Cron
 * POST /api/cron/pricing-refresh
 *
 * Enqueues stale items for price_only hunts.
 */

import type { APIRoute } from 'astro';
import { getAdminClient } from '@/lib/supabase';
import { ApiResponse } from '@/lib/api-response';
import { verifyCronSecret } from '@/lib/auth';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
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
    const { data, error } = await admin.rpc('enqueue_pricing_refresh', {
      p_days_stale: 120,
      p_priority: 40,
      p_limit: 50,
    });

    if (error) {
      console.error('Pricing refresh error:', error);
      return ApiResponse.internalError('Failed to enqueue pricing refresh');
    }

    return ApiResponse.ok({
      message: 'Pricing refresh enqueued',
      enqueued: data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Pricing refresh cron error:', error);
    return ApiResponse.internalError('Pricing refresh failed');
  }
};

export const GET: APIRoute = async ({ request }) => {
  // Vercel cron executes GET requests.
  return POST({ request } as any);
};
