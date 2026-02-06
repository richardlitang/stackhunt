/**
 * Astro Middleware - Admin Route Protection & Security Headers
 *
 * Protects /admin/* and /api/admin/* routes with secure session-based auth.
 * Uses database-backed sessions with HMAC tokens.
 * Adds CSRF protection and security headers.
 */

import { defineMiddleware } from 'astro:middleware';
import { COOKIE_NAME, validateSession, isLegacyToken, validateLegacyToken } from '@/lib/auth';
import {
  generateCsrfToken,
  validateCsrfToken,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
} from '@/lib/csrf';

// Routes that require admin auth
const PROTECTED_PREFIXES = ['/admin', '/api/admin'];

// Login page is public
const LOGIN_PAGE = '/admin/login';

// Aggressive bot blocklist - these ignore robots.txt
const BLOCKED_BOTS = [
  'bytespider',
  'meta-externalagent',
  'facebookbot',
  'gptbot',
  'chatgpt-user',
  'ccbot',
  'anthropic-ai',
  'claudebot',
  'claude-web',
  'amazonbot',
  'omgilibot',
];

// Security headers for all responses
const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
};

// CSP for admin pages (stricter than public pages)
const ADMIN_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: https: blob:",
  "connect-src 'self' https://*.supabase.co",
  'frame-src https://challenges.cloudflare.com',
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

// CSP for public pages (allows more for widgets, etc.)
const PUBLIC_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://www.youtube.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: https: blob:",
  "connect-src 'self' https://*.supabase.co",
  'frame-src https://challenges.cloudflare.com https://www.youtube.com https://www.youtube-nocookie.com',
  "base-uri 'self'",
].join('; ');

// Methods that modify state (require CSRF)
const CSRF_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

// API routes exempt from CSRF (use their own auth like webhook secrets)
const CSRF_EXEMPT_ROUTES = [
  '/api/admin/login',
  '/api/cron/',
  '/api/admin/hunt-queue/trigger', // Uses webhook secret
];

export const onRequest = defineMiddleware(
  async ({ request, cookies, redirect, url, locals }, next) => {
    const pathname = url.pathname;
    const method = request.method;

    // Bot blocking - return 403 immediately to save CPU cycles
    const userAgent = (request.headers.get('user-agent') || '').toLowerCase();
    if (BLOCKED_BOTS.some((bot) => userAgent.includes(bot))) {
      return new Response('Forbidden', { status: 403 });
    }

    // Check if route requires protection
    const isProtectedRoute = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
    const isAdminApi = pathname.startsWith('/api/admin');
    const isAdminPage = pathname.startsWith('/admin') && !isAdminApi;

    // Allow login page and login API
    if (pathname === LOGIN_PAGE || pathname === '/api/admin/login') {
      const response = await next();
      return addSecurityHeaders(response, pathname);
    }

    // If not a protected route, continue with security headers
    if (!isProtectedRoute) {
      const response = await next();
      return addSecurityHeaders(response, pathname);
    }

    // Check for valid session cookie
    const sessionToken = cookies.get(COOKIE_NAME)?.value;
    let sessionId: string | undefined;

    if (!sessionToken) {
      return handleUnauthorized(pathname, redirect);
    }

    // Check for legacy token format (backwards compatibility)
    if (isLegacyToken(sessionToken)) {
      if (validateLegacyToken(sessionToken)) {
        // Legacy token is valid
        sessionId = 'legacy';
      } else {
        return handleUnauthorized(pathname, redirect);
      }
    } else {
      // Validate new-style session against database
      const session = await validateSession(sessionToken);

      if (!session.valid) {
        // Clear invalid cookie
        cookies.delete(COOKIE_NAME, { path: '/' });
        return handleUnauthorized(pathname, redirect);
      }
      sessionId = session.sessionId;
    }

    // CSRF validation for state-changing admin API requests
    if (isAdminApi && CSRF_METHODS.includes(method)) {
      const isExempt = CSRF_EXEMPT_ROUTES.some((route) => pathname.startsWith(route));

      if (!isExempt) {
        const csrfToken = request.headers.get(CSRF_HEADER_NAME);
        const csrfCookie = cookies.get(CSRF_COOKIE_NAME)?.value;

        // Must have both header token and cookie, and they must match context
        if (!csrfToken || !validateCsrfToken(csrfToken, sessionId)) {
          return new Response(JSON.stringify({ error: 'Invalid CSRF token' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }
    }

    // Generate CSRF token for admin pages (will be injected via cookie for JS to read)
    if (isAdminPage) {
      const csrfToken = generateCsrfToken(sessionId);
      cookies.set(CSRF_COOKIE_NAME, csrfToken, {
        path: '/admin',
        httpOnly: false, // JS needs to read this
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60, // 1 hour
      });
      // Also make it available to Astro pages via locals
      (locals as any).csrfToken = csrfToken;
    }

    // Valid session, continue
    const response = await next();
    return addSecurityHeaders(response, pathname);
  }
);

/**
 * Add security headers to response
 */
function addSecurityHeaders(response: Response, pathname: string): Response {
  const headers = new Headers(response.headers);

  // Add security headers
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(key, value);
  }

  // Add appropriate CSP
  const isAdmin = pathname.startsWith('/admin');
  headers.set('Content-Security-Policy', isAdmin ? ADMIN_CSP : PUBLIC_CSP);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

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
