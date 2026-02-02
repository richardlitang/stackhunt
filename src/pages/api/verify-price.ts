/**
 * API Endpoint: POST /api/verify-price
 *
 * Records community price verification votes.
 * When users report inaccurate pricing, automatically queues the tool for re-research.
 *
 * SECURITY: Uses public Supabase client with RLS enforcement.
 * Rate limited to prevent abuse.
 */

import type { APIRoute } from 'astro';
import { supabase } from '@/lib/supabase';
import {
  checkRateLimit,
  hashIdentifier,
  getClientIP,
  rateLimitResponse,
  addRateLimitHeaders,
} from '@/lib/rate-limit';

// Rate limit: 10 verifications per minute per IP
const RATE_LIMIT_CONFIG = { maxRequests: 10, windowSeconds: 60 };

export const POST: APIRoute = async ({ request, clientAddress }) => {
  try {
    // Rate limiting first
    const clientIp = getClientIP(request, clientAddress);
    const ipHash = hashIdentifier(clientIp);

    const rateLimit = await checkRateLimit(ipHash, '/api/verify-price', RATE_LIMIT_CONFIG);
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit);
    }

    const { toolId, toolName, accurate } = await request.json();

    if (!toolId || typeof accurate !== 'boolean') {
      return addRateLimitHeaders(
        new Response(
          JSON.stringify({ error: 'Missing required fields' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        ),
        rateLimit
      );
    }

    // Validate toolId format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(toolId)) {
      return addRateLimitHeaders(
        new Response(
          JSON.stringify({ error: 'Invalid tool ID format' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        ),
        rateLimit
      );
    }

    // Record the verification using RPC (handles RLS properly)
    // The RPC function will:
    // 1. Record the verification
    // 2. Check for duplicate votes from same IP
    // 3. Queue for re-hunt if inaccurate (via trigger or RPC logic)
    const { data, error: verifyError } = await (supabase.rpc as Function)(
      'record_price_verification',
      {
        p_item_id: toolId,
        p_item_name: toolName || null,
        p_is_accurate: accurate,
        p_ip_hash: ipHash,
      }
    );

    if (verifyError) {
      // Check for specific error codes
      if (verifyError.code === '23505') {
        // Duplicate vote from same IP
        return addRateLimitHeaders(
          new Response(
            JSON.stringify({
              success: false,
              error: 'You have already verified this tool recently',
            }),
            { status: 409, headers: { 'Content-Type': 'application/json' } }
          ),
          rateLimit
        );
      }

      console.error('Error recording price verification:', verifyError.code);
      return addRateLimitHeaders(
        new Response(
          JSON.stringify({ error: 'Failed to record verification' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        ),
        rateLimit
      );
    }

    return addRateLimitHeaders(
      new Response(
        JSON.stringify({
          success: true,
          message: accurate
            ? 'Thank you for verifying!'
            : 'Thanks for reporting! We\'ll verify this within 24 hours.',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      ),
      rateLimit
    );
  } catch (error) {
    console.error('Error in verify-price API');
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
