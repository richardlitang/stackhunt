/**
 * CSRF Protection Utility
 *
 * Provides CSRF token generation and validation using HMAC.
 * Tokens are tied to the user's session to prevent cross-user attacks.
 */

import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

// Token validity period (1 hour)
const TOKEN_VALIDITY_MS = 60 * 60 * 1000;

// Get CSRF secret from environment (or generate one for dev)
function getCsrfSecret(): string {
  const secret = process.env.CSRF_SECRET || process.env.SESSION_SECRET;
  if (!secret) {
    // Development fallback
    console.warn('WARNING: No CSRF_SECRET set, using development default');
    return 'dev-csrf-secret-only';
  }
  return secret;
}

/**
 * Generate a CSRF token tied to a session
 * Format: timestamp:random:hmac(timestamp:random:sessionId)
 */
export function generateCsrfToken(sessionId?: string): string {
  const timestamp = Date.now().toString(36);
  const random = randomBytes(16).toString('hex');
  const payload = `${timestamp}:${random}:${sessionId || 'anon'}`;

  const hmac = createHmac('sha256', getCsrfSecret());
  hmac.update(payload);
  const signature = hmac.digest('hex').slice(0, 32);

  return `${timestamp}.${random}.${signature}`;
}

/**
 * Validate a CSRF token
 * Returns true if token is valid and not expired
 */
export function validateCsrfToken(token: string, sessionId?: string): boolean {
  if (!token || typeof token !== 'string') {
    return false;
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    return false;
  }

  const [timestamp, random, providedSignature] = parts;

  // Check expiration
  const tokenTime = parseInt(timestamp, 36);
  if (isNaN(tokenTime) || Date.now() - tokenTime > TOKEN_VALIDITY_MS) {
    return false;
  }

  // Regenerate signature to verify
  const payload = `${timestamp}:${random}:${sessionId || 'anon'}`;
  const hmac = createHmac('sha256', getCsrfSecret());
  hmac.update(payload);
  const expectedSignature = hmac.digest('hex').slice(0, 32);

  // Timing-safe comparison
  try {
    const providedBuffer = Buffer.from(providedSignature);
    const expectedBuffer = Buffer.from(expectedSignature);
    if (providedBuffer.length !== expectedBuffer.length) {
      return false;
    }
    return timingSafeEqual(providedBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

/**
 * Cookie name for CSRF token
 */
export const CSRF_COOKIE_NAME = 'stackhunt_csrf';

/**
 * Header name for CSRF token in requests
 */
export const CSRF_HEADER_NAME = 'x-csrf-token';
