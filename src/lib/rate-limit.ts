/**
 * Rate Limiting Utility
 *
 * Uses Supabase table for persistent rate limiting (no Redis needed).
 * Falls back to allowing requests if DB is unavailable.
 */

import { supabase } from './supabase';
import { createHash } from 'crypto';

export interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  maxRequests: number;
  /** Window size in seconds */
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  current: number;
  limit: number;
  resetAt: Date;
}

// Default limits for different endpoints
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  '/api/vote': { maxRequests: 30, windowSeconds: 60 },           // 30 votes/minute
  '/api/corrections': { maxRequests: 5, windowSeconds: 3600 },   // 5 corrections/hour
  '/api/admin/hunt': { maxRequests: 10, windowSeconds: 60 },     // 10 hunts/minute
  '/api/admin/hunt-context': { maxRequests: 5, windowSeconds: 60 }, // 5 context hunts/minute
  'default': { maxRequests: 60, windowSeconds: 60 },             // 60 requests/minute default
};

/**
 * Hash an identifier (IP address) for privacy
 */
export function hashIdentifier(identifier: string): string {
  const salt = import.meta.env.IP_HASH_SALT || 'stackhunt-rate-limit-salt';
  return createHash('sha256').update(identifier + salt).digest('hex').slice(0, 32);
}

/**
 * Get client IP from request
 */
export function getClientIP(request: Request, clientAddress?: string): string {
  return (
    clientAddress ||
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    '0.0.0.0'
  );
}

/**
 * Check rate limit for a request
 *
 * @param identifier - Unique identifier (usually hashed IP)
 * @param endpoint - API endpoint path
 * @param config - Optional custom config (uses defaults if not provided)
 * @returns Rate limit result
 */
export async function checkRateLimit(
  identifier: string,
  endpoint: string,
  config?: RateLimitConfig
): Promise<RateLimitResult> {
  const limits = config || RATE_LIMITS[endpoint] || RATE_LIMITS['default'];

  try {
    // Use type assertion for custom RPC function
    const { data, error } = await (supabase.rpc as Function)('check_rate_limit', {
      p_identifier: identifier,
      p_endpoint: endpoint,
      p_max_requests: limits.maxRequests,
      p_window_seconds: limits.windowSeconds,
    });

    if (error) {
      console.error('Rate limit check failed:', error);
      // Fail open - allow request if DB is unavailable
      return {
        allowed: true,
        remaining: limits.maxRequests,
        current: 0,
        limit: limits.maxRequests,
        resetAt: new Date(Date.now() + limits.windowSeconds * 1000),
      };
    }

    const result = data as { allowed: boolean; remaining: number; current: number; limit: number; reset_at: string };

    return {
      allowed: result.allowed,
      remaining: result.remaining,
      current: result.current,
      limit: result.limit,
      resetAt: new Date(result.reset_at),
    };
  } catch (err) {
    console.error('Rate limit error:', err);
    // Fail open
    return {
      allowed: true,
      remaining: limits.maxRequests,
      current: 0,
      limit: limits.maxRequests,
      resetAt: new Date(Date.now() + limits.windowSeconds * 1000),
    };
  }
}

/**
 * Create a rate-limited response (429 Too Many Requests)
 */
export function rateLimitResponse(result: RateLimitResult): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: 'Too many requests',
      retryAfter: Math.ceil((result.resetAt.getTime() - Date.now()) / 1000),
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'X-RateLimit-Limit': result.limit.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': result.resetAt.toISOString(),
        'Retry-After': Math.ceil((result.resetAt.getTime() - Date.now()) / 1000).toString(),
      },
    }
  );
}

/**
 * Add rate limit headers to a response
 */
export function addRateLimitHeaders(response: Response, result: RateLimitResult): Response {
  const headers = new Headers(response.headers);
  headers.set('X-RateLimit-Limit', result.limit.toString());
  headers.set('X-RateLimit-Remaining', result.remaining.toString());
  headers.set('X-RateLimit-Reset', result.resetAt.toISOString());

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
