/**
 * Admin Authentication Utilities
 *
 * Provides secure session management with:
 * - HMAC-based token generation
 * - Database-backed session storage
 * - Constant-time comparison for security
 */

import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { supabase } from './supabase';

// Environment detection
function isProduction(): boolean {
  const mode = import.meta.env?.MODE || process.env.NODE_ENV;
  return mode === 'production';
}

// Get required environment variable - fails in production if missing
function getRequiredEnvVar(key: string): string {
  const value = import.meta.env?.[key] || process.env[key];

  if (!value) {
    if (isProduction()) {
      throw new Error(`CRITICAL: ${key} environment variable is required in production`);
    }
    // Development fallback with warning
    console.warn(`WARNING: ${key} not set, using insecure development default`);
    const devDefaults: Record<string, string> = {
      ADMIN_PASSWORD: 'dev-password-only',
      SESSION_SECRET: 'dev-session-secret-only',
    };
    return devDefaults[key] || '';
  }

  return value;
}

// Constants - will throw in production if not configured
const ADMIN_PASSWORD = getRequiredEnvVar('ADMIN_PASSWORD');
const SESSION_SECRET = getRequiredEnvVar('SESSION_SECRET');
export const COOKIE_NAME = 'stackhunt_admin_session';
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

/**
 * Constant-time string comparison to prevent timing attacks
 */
function safeCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) {
      // Still do comparison to prevent timing leak
      timingSafeEqual(bufA, bufA);
      return false;
    }
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

/**
 * Validate admin password
 */
export function validatePassword(password: string): boolean {
  return safeCompare(password, ADMIN_PASSWORD);
}

/**
 * Generate a secure session token
 * Format: random_bytes:hmac(random_bytes + timestamp)
 */
export function generateSessionToken(): string {
  const randomPart = randomBytes(32).toString('hex');
  const timestamp = Date.now().toString();
  const payload = `${randomPart}:${timestamp}`;

  const hmac = createHmac('sha256', SESSION_SECRET);
  hmac.update(payload);
  const signature = hmac.digest('hex');

  return `${payload}:${signature}`;
}

/**
 * Hash a session token for database storage
 */
export function hashSessionToken(token: string): string {
  const hmac = createHmac('sha256', SESSION_SECRET);
  hmac.update(token);
  return hmac.digest('hex');
}

/**
 * Create a new admin session in the database
 */
export async function createSession(
  token: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{ success: boolean; sessionId?: string; error?: string }> {
  const tokenHash = hashSessionToken(token);

  try {
    // Use type assertion for custom RPC function
    const { data, error } = await (supabase.rpc as Function)('create_admin_session', {
      p_token_hash: tokenHash,
      p_ip_address: ipAddress || null,
      p_user_agent: userAgent || null,
      p_expires_in_days: 7,
    });

    if (error) {
      console.error('Failed to create session:', error);
      return { success: false, error: 'Failed to create session' };
    }

    return { success: true, sessionId: data as string };
  } catch (err) {
    console.error('Session creation error:', err);
    return { success: false, error: 'Internal error' };
  }
}

/**
 * Validate a session token against the database
 */
export async function validateSession(token: string): Promise<{
  valid: boolean;
  sessionId?: string;
  error?: string;
}> {
  if (!token) {
    return { valid: false };
  }

  const tokenHash = hashSessionToken(token);

  try {
    // Use type assertion for custom RPC function
    const { data, error } = await (supabase.rpc as Function)('validate_admin_session', {
      p_token_hash: tokenHash,
    });

    if (error) {
      console.error('Session validation error:', error);
      return { valid: false, error: 'Validation failed' };
    }

    const result = data as { valid: boolean; session_id?: string } | null;

    if (!result?.valid) {
      return { valid: false };
    }

    return {
      valid: true,
      sessionId: result.session_id,
    };
  } catch (err) {
    console.error('Session validation error:', err);
    // Fail closed - if we can't validate, deny access
    return { valid: false, error: 'Internal error' };
  }
}

/**
 * Revoke a session (logout)
 */
export async function revokeSession(token: string): Promise<boolean> {
  const tokenHash = hashSessionToken(token);

  try {
    // Use type assertion for custom RPC function
    const { error } = await (supabase.rpc as Function)('revoke_admin_session', {
      p_token_hash: tokenHash,
    });

    return !error;
  } catch {
    return false;
  }
}

/**
 * Legacy token validation (for backwards compatibility during transition)
 * Will be removed after all sessions migrate to new format
 */
export function isLegacyToken(token: string): boolean {
  try {
    const decoded = atob(token);
    return decoded.includes(':') && !decoded.includes(':', decoded.indexOf(':') + 1);
  } catch {
    return false;
  }
}

export function validateLegacyToken(token: string): boolean {
  try {
    const decoded = atob(token);
    const [password, timestamp] = decoded.split(':');

    if (!safeCompare(password, ADMIN_PASSWORD)) {
      return false;
    }

    const tokenTime = parseInt(timestamp, 10);
    const now = Date.now();
    const maxAge = COOKIE_MAX_AGE * 1000;

    return now - tokenTime <= maxAge;
  } catch {
    return false;
  }
}
