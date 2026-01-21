/**
 * API: Run Hunter from Admin UI
 * POST /api/admin/hunt
 *
 * Rate limited to prevent API credit draining.
 */

import type { APIRoute } from 'astro';
import {
  checkRateLimit,
  rateLimitResponse,
  addRateLimitHeaders,
  getClientIP,
  hashIdentifier,
} from '@/lib/rate-limit';

export const POST: APIRoute = async ({ request, clientAddress }) => {
  // Rate limit check (10 hunts/minute)
  const ip = getClientIP(request, clientAddress);
  const hashedIP = hashIdentifier(ip);
  const rateLimit = await checkRateLimit(hashedIP, '/api/admin/hunt');

  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit);
  }

  try {
    const body = await request.json();
    const { toolName, contextTitle, categorySlug, publish } = body;

    if (!toolName || typeof toolName !== 'string') {
      return addRateLimitHeaders(
        new Response(JSON.stringify({ success: false, error: 'Tool name is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }),
        rateLimit
      );
    }

    // Dynamically import the hunter (server-side only)
    const { createHunter } = await import('@/lib/hunter');

    const hunter = createHunter({ isDraftMode: !publish });

    const result = await hunter.hunt({
      toolName,
      contextTitle: contextTitle || undefined,
      categorySlug: categorySlug || undefined,
    });

    return addRateLimitHeaders(
      new Response(JSON.stringify(result), {
        status: result.success ? 200 : 500,
        headers: { 'Content-Type': 'application/json' },
      }),
      rateLimit
    );
  } catch (err) {
    console.error('Hunt API error:', err);
    return addRateLimitHeaders(
      new Response(
        JSON.stringify({ success: false, error: (err as Error).message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      ),
      rateLimit
    );
  }
};
