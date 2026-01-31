/**
 * Pricing Refresh Cron
 * POST /api/cron/pricing-refresh
 *
 * Enqueues stale items for price_only hunts.
 */

import type { APIRoute } from 'astro';
import { getAdminClient } from '@/lib/supabase';
import { ApiResponse } from '@/lib/api-response';

export const prerender = false;

function verifyCronSecret(request: Request): boolean {
  const secret = import.meta.env.CRON_SECRET;
  if (!secret && import.meta.env.DEV) return true;

  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return false;

  return authHeader.slice(7) === secret;
}

export const POST: APIRoute = async ({ request }) => {
  if (!verifyCronSecret(request)) {
    return ApiResponse.unauthorized('Invalid cron secret');
  }

  try {
    const admin = getAdminClient();
    const { data, error } = await admin.rpc('enqueue_pricing_refresh', {
      p_days_stale: 90,
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
  if (import.meta.env.PROD) {
    return ApiResponse.forbidden('GET not allowed in production');
  }

  return POST({ request } as any);
};
