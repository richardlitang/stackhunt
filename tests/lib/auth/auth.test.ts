/**
 * Auth Library Tests
 *
 * Tests for authentication utilities including:
 * - Password validation
 * - Session token generation/hashing
 * - Environment variable handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase before importing auth
vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

// Set up default test environment
beforeEach(() => {
  vi.resetModules();
  vi.stubEnv('ADMIN_PASSWORD', 'test-password-123');
  vi.stubEnv('SESSION_SECRET', 'test-secret-456');
  vi.stubEnv('NODE_ENV', 'development');
});

describe('Auth - Password Validation', () => {
  it('should validate correct password', async () => {
    const { validatePassword } = await import('@/lib/auth');
    expect(validatePassword('test-password-123')).toBe(true);
  });

  it('should reject incorrect password', async () => {
    const { validatePassword } = await import('@/lib/auth');
    expect(validatePassword('wrong-password')).toBe(false);
    expect(validatePassword('')).toBe(false);
  });

  it('should use constant-time comparison (timing safe)', async () => {
    const { validatePassword } = await import('@/lib/auth');

    // Multiple calls should take similar time regardless of where mismatch occurs
    // This is a basic sanity check - real timing attacks need more sophisticated testing
    const start1 = performance.now();
    validatePassword('xest-password-123'); // Different at start
    const time1 = performance.now() - start1;

    const start2 = performance.now();
    validatePassword('test-password-12x'); // Different at end
    const time2 = performance.now() - start2;

    // Times should be within reasonable variance (not a perfect test but basic sanity)
    expect(Math.abs(time1 - time2)).toBeLessThan(10); // Within 10ms
  });
});

describe('Auth - Session Token', () => {
  it('should generate unique tokens', async () => {
    const { generateSessionToken } = await import('@/lib/auth');

    const token1 = generateSessionToken();
    const token2 = generateSessionToken();

    expect(token1).not.toBe(token2);
    expect(token1.length).toBeGreaterThan(100);
  });

  it('should generate tokens in correct format', async () => {
    const { generateSessionToken } = await import('@/lib/auth');

    const token = generateSessionToken();
    const parts = token.split(':');

    expect(parts).toHaveLength(3); // random:timestamp:signature
    expect(parts[0]).toHaveLength(64); // 32 bytes hex
    expect(parseInt(parts[1])).toBeGreaterThan(0); // Valid timestamp
    expect(parts[2]).toHaveLength(64); // SHA256 hex
  });

  it('should hash tokens deterministically', async () => {
    const { hashSessionToken } = await import('@/lib/auth');

    const token = 'test-token-123';
    const hash1 = hashSessionToken(token);
    const hash2 = hashSessionToken(token);

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64); // SHA256 hex
  });

  it('should produce different hashes for different tokens', async () => {
    const { hashSessionToken } = await import('@/lib/auth');

    const hash1 = hashSessionToken('token-a');
    const hash2 = hashSessionToken('token-b');

    expect(hash1).not.toBe(hash2);
  });
});

describe('Auth - Cookie Constants', () => {
  it('should export correct cookie configuration', async () => {
    const { COOKIE_NAME, COOKIE_MAX_AGE } = await import('@/lib/auth');

    expect(COOKIE_NAME).toBe('stackhunt_admin_session');
    expect(COOKIE_MAX_AGE).toBe(60 * 60 * 24 * 7); // 7 days in seconds
  });
});

describe('Auth - Cron Secret Validation', () => {
  it('trims configured cron secrets before comparing bearer tokens', async () => {
    const { verifyCronSecret } = await import('@/lib/auth');
    const request = new Request('https://stackhunt.io/api/cron/hunt', {
      headers: { Authorization: 'Bearer cron-secret' },
    });

    expect(
      verifyCronSecret(request, {
        secret: ' cron-secret\n',
        isDev: false,
        isProd: true,
      })
    ).toEqual({ valid: true });
  });

  it('treats whitespace-only production cron secrets as misconfiguration', async () => {
    const { verifyCronSecret } = await import('@/lib/auth');
    const request = new Request('https://stackhunt.io/api/cron/hunt', {
      headers: { Authorization: 'Bearer cron-secret' },
    });

    expect(
      verifyCronSecret(request, {
        secret: ' \n\t',
        isDev: false,
        isProd: true,
      })
    ).toEqual({ valid: false, error: 'Server misconfiguration' });
  });
});

describe('Auth - Legacy Token Support', () => {
  it('should detect legacy tokens', async () => {
    const { isLegacyToken } = await import('@/lib/auth');

    // Legacy format: base64(password:timestamp)
    const legacyToken = btoa('password:1234567890');
    const newToken = 'randomhex:1234567890:signature';

    expect(isLegacyToken(legacyToken)).toBe(true);
    expect(isLegacyToken(newToken)).toBe(false);
  });

  it('should validate legacy tokens with correct password', async () => {
    const { validateLegacyToken } = await import('@/lib/auth');

    const timestamp = Date.now();
    // Use the password from beforeEach: 'test-password-123'
    const legacyToken = btoa(`test-password-123:${timestamp}`);

    expect(validateLegacyToken(legacyToken)).toBe(true);
  });

  it('should reject expired legacy tokens', async () => {
    const { validateLegacyToken } = await import('@/lib/auth');

    const oldTimestamp = Date.now() - 8 * 24 * 60 * 60 * 1000; // 8 days ago
    const expiredToken = btoa(`test-password-123:${oldTimestamp}`);

    expect(validateLegacyToken(expiredToken)).toBe(false);
  });

  it('should reject legacy tokens with wrong password', async () => {
    const { validateLegacyToken } = await import('@/lib/auth');

    const timestamp = Date.now();
    const badToken = btoa(`wrong-password:${timestamp}`);

    expect(validateLegacyToken(badToken)).toBe(false);
  });
});
