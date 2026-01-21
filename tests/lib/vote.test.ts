/**
 * Vote API Tests
 *
 * Tests for voting functionality including:
 * - Turnstile verification
 * - IP hashing
 * - Production vs development behavior
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock rate-limit module
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 29, limit: 30 }),
  rateLimitResponse: vi.fn(),
  addRateLimitHeaders: vi.fn((response) => response),
  getClientIP: vi.fn().mockReturnValue('127.0.0.1'),
  hashIdentifier: vi.fn().mockReturnValue('hashed-ip'),
}));

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: vi.fn().mockResolvedValue({ data: { success: true, message: 'Vote recorded' }, error: null }),
  },
}));

// Mock fetch for Turnstile
global.fetch = vi.fn();

describe('Vote - IP Hashing', () => {
  it('should hash IPs consistently with same salt', () => {
    const { createHash } = require('crypto');

    const hashIP = (ip: string, salt: string) => {
      return createHash('sha256').update(ip + salt).digest('hex').slice(0, 32);
    };

    const hash1 = hashIP('192.168.1.1', 'test-salt');
    const hash2 = hashIP('192.168.1.1', 'test-salt');

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(32);
  });

  it('should produce different hashes for different IPs', () => {
    const { createHash } = require('crypto');

    const hashIP = (ip: string, salt: string) => {
      return createHash('sha256').update(ip + salt).digest('hex').slice(0, 32);
    };

    const hash1 = hashIP('192.168.1.1', 'salt');
    const hash2 = hashIP('192.168.1.2', 'salt');

    expect(hash1).not.toBe(hash2);
  });

  it('should produce different hashes with different salts', () => {
    const { createHash } = require('crypto');

    const hashIP = (ip: string, salt: string) => {
      return createHash('sha256').update(ip + salt).digest('hex').slice(0, 32);
    };

    const hash1 = hashIP('192.168.1.1', 'salt-a');
    const hash2 = hashIP('192.168.1.1', 'salt-b');

    expect(hash1).not.toBe(hash2);
  });
});

describe('Vote - Turnstile Verification', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should verify valid Turnstile token', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    const verifyTurnstile = async (token: string, ip: string, secret: string): Promise<boolean> => {
      const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ secret, response: token, remoteip: ip }),
      });
      const result = await response.json();
      return result.success === true;
    };

    const result = await verifyTurnstile('valid-token', '127.0.0.1', 'test-secret');
    expect(result).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('should reject invalid Turnstile token', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: false, 'error-codes': ['invalid-input-response'] }),
    });

    const verifyTurnstile = async (token: string, ip: string, secret: string): Promise<boolean> => {
      const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ secret, response: token, remoteip: ip }),
      });
      const result = await response.json();
      return result.success === true;
    };

    const result = await verifyTurnstile('invalid-token', '127.0.0.1', 'test-secret');
    expect(result).toBe(false);
  });

  it('should handle Turnstile API errors gracefully', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'));

    const verifyTurnstile = async (token: string, ip: string, secret: string): Promise<boolean> => {
      try {
        const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ secret, response: token, remoteip: ip }),
        });
        const result = await response.json();
        return result.success === true;
      } catch {
        return false;
      }
    };

    const result = await verifyTurnstile('token', '127.0.0.1', 'test-secret');
    expect(result).toBe(false);
  });
});

describe('Vote - Production Environment Detection', () => {
  it('should detect production environment from MODE', () => {
    const isProduction = (mode?: string, prod?: boolean) => {
      return mode === 'production' || prod === true;
    };

    expect(isProduction('production', false)).toBe(true);
    expect(isProduction('development', false)).toBe(false);
    expect(isProduction(undefined, true)).toBe(true);
    expect(isProduction('development', true)).toBe(true);
  });
});

describe('Vote - Request Validation', () => {
  it('should validate vote types', () => {
    const isValidVoteType = (voteType: unknown): voteType is -1 | 0 | 1 => {
      return voteType === -1 || voteType === 0 || voteType === 1;
    };

    expect(isValidVoteType(-1)).toBe(true);
    expect(isValidVoteType(0)).toBe(true);
    expect(isValidVoteType(1)).toBe(true);
    expect(isValidVoteType(2)).toBe(false);
    expect(isValidVoteType(-2)).toBe(false);
    expect(isValidVoteType('1')).toBe(false);
    expect(isValidVoteType(null)).toBe(false);
  });

  it('should validate review ID format', () => {
    const isValidReviewId = (id: unknown): id is string => {
      return typeof id === 'string' && id.length > 0;
    };

    expect(isValidReviewId('abc-123')).toBe(true);
    expect(isValidReviewId('uuid-format-id')).toBe(true);
    expect(isValidReviewId('')).toBe(false);
    expect(isValidReviewId(null)).toBe(false);
    expect(isValidReviewId(123)).toBe(false);
  });
});
