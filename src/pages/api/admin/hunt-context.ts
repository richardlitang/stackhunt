/**
 * API: Context-First Hunt
 * POST /api/admin/hunt-context
 *
 * Discovers and ranks tools for a "Best X for Y" context.
 * Rate limited (5/minute) - this is an expensive operation.
 */

import type { APIRoute } from 'astro';
import {
  checkRateLimit,
  rateLimitResponse,
  addRateLimitHeaders,
  getClientIP,
  hashIdentifier,
} from '@/lib/rate-limit';

interface Guidance {
  mustIncludeTools?: string[];
  sourcesToCheck?: string[];
  specialInstructions?: string;
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  // Rate limit check (5 context hunts/minute - very expensive)
  const ip = getClientIP(request, clientAddress);
  const hashedIP = hashIdentifier(ip);
  const rateLimit = await checkRateLimit(hashedIP, '/api/admin/hunt-context');

  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit);
  }

  try {
    const body = await request.json();
    const { contextQuery, maxTools, publish, guidance } = body as {
      contextQuery: string;
      maxTools?: number;
      publish?: boolean;
      guidance?: Guidance;
    };

    if (!contextQuery || typeof contextQuery !== 'string') {
      return addRateLimitHeaders(
        new Response(JSON.stringify({ success: false, error: 'Context query is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }),
        rateLimit
      );
    }

    // Dynamically import the hunter (server-side only)
    const { createHunter } = await import('@/lib/hunter');

    const hunter = createHunter({ isDraftMode: !publish });

    const result = await hunter.huntContext({
      contextQuery,
      maxTools: maxTools || 5,
      guidance,
    });

    return addRateLimitHeaders(
      new Response(JSON.stringify(result), {
        status: result.success ? 200 : 500,
        headers: { 'Content-Type': 'application/json' },
      }),
      rateLimit
    );
  } catch (err) {
    console.error('Context Hunt API error:', err);
    return addRateLimitHeaders(
      new Response(JSON.stringify({ success: false, error: (err as Error).message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }),
      rateLimit
    );
  }
};
