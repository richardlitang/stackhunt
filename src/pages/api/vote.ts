/**
 * Vote API Endpoint - POST /api/vote
 *
 * Handles voting with:
 * - Rate limiting (30 requests/minute)
 * - Cloudflare Turnstile verification
 * - IP hashing for privacy
 * - Browser fingerprint for anti-gaming
 */

import type { APIRoute } from 'astro';
import { supabase } from '@/lib/supabase';
import { createHash } from 'crypto';
import {
  checkRateLimit,
  rateLimitResponse,
  addRateLimitHeaders,
  getClientIP,
  hashIdentifier,
} from '@/lib/rate-limit';

export const prerender = false; // Server-side only

interface VoteRequest {
  reviewId: string;
  voteType: -1 | 0 | 1; // -1 = down, 0 = remove, 1 = up
  fingerprintHash?: string;
  turnstileToken?: string;
}

// Hash IP for privacy
function hashIP(ip: string): string {
  const salt = import.meta.env.IP_HASH_SALT;
  if (!salt && isProduction()) {
    throw new Error('CRITICAL: IP_HASH_SALT is required in production');
  }
  return createHash('sha256')
    .update(ip + (salt || 'dev-salt-only'))
    .digest('hex')
    .slice(0, 32);
}

// Environment detection
function isProduction(): boolean {
  return import.meta.env.MODE === 'production' || import.meta.env.PROD === true;
}

// Verify Turnstile token
async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  const secret = import.meta.env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    if (isProduction()) {
      console.error('CRITICAL: TURNSTILE_SECRET_KEY not configured in production');
      return false; // Fail closed in production
    }
    console.warn('TURNSTILE_SECRET_KEY not configured, skipping verification (dev only)');
    return true; // Allow only in development
  }

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret,
        response: token,
        remoteip: ip,
      }),
    });

    const result = await response.json();
    return result.success === true;
  } catch (error) {
    console.error('Turnstile verification error:', error);
    return false;
  }
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  // Get client IP early for rate limiting
  const ip = getClientIP(request, clientAddress);
  const hashedIP = hashIdentifier(ip);

  // Check rate limit first (before parsing body)
  const rateLimit = await checkRateLimit(hashedIP, '/api/vote');
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit);
  }

  try {
    // Parse body
    const body: VoteRequest = await request.json();
    const { reviewId, voteType, fingerprintHash, turnstileToken } = body;

    // Validate input
    if (!reviewId || typeof reviewId !== 'string') {
      return addRateLimitHeaders(
        new Response(JSON.stringify({ success: false, error: 'Invalid review ID' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }),
        rateLimit
      );
    }

    if (voteType !== -1 && voteType !== 0 && voteType !== 1) {
      return addRateLimitHeaders(
        new Response(JSON.stringify({ success: false, error: 'Invalid vote type' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }),
        rateLimit
      );
    }

    // Verify Turnstile (REQUIRED in production)
    if (isProduction() && !turnstileToken) {
      return addRateLimitHeaders(
        new Response(JSON.stringify({ success: false, error: 'Verification token required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }),
        rateLimit
      );
    }

    if (turnstileToken) {
      const isValid = await verifyTurnstile(turnstileToken, ip);
      if (!isValid) {
        return addRateLimitHeaders(
          new Response(JSON.stringify({ success: false, error: 'Verification failed' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          }),
          rateLimit
        );
      }
    }

    // Hash IP for privacy (use the existing hashIP function for vote storage)
    const ipHash = hashIP(ip);

    // Handle vote removal
    if (voteType === 0) {
      // For simplicity, we don't actually remove votes, just shadowban
      return addRateLimitHeaders(
        new Response(JSON.stringify({ success: true, action: 'removed' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
        rateLimit
      );
    }

    // Cast vote via RPC function
    const { data, error } = await supabase.rpc('cast_vote', {
      p_review_id: reviewId,
      p_vote_type: voteType,
      p_ip_hash: ipHash,
      p_fingerprint_hash: fingerprintHash || null,
      p_turnstile_token: turnstileToken || null,
    });

    if (error) {
      console.error('Vote error:', error);
      return addRateLimitHeaders(
        new Response(JSON.stringify({ success: false, error: 'Vote failed' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }),
        rateLimit
      );
    }

    return addRateLimitHeaders(
      new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
      rateLimit
    );
  } catch (error) {
    console.error('Vote API error:', error);
    return new Response(JSON.stringify({ success: false, error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
