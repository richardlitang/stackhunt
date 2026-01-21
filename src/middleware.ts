/**
 * Astro Middleware - Admin Route Protection
 *
 * Protects /admin/* and /api/admin/* routes with secure session-based auth.
 * Uses database-backed sessions with HMAC tokens.
 */

import { defineMiddleware } from 'astro:middleware';
import {
  COOKIE_NAME,
  validateSession,
  isLegacyToken,
  validateLegacyToken,
} from '@/lib/auth';

// Routes that require admin auth
const PROTECTED_PREFIXES = ['/admin', '/api/admin'];

// Login page is public
const LOGIN_PAGE = '/admin/login';

export const onRequest = defineMiddleware(async ({ request, cookies, redirect, url }, next) => {
  const pathname = url.pathname;

  // Check if route requires protection
  const isProtectedRoute = PROTECTED_PREFIXES.some(prefix => pathname.startsWith(prefix));

  // Allow login page and login API
  if (pathname === LOGIN_PAGE || pathname === '/api/admin/login') {
    return next();
  }

  // If not a protected route, continue
  if (!isProtectedRoute) {
    return next();
  }

  // Check for valid session cookie
  const sessionToken = cookies.get(COOKIE_NAME)?.value;

  if (!sessionToken) {
    return handleUnauthorized(pathname, redirect);
  }

  // Check for legacy token format (backwards compatibility)
  if (isLegacyToken(sessionToken)) {
    if (validateLegacyToken(sessionToken)) {
      // Legacy token is valid - allow but user should re-login soon
      return next();
    }
    return handleUnauthorized(pathname, redirect);
  }

  // Validate new-style session against database
  const session = await validateSession(sessionToken);

  if (!session.valid) {
    // Clear invalid cookie
    cookies.delete(COOKIE_NAME, { path: '/' });
    return handleUnauthorized(pathname, redirect);
  }

  // Valid session, continue
  return next();
});

/**
 * Handle unauthorized access
 */
function handleUnauthorized(pathname: string, redirect: (path: string) => Response): Response {
  // For API routes, return 401
  if (pathname.startsWith('/api/')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // For page routes, redirect to login
  return redirect(`${LOGIN_PAGE}?redirect=${encodeURIComponent(pathname)}`);
}

// Re-export auth utilities for use by login API
export { COOKIE_NAME } from '@/lib/auth';
